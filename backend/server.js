require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const db = require('./database');
const { GoogleGenAI } = require('@google/genai');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const app = express();
app.use(cors());
app.use(express.json());

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'civic_reports',
    allowed_formats: ['jpg', 'png', 'jpeg'],
  },
});
const upload = multer({ storage: storage });

const SECRET_KEY = 'super_secret_key_for_this_app_only'; // In production, use env variable

// In-memory OTP store for prototyping
const otpStore = new Map();

// Generate a random 4-digit OTP
const generateOTP = () => Math.floor(1000 + Math.random() * 9000).toString();

// Helper function to fetch URL to base64
async function urlToBase64(url) {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  return Buffer.from(buffer).toString('base64');
}

// Send OTP Route
app.post('/send-otp', (req, res) => {
  const { identifier } = req.body;
  if (!identifier) return res.status(400).json({ error: 'Email or phone required' });

  const otp = generateOTP();
  otpStore.set(identifier, { otp, expiresAt: Date.now() + 10 * 60 * 1000 });

  console.log(`\n========================================`);
  console.log(`🔥 MOCK OTP SENT 🔥`);
  console.log(`To: ${identifier}`);
  console.log(`Code: ${otp}`);
  console.log(`========================================\n`);

  res.json({ message: 'Verification code sent successfully' });
});

// Verify OTP Route
app.post('/verify-otp', (req, res) => {
  const { identifier, otp } = req.body;
  if (!identifier || !otp) return res.status(400).json({ error: 'Identifier and OTP required' });

  const record = otpStore.get(identifier);
  if (!record) return res.status(400).json({ error: 'No OTP requested for this identifier' });
  
  if (Date.now() > record.expiresAt) {
    otpStore.delete(identifier);
    return res.status(400).json({ error: 'OTP has expired' });
  }

  if (record.otp === otp) {
    otpStore.delete(identifier); 
    res.json({ message: 'OTP verified successfully' });
  } else {
    res.status(400).json({ error: 'Invalid OTP' });
  }
});

// Register Route
app.post('/register', async (req, res) => {
  const identifier = req.body.identifier || req.body.phone;
  const password = req.body.password;
  const name = req.body.name;
  if (!identifier || !password) return res.status(400).json({ error: 'Identifier and password required' });

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await db.query(
      `INSERT INTO users (identifier, password, name) VALUES ($1, $2, $3) RETURNING id`, 
      [identifier, hashedPassword, name || '']
    );
    res.status(201).json({ message: 'User created', userId: result.rows[0].id });
  } catch (error) {
    if (error.message.includes('unique constraint')) {
      return res.status(400).json({ error: 'Account with this email/phone already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Login Route
app.post('/login', async (req, res) => {
  const identifier = req.body.identifier || req.body.phone;
  const password = req.body.password;
  console.log(`[LOGIN ATTEMPT] identifier: "${identifier}"`);

  if (!identifier || !password) {
    return res.status(400).json({ error: 'Identifier and password required' });
  }

  try {
    const result = await db.query(`SELECT * FROM users WHERE identifier = $1`, [identifier]);
    const user = result.rows[0];
    if (!user) {
      return res.status(400).json({ error: 'Invalid email/phone or password' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid email/phone or password' });
    }

    const token = jwt.sign({ userId: user.id }, SECRET_KEY, { expiresIn: '365d' });
    res.json({ token, userId: user.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Middleware to verify JWT
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token == null) return res.sendStatus(401);

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// --- AGENT ENDPOINTS ---

// Agent Login
app.post('/agent-login', async (req, res) => {
  const phone = req.body.phone;
  if (!phone) return res.status(400).json({ error: 'Phone number required' });

  try {
    const result = await db.query(`SELECT * FROM staff WHERE phone = $1`, [phone]);
    const staff = result.rows[0];
    if (!staff) return res.status(400).json({ error: 'Agent not found' });

    const token = jwt.sign({ staffId: staff.id, department: staff.department }, SECRET_KEY, { expiresIn: '365d' });
    res.json({ token, staff });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Middleware for agent auth
function authenticateAgent(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token == null) return res.sendStatus(401);

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err || !user.staffId) return res.sendStatus(403);
    req.agent = user;
    next();
  });
}

// Get assigned reports for agent
app.get('/agent/reports', authenticateAgent, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT r.*, u.identifier as reporter_identifier, u.name as reporter_name
      FROM reports r 
      LEFT JOIN users u ON r.user_id = u.id 
      WHERE r.assigned_staff_id = $1
      ORDER BY r.created_at DESC
    `, [req.agent.staffId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Resolve a report with a photo
app.post('/agent/resolve', authenticateAgent, upload.single('image'), async (req, res) => {
  const reportId = req.body.reportId;
  if (!req.file || !reportId) return res.status(400).json({ error: 'Image and reportId required' });

  try {
    const imagePath = req.file.path; // Cloudinary URL
    const mimeType = req.file.mimetype;

    const result = await db.query('SELECT category, description, image_url FROM reports WHERE id = $1 AND assigned_staff_id = $2', [reportId, req.agent.staffId]);
    const row = result.rows[0];
    if (!row) return res.status(404).json({ error: 'Report not found or not assigned to you' });

    if (process.env.GEMINI_API_KEY) {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        let contents = [
          `You are a strict, highly critical AI verification system. You are auditing a civic worker who might be trying to cheat the system.
          Analyze these two images. 
          FIRST image: The 'Before' state (the reported civic issue). 
          SECOND image: The 'After' state (uploaded by the worker as proof of resolution).
          Issue category: '${row.category}'. Description: '${row.description}'. 

          Perform a step-by-step visual audit:
          1. Is the SECOND image a photo of a computer screen, monitor, TV, or laptop? (Look closely for screen bezels, moiré pixel patterns, or screen glare). If YES, the image is FAKE (environment_match: false).
          2. Compare the surroundings. Look at the landmarks, buildings, trees, walls, or road patterns in the FIRST image. Does the SECOND image contain these EXACT SAME landmarks and atmosphere? If the agent uploaded an unrelated image, environment_match is false.
          3. If they match, is the civic issue fixed in the second image?

          Respond ONLY with a JSON object in this exact format:
          {
            "environment_match": boolean,
            "issue_resolved": boolean,
            "reason": "Provide a strict, detailed explanation. If they uploaded a screen, say 'Image Rejected: You uploaded a photo of a computer screen. Please capture it live.' If the environment doesn't match, say 'Image Rejected: The surrounding landmarks and atmosphere do not match the original reported location. Please upload the correct image.'",
            "valid": boolean (true ONLY if both environment_match and issue_resolved are true)
          }`
        ];

        if (row.image_url) {
          const originalBase64 = await urlToBase64(row.image_url);
          contents.push({
            inlineData: {
              data: originalBase64,
              mimeType: "image/jpeg"
            }
          });
        } else {
           contents[0] = `You are a strict AI verification system. Analyze this image. 
           Does it show a resolved state of a civic issue related to: '${row.category}' (Description: '${row.description}')? 
           CRITICAL RULE: If the image is a random object (like a keyboard, monitor, indoor room) and NOT a civic environment, you MUST return valid: false.
           Return a JSON object with 'valid' (boolean) and 'reason' (string explaining why). Reply ONLY with valid JSON.`;
        }

        const newBase64 = await urlToBase64(imagePath);
        contents.push({
          inlineData: {
            data: newBase64,
            mimeType: mimeType
          }
        });

        const response = await ai.models.generateContent({
          model: 'gemini-1.5-flash',
          contents: contents
        });

        const text = response.text;
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const verification = JSON.parse(jsonStr);

        if (!verification.valid) {
          return res.status(400).json({ error: `AI Verification Failed: ${verification.reason}` });
        }
      } catch (aiErr) {
        console.error("AI Verification failed", aiErr);
        return res.status(400).json({ error: `AI System Error: Could not verify image.` });
      }
    }

    const imageUrl = req.file.path;
    await db.query(
      `UPDATE reports SET status = 'Pending Verification', resolution_image_url = $1, completed_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [imageUrl, reportId]
    );
    res.json({ message: 'Report resolved, pending user verification', imageUrl: imageUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to process resolution' });
  }
});

// --- END AGENT ENDPOINTS ---

// Admin: Get all users in the system
app.get('/admin/users', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT u.id, u.identifier, u.name, u.created_at, COUNT(r.id) as complaints_count 
      FROM users u 
      LEFT JOIN reports r ON u.id = r.user_id 
      GROUP BY u.id 
      ORDER BY u.created_at DESC
    `);
    res.json({ users: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Get all staff members
app.get('/admin/staff', async (req, res) => {
  try {
    const result = await db.query(`SELECT * FROM staff`);
    res.json({ staff: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Assign staff to a report
app.post('/admin/reports/:id/assign', async (req, res) => {
  const { id } = req.params;
  const { staff_id } = req.body;
  if (!staff_id) return res.status(400).json({ error: 'staff_id required' });

  try {
    const result = await db.query(`UPDATE reports SET assigned_staff_id = $1, status = 'In Progress', progress_at = CURRENT_TIMESTAMP WHERE id = $2`, [staff_id, id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Report not found' });
    res.json({ message: 'Staff assigned successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Get all reports in the system
app.get('/admin/reports', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT r.*, u.name as user_name, u.identifier as user_identifier, s.name as staff_name 
      FROM reports r 
      LEFT JOIN users u ON r.user_id = u.id 
      LEFT JOIN staff s ON r.assigned_staff_id = s.id
      ORDER BY r.created_at DESC
    `);
    res.json({ reports: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all reports (filtered by user)
app.get('/reports', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`SELECT * FROM reports WHERE user_id = $1 ORDER BY created_at DESC`, [req.user.userId]);
    res.json({ reports: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get user profile
app.get('/user', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`SELECT id, identifier, name FROM users WHERE id = $1`, [req.user.userId]);
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update user profile
app.put('/user', authenticateToken, async (req, res) => {
  const { name } = req.body;
  try {
    await db.query(`UPDATE users SET name = $1 WHERE id = $2`, [name, req.user.userId]);
    res.json({ message: 'Profile updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Analyze image using Gemini AI
app.post('/analyze-image', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Image is required' });
    
    if (!process.env.GEMINI_API_KEY) {
      return res.json({
        category: 'Road',
        description: 'To the Municipal Authority,\n\nI am writing to formally request immediate attention to a severe road damage issue...',
        department: 'Municipal Corporation (Road Maintenance)'
      });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const imagePath = req.file.path; // Cloudinary URL
    const mimeType = req.file.mimetype;
    
    const base64Data = await urlToBase64(imagePath);

    const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: [
            `You are a strict civic issue classifier. Analyze this image to determine if it shows a REAL WORLD civic issue.
             
             Perform a step-by-step visual audit:
             1. Is this a photo of a computer screen, monitor, TV, or laptop? (Look for screen bezels, moiré pixel patterns, or screen glare). If YES, it is FAKE.
             2. Is this inside a private university, college campus, or private institute? (Look for campus buildings, institute signboards, or typical college infrastructure). If YES, it is PRIVATE PROPERTY.
             3. Does it show a valid issue? (road potholes, garbage, water leakage, sanitary issues, or electricity issues).

             If Step 1 is YES:
             Return {"category": "Invalid", "description": "Submission Rejected: You took a photo of a screen or monitor. You must capture the problem live in the real world.", "department": "None"}
             
             If Step 2 is YES:
             Return {"category": "Invalid", "description": "Submission Rejected: This location appears to be inside an educational institute or private campus. This is not government property. Please complain to your college administration.", "department": "None"}
             
             If valid:
             Return {"category": "[Category]", "description": "[A formal request letter to the municipal authority]", "department": "[Assigned Department]"}
             
             Return ONLY valid JSON.`,
            {
                inlineData: {
                    data: base64Data,
                    mimeType: mimeType
                }
            }
        ]
    });
    
    const text = response.text;
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const data = JSON.parse(jsonStr);
    
    res.json(data);
  } catch (err) {
    console.error("Gemini AI Error:", err);
    res.json({
      category: 'Unidentified Issue',
      description: 'Could not automatically describe this issue. Please review manually.',
      department: 'General Administration'
    });
  }
});

// Submit a new report
app.post('/reports', authenticateToken, upload.single('image'), async (req, res) => {
  const { category, description, department, lat, lng, address } = req.body;
  const imageUrl = req.file ? req.file.path : null; // Cloudinary URL
  const userId = req.user.userId;

  try {
    const result = await db.query(
      `INSERT INTO reports (user_id, category, description, department, lat, lng, address, image_url, assigned_staff_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NULL) RETURNING id`,
      [userId, category, description, department, lat, lng, address, imageUrl]
    );
    res.status(201).json({ message: 'Report submitted', reportId: result.rows[0].id, assignedStaffId: null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark a report as Completed by the user
app.put('/reports/:id/complete', authenticateToken, async (req, res) => {
  const reportId = req.params.id;
  const userId = req.user.userId;
  try {
    const result = await db.query(`UPDATE reports SET status = 'Solved', solved_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2`, [reportId, userId]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Report not found or not authorized' });
    res.json({ message: 'Report marked as completed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reopen a report by the user
app.put('/reports/:id/reopen', authenticateToken, async (req, res) => {
  const reportId = req.params.id;
  const userId = req.user.userId;
  try {
    const result = await db.query(`UPDATE reports SET status = 'In Progress', resolution_image_url = NULL WHERE id = $1 AND user_id = $2`, [reportId, userId]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Report not found or not authorized' });
    res.json({ message: 'Report reopened successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Manually assign staff to a report
app.put('/admin/reports/:id/assign', async (req, res) => {
  const { staff_id } = req.body;
  try {
    await db.query(`UPDATE reports SET assigned_staff_id = $1, status = 'In Progress', progress_at = CURRENT_TIMESTAMP WHERE id = $2`, [staff_id, req.params.id]);
    res.json({ message: 'Staff assigned successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Change Password Route
app.put('/change-password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Both passwords required' });

  try {
    const result = await db.query('SELECT password FROM users WHERE id = $1', [req.user.userId]);
    const row = result.rows[0];
    if (!row) return res.status(404).json({ error: 'User not found' });

    const isValid = await bcrypt.compare(currentPassword, row.password);
    if (!isValid) return res.status(400).json({ error: 'Incorrect current password' });

    const hashedNew = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password = $1 WHERE id = $2', [hashedNew, req.user.userId]);
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Auto-assign staff to complaints older than 3 days
setInterval(async () => {
  try {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const result = await db.query(`SELECT id, department FROM reports WHERE assigned_staff_id IS NULL AND created_at < $1`, [threeDaysAgo]);
    const rows = result.rows;
    if (!rows || rows.length === 0) return;

    for (const report of rows) {
      const staffResult = await db.query(`SELECT id FROM staff WHERE department = $1`, [report.department]);
      const staffRows = staffResult.rows;
      if (!staffRows || staffRows.length === 0) continue;
      
      const randomStaff = staffRows[Math.floor(Math.random() * staffRows.length)];
      await db.query(`UPDATE reports SET assigned_staff_id = $1, status = 'In Progress', progress_at = CURRENT_TIMESTAMP WHERE id = $2`, [randomStaff.id, report.id]);
      console.log(`Auto-assigned staff ${randomStaff.id} to report ${report.id} after 3 days.`);
    }
  } catch (err) {
    console.error('Error auto-assigning staff:', err);
  }
}, 60000); // Check every minute

// Serve the Admin Dashboard
app.use(express.static(path.join(__dirname, '../admin-web/dist')));
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../admin-web/dist/index.html'));
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
