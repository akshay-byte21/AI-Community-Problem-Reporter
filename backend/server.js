require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const db = require('./database');
const fs = require('fs');
const { GoogleGenAI } = require('@google/genai');

const app = express();
app.use(cors());
app.use(express.json());

const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'prbm_reports',
    allowed_formats: ['jpg', 'png', 'jpeg']
  }
});
const upload = multer({ storage: storage });

const SECRET_KEY = 'super_secret_key_for_this_app_only'; // In production, use env variable

// In-memory OTP store for prototyping
const otpStore = new Map();

// Generate a random 4-digit OTP
const generateOTP = () => Math.floor(1000 + Math.random() * 9000).toString();

// Send OTP Route
app.post('/send-otp', (req, res) => {
  const { identifier } = req.body;
  if (!identifier) return res.status(400).json({ error: 'Email or phone required' });

  const otp = generateOTP();
  // Store OTP with 10-minute expiry
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
    // OTP verified successfully, we can mark it as verified or just delete it and trust the client for prototype
    // For better security, we'd issue a temporary token, but we will trust the client to proceed to /register.
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
    db.run(`INSERT INTO users (identifier, password, name) VALUES (?, ?, ?) RETURNING id`, [identifier, hashedPassword, name || ''], function(err) {
      if (err) {
        if (err.message.includes('duplicate key value violates unique constraint') || err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: 'Account with this email/phone already exists' });
        }
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({ message: 'User created', userId: this.lastID });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Login Route
app.post('/login', (req, res) => {
  const identifier = req.body.identifier || req.body.phone;
  const password = req.body.password;
  console.log(`[LOGIN ATTEMPT] identifier: "${identifier}", password: "${password}"`);

  if (!identifier || !password) {
    console.log('[LOGIN ERROR] Missing identifier or password');
    return res.status(400).json({ error: 'Identifier and password required' });
  }

  db.get(`SELECT * FROM users WHERE identifier = ?`, [identifier], async (err, user) => {
    if (err) {
      console.log(`[LOGIN ERROR] DB Error: ${err.message}`);
      return res.status(500).json({ error: err.message });
    }
    if (!user) {
      console.log(`[LOGIN ERROR] User not found for identifier: "${identifier}"`);
      return res.status(400).json({ error: 'Invalid email/phone or password' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      console.log(`[LOGIN ERROR] Invalid password for identifier: "${identifier}"`);
      return res.status(400).json({ error: 'Invalid email/phone or password' });
    }

    console.log(`[LOGIN SUCCESS] User ${user.id} logged in successfully`);
    const token = jwt.sign({ userId: user.id }, SECRET_KEY, { expiresIn: '24h' });
    res.json({ token, userId: user.id });
  });
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

// Admin: Get all users in the system
app.get('/admin/users', (req, res) => {
  db.all(`
    SELECT u.id, u.identifier, u.name, u.created_at, COUNT(r.id) as complaints_count 
    FROM users u 
    LEFT JOIN reports r ON u.id = r.user_id 
    GROUP BY u.id 
    ORDER BY u.created_at DESC
  `, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ users: rows });
  });
});

// Admin: Get all staff members
app.get('/admin/staff', (req, res) => {
  db.all(`SELECT * FROM staff`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ staff: rows });
  });
});

// Admin: Assign staff to a report
app.post('/admin/reports/:id/assign', (req, res) => {
  const { id } = req.params;
  const { staff_id } = req.body;
  if (!staff_id) return res.status(400).json({ error: 'staff_id required' });

  // Update report to assign staff and change status to 'In Progress'
  db.run(`UPDATE reports SET assigned_staff_id = ?, status = 'In Progress' WHERE id = ?`, [staff_id, id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Report not found' });
    res.json({ message: 'Staff assigned successfully' });
  });
});

// Admin: Get all reports in the system with user details and assigned staff
app.get('/admin/reports', (req, res) => {
  // No auth for prototype admin dashboard
  db.all(`
    SELECT r.*, u.name as user_name, u.identifier as user_identifier, s.name as staff_name 
    FROM reports r 
    LEFT JOIN users u ON r.user_id = u.id 
    LEFT JOIN staff s ON r.assigned_staff_id = s.id
    ORDER BY r.created_at DESC
  `, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    
    const reportsWithUTC = rows.map(r => ({
      ...r,
      created_at: r.created_at.replace(' ', 'T') + 'Z'
    }));
    
    res.json({ reports: reportsWithUTC });
  });
});

// Get all reports (filtered by user)
app.get('/reports', authenticateToken, (req, res) => {
  db.all(`SELECT * FROM reports WHERE user_id = ? ORDER BY created_at DESC`, [req.user.userId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    
    const reportsWithUTC = rows.map(r => ({
      ...r,
      // Convert SQLite CURRENT_TIMESTAMP to valid ISO string (UTC)
      created_at: r.created_at.replace(' ', 'T') + 'Z'
    }));
    
    res.json({ reports: reportsWithUTC });
  });
});

// Get user profile
app.get('/user', authenticateToken, (req, res) => {
  db.get(`SELECT id, identifier, name FROM users WHERE id = ?`, [req.user.userId], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  });
});

// Update user profile
app.put('/user', authenticateToken, (req, res) => {
  const { name } = req.body;
  db.run(`UPDATE users SET name = ? WHERE id = ?`, [name, req.user.userId], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Profile updated successfully' });
  });
});

// Analyze image using Gemini AI
app.post('/analyze-image', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Image is required' });
    
    // Simulate Gemini if key is not present
    if (!process.env.GEMINI_API_KEY) {
      console.log("No GEMINI_API_KEY found, returning mock data");
      return res.json({
        category: 'Road',
        description: 'To the Municipal Authority,\n\nI am writing to formally request immediate attention to a severe road damage issue at the reported location. A large pothole has developed, causing significant inconvenience and posing a safety hazard to both vehicles and pedestrians. Prompt repair work is necessary to prevent accidents and restore safe transit. Thank you for your swift action on this civic matter.',
        department: 'Municipal Corporation (Road Maintenance)'
      });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const imagePath = path.join(__dirname, req.file.path);
    const mimeType = req.file.mimetype;
    
    const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: [
            "Analyze this image to determine if it shows a civic issue related to: road potholes, garbage/solid waste, water leakage/supply, sanitary issues, or electricity issues (e.g. fallen poles, cut wires). If it matches one of these, return a JSON object with 'category' (e.g., 'Road', 'Garbage', 'Water', 'Sanitary', 'Street Light', 'Electricity'), 'description' (a formal request letter of 3-4 sentences addressing the municipal authority describing the issue, providing context, and respectfully requesting action), and 'department' (e.g., 'Municipal Corporation (Road Maintenance)'). If the image DOES NOT relate to any of these civic issues, return ONLY this JSON: {\"category\": \"Invalid\", \"description\": \"Invalid image: Does not match civic issues\", \"department\": \"None\"}. Return ONLY valid JSON, nothing else.",
            {
                inlineData: {
                    data: fs.readFileSync(imagePath).toString("base64"),
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
    // Fallback if AI fails
    res.json({
      category: 'Unidentified Issue',
      description: 'Could not automatically describe this issue. Please review manually.',
      department: 'General Administration'
    });
  }
});

// Submit a new report
app.post('/reports', authenticateToken, upload.single('image'), (req, res) => {
  const { category, description, department, lat, lng, address } = req.body;
  const imageUrl = req.file ? req.file.path : null;
  const userId = req.user.userId;

  db.run(
    `INSERT INTO reports (user_id, category, description, department, lat, lng, address, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
    [userId, category, description, department, lat, lng, address, imageUrl], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ message: 'Report submitted', reportId: this.lastID });
    });
});

// Mark a report as Completed by the user
app.put('/reports/:id/complete', authenticateToken, (req, res) => {
  const reportId = req.params.id;
  const userId = req.user.userId;

  db.run(`UPDATE reports SET status = 'Completed' WHERE id = ? AND user_id = ?`, [reportId, userId], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Report not found or not authorized' });
    res.json({ message: 'Report marked as completed successfully' });
  });
});

// Reopen a report by the user (No, still pending)
app.put('/reports/:id/reopen', authenticateToken, (req, res) => {
  const reportId = req.params.id;
  const userId = req.user.userId;

  db.run(`UPDATE reports SET status = 'In Progress' WHERE id = ? AND user_id = ?`, [reportId, userId], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Report not found or not authorized' });
    res.json({ message: 'Report reopened successfully' });
  });
});

const PORT = 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});

