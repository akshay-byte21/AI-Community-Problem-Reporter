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
const compression = require('compression');
const NodeCache = require('node-cache');

const app = express();
app.use(compression()); // Compress all responses
app.use(cors());
app.use(express.json());

// Initialize cache with 5 minutes TTL
const cache = new NodeCache({ stdTTL: 300 });

// Clear cache helper
const clearCache = () => {
  cache.flushAll();
};

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

// Helper function to send Expo Push Notification
async function sendPushNotification(userId, title, body) {
  try {
    const result = await db.query('SELECT push_token FROM users WHERE id = $1', [userId]);
    if (result.rows.length === 0) return;
    const pushToken = result.rows[0].push_token;
    
    if (pushToken && pushToken.startsWith('ExponentPushToken')) {
      const message = {
        to: pushToken,
        sound: 'default',
        title: title,
        body: body,
      };

      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });
      console.log(`Sent push notification to user ${userId}`);
    }
  } catch (err) {
    console.error('Error sending push notification:', err);
  }
}

// Send OTP Route
app.post('/send-otp', (req, res) => {
  const { identifier } = req.body;
  if (!identifier) return res.status(400).json({ error: 'Email or phone required' });

  const otp = generateOTP();
  otpStore.set(identifier, { otp, expiresAt: Date.now() + 10 * 60 * 1000 });

  console.log(`\n========================================`);
  console.log(`≡뿯ƽ뿯½뿯½ MOCK OTP SENT ≡뿯ƽ뿯½뿯½`);
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
  const securityQuestion = req.body.securityQuestion;
  const securityAnswer = req.body.securityAnswer;
  if (!identifier || !password) return res.status(400).json({ error: 'Identifier and password required' });

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await db.query(
      `INSERT INTO users (identifier, password, name, security_question, security_answer) VALUES ($1, $2, $3, $4, $5) RETURNING id`, 
      [identifier, hashedPassword, name || '', securityQuestion || null, securityAnswer ? securityAnswer.toLowerCase().trim() : null]
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
      return res.status(400).json({ error: 'user is not registered' });
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

// Get Security Question Route
app.post('/get-security-question', async (req, res) => {
  const { identifier } = req.body;
  if (!identifier) return res.status(400).json({ error: 'Phone number required' });

  try {
    const result = await db.query(`SELECT security_question FROM users WHERE identifier = $1`, [identifier]);
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.security_question) return res.status(400).json({ error: 'No security question set for this account' });
    
    res.json({ question: user.security_question });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Verify Security Answer Route
app.post('/verify-security-answer', async (req, res) => {
  const { identifier, answer } = req.body;
  if (!identifier || !answer) return res.status(400).json({ error: 'Phone number and answer required' });

  try {
    const result = await db.query(`SELECT security_answer FROM users WHERE identifier = $1`, [identifier]);
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    if (!user.security_answer || user.security_answer !== answer.toLowerCase().trim()) {
      return res.status(400).json({ error: 'Incorrect security answer' });
    }

    res.json({ success: true, message: 'Answer verified' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reset Password Route (via Security Question)
app.post('/reset-password', async (req, res) => {
  const { identifier, newPassword } = req.body;
  if (!identifier || !newPassword) return res.status(400).json({ error: 'Phone number and new password required' });

  try {
    const hashedNew = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password = $1 WHERE identifier = $2', [hashedNew, identifier]);
    res.json({ message: 'Password reset successfully' });
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

// Update agent push token
app.put('/agent/push-token', authenticateAgent, async (req, res) => {
  const { pushToken } = req.body;
  try {
    await db.query(`UPDATE staff SET push_token = $1 WHERE id = $2`, [pushToken, req.agent.staffId]);
    res.json({ message: 'Push token updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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
                    1. Environment Comparison: Look VERY closely at the surrounding environment, landmarks, buildings, trees, walls, or road patterns in the FIRST image (the before image). Does the SECOND image contain these EXACT SAME landmarks? If the agent uploaded a random stock photo, a picture of a screen, or an unrelated location, environment_match is false.
                    2. Issue Resolution: If the environments match, look at the specific civic issue (e.g. the pothole). Has it been physically repaired/fixed in the SECOND image?

          CRITICAL RULE: If the environment does NOT match between the two images (e.g., they look like completely different streets, or the agent uploaded a random stock photo), you MUST return "valid": false. 
          You must ONLY return "valid": true if BOTH "environment_match" is true AND "issue_resolved" is true.

          Respond ONLY with a JSON object in this exact format:
          {
              "reason": "First, analyze the environment in both images. Explain exactly what landmarks match or don't match. Then, explain if the civic issue has been repaired.",
              "environment_match": boolean,
              "issue_resolved": boolean,
              "valid": boolean
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
          model: 'gemini-flash-latest',
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
    
    // Fetch user_id to send notification
    const userRes = await db.query('SELECT user_id FROM reports WHERE id = $1', [reportId]);
    if (userRes.rows.length > 0) {
      sendPushNotification(userRes.rows[0].user_id, 'Issue Repaired! 🛠️', 'Your reported issue has been fixed by the agent. Open the app to verify it and claim your +50 Civic Points!');
    }

    clearCache(); // Invalidate cache on update
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
      SELECT u.id, u.identifier, u.name, u.points, u.created_at, COUNT(r.id) as complaints_count 
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
    const result = await db.query(`UPDATE reports SET assigned_staff_id = $1, status = 'In Progress', progress_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING category, address`, [staff_id, id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Report not found' });
    
    // Notify the agent
    const staffRes = await db.query(`SELECT push_token FROM staff WHERE id = $1`, [staff_id]);
    if (staffRes.rows.length > 0 && staffRes.rows[0].push_token) {
      await sendPushNotification(staffRes.rows[0].push_token, 'New Assignment 📋', `You have been assigned to a ${result.rows[0].category} issue at ${result.rows[0].address}`);
    }
    
    clearCache(); // Invalidate cache on update
    res.json({ message: 'Staff assigned successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Get all reports in the system
app.get('/admin/reports', async (req, res) => {
  try {
    const cachedData = cache.get('admin_reports');
    if (cachedData) return res.json({ reports: cachedData });

    const result = await db.query(`
      SELECT r.*, u.name as user_name, u.identifier as user_identifier, s.name as staff_name 
      FROM reports r 
      LEFT JOIN users u ON r.user_id = u.id 
      LEFT JOIN staff s ON r.assigned_staff_id = s.id
      ORDER BY r.created_at DESC
    `);
    
    cache.set('admin_reports', result.rows);
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
    const result = await db.query(`SELECT id, identifier, name, points FROM users WHERE id = $1`, [req.user.userId]);
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Claim a reward (deduct points)
app.post('/user/claim-reward', authenticateToken, async (req, res) => {
  const { cost, rewardName } = req.body;
  try {
    // Start transaction
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query('SELECT points FROM users WHERE id = $1 FOR UPDATE', [req.user.userId]);
      const currentPoints = result.rows[0].points;
      
      if (currentPoints < cost) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Not enough points to claim this reward.' });
      }
      
      await client.query('UPDATE users SET points = points - $1 WHERE id = $2', [cost, req.user.userId]);
      await client.query('COMMIT');
      res.json({ message: `Successfully claimed ${rewardName}!` });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
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

// Update push token
app.put('/user/push-token', authenticateToken, async (req, res) => {
  const { pushToken } = req.body;
  try {
    await db.query(`UPDATE users SET push_token = $1 WHERE id = $2`, [pushToken, req.user.userId]);
    res.json({ message: 'Push token registered' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get public reports for map
app.get('/reports/public', async (req, res) => {
  try {
    const cachedData = cache.get('public_reports');
    if (cachedData) return res.json(cachedData);

    const result = await db.query(`
      SELECT id, category, department, lat, lng, status, created_at
      FROM reports
      WHERE status != 'Solved' AND lat IS NOT NULL AND lng IS NOT NULL
    `);
    
    cache.set('public_reports', result.rows);
    res.json(result.rows);
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

    const imagePath = req.file.path; // Cloudinary URL
    const mimeType = req.file.mimetype;
    const base64Data = await urlToBase64(imagePath);

    let success = false;
    let data = null;
    let attempts = 0;
    
    while (!success && attempts < 3) {
      attempts++;
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-flash-latest',
            contents: [
                `Analyze this image to determine if it shows a civic issue related to: road potholes, garbage/solid waste, water leakage/supply, sanitary issues, or electricity issues (e.g. fallen poles, cut wires).
                CRITICAL RULES:
                1. If the image is blurred, return ONLY this JSON: {"category": "Invalid", "description": "Image is blurred. Please take a clear photo.", "department": "None"}
                2. If the image shows ONLY a keyboard, mug, or indoor object without any civic issue on a screen, return ONLY this JSON: {"category": "Invalid", "description": "[Object Name] is not a valid civic issue.", "department": "None"} (Replace [Object Name] with what you detected).
                3. If the image shows a valid civic issue (even if it is a photo of a computer screen or monitor displaying the issue for demo purposes), return a JSON object with 'category' (e.g., 'Road', 'Garbage', 'Water', 'Sanitary', 'Street Light', 'Electricity'), 'description' (a formal request letter of 3-4 sentences addressing the municipal authority describing the issue, providing context, and respectfully requesting action), and 'department' (e.g., 'Municipal Corporation (Road Maintenance)'). 
                4. If the image DOES NOT relate to any of these civic issues at all, return ONLY this JSON: {"category": "Invalid", "description": "Does not match any valid civic issues.", "department": "None"}. 
                Return ONLY valid JSON, nothing else.`,
                {
                    inlineData: {
                        data: base64Data,
                        mimeType: mimeType
                    }
                }
            ]
        });
        
        const text = response.text;
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            data = JSON.parse(jsonMatch[0]);
            success = true;
        } else {
            throw new Error("No JSON found in response");
        }
      } catch (err) {
        console.error(`Gemini AI Error (Attempt ${attempts}):`, err);
        if (attempts >= 3) {
          return res.json({
            category: 'Unidentified Issue',
            description: 'Could not automatically describe this issue due to high server demand. Please try again or review manually.',
            department: 'General Administration'
          });
        }
        // Wait 2 seconds before retrying
        await new Promise(r => setTimeout(r, 2000));
      }
    }
    
    res.json(data);
  } catch (err) {
    console.error("Route Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Submit a new report
app.post('/reports', authenticateToken, upload.single('image'), async (req, res) => {
  const { category, description, department, lat, lng, address } = req.body;
  const imageUrl = req.file ? req.file.path : null; // Cloudinary URL
  const userId = req.user.userId;

  try {
    // Geo-fence Deduplication Check (50 meters)
    if (lat && lng) {
      const radiusKm = 0.05; // 50 meters
      const query = `
        SELECT r.id, u.name 
        FROM reports r
        JOIN users u ON r.user_id = u.id
        WHERE r.status != 'Solved' 
          AND r.category = $1
          AND r.lat IS NOT NULL AND r.lng IS NOT NULL
          AND (
            6371 * acos(
              cos(radians($2::float)) * cos(radians(r.lat::float)) *
              cos(radians(r.lng::float) - radians($3::float)) +
              sin(radians($2::float)) * sin(radians(r.lat::float))
            )
          ) < $4
        LIMIT 1
      `;
      const duplicateRes = await db.query(query, [category, lat, lng, radiusKm]);
      if (duplicateRes.rows.length > 0) {
        const existingUserName = duplicateRes.rows[0].name || 'another user';
        return res.status(409).json({ 
          error: `A ${category} complaint has already been registered near this exact location by ${existingUserName}.` 
        });
      }
    }

    const result = await db.query(
      `INSERT INTO reports (user_id, category, description, department, lat, lng, address, image_url) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [req.user.userId, category, description, department, lat, lng, address, imageUrl]
    );
    
    clearCache(); // Invalidate cache on new report
    res.status(201).json({ message: 'Report submitted successfully', reportId: result.rows[0].id });
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
    
    // Add 50 civic points
    await db.query(`UPDATE users SET points = points + 50 WHERE id = $1`, [userId]);
    sendPushNotification(userId, 'Issue Solved! 🎉', 'You earned +50 Civic Points for keeping your community safe.');

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

// Render Keep-Alive Ping
app.get('/ping', (req, res) => {
  res.send('pong');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
