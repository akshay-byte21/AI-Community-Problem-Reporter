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
const Jimp = require('jimp');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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
const memoryUpload = multer({ storage: multer.memoryStorage() });

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
app.post('/agent/resolve', authenticateAgent, memoryUpload.single('image'), async (req, res) => {
  const reportId = req.body.reportId;
  if (!req.file || !reportId) return res.status(400).json({ error: 'Image and reportId required' });

  try {
    const mimeType = req.file.mimetype;
    const newBase64 = req.file.buffer.toString("base64");

    const result = await db.query('SELECT category, description, image_url FROM reports WHERE id = $1 AND assigned_staff_id = $2', [reportId, req.agent.staffId]);
    const row = result.rows[0];
    if (!row) return res.status(404).json({ error: 'Report not found or not assigned to you' });

    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = process.env.CLOUDFLARE_USER_API_TOKEN;
    if (accountId && apiToken) {
      let success = false;
      let verification = null;
      let attempts = 0;
      let lastErrorMsg = "Unknown error";
      
      while (!success && attempts < 3) {
        attempts++;
        try {
          let imageBufferToSend = Array.from(req.file.buffer);
          let promptText = "";

          if (row.image_url) {
            // Optimize Cloudinary URL to fetch a small 400px wide thumbnail instead of the massive original
            let optimizedUrl = row.image_url;
            if (optimizedUrl.includes('/upload/')) {
                optimizedUrl = optimizedUrl.replace('/upload/', '/upload/c_scale,w_400/');
            }

            const image1 = await Jimp.read(optimizedUrl); // Fast, tiny Before image
            const image2 = await Jimp.read(req.file.buffer); // After image

            // Resize to standard width to align properly side-by-side and drastically reduce lag
            image1.resize(400, Jimp.AUTO);
            image2.resize(400, Jimp.AUTO);

            const compositeHeight = Math.max(image1.bitmap.height, image2.bitmap.height);
            const composite = new Jimp(800, compositeHeight, 0xFFFFFFFF); // White background
            composite.composite(image1, 0, 0);
            composite.composite(image2, 400, 0);

            const stitchedBuffer = await composite.getBufferAsync(Jimp.MIME_JPEG);
            imageBufferToSend = Array.from(stitchedBuffer);

            promptText = `You are a strict, highly critical AI verification system auditing a civic worker who might be trying to cheat.
            Analyze this side-by-side composite image. 
            The LEFT half is the ORIGINAL 'Before' state (the reported issue).
            The RIGHT half is the NEW 'After' state (uploaded as proof of resolution).
            Issue category: '${row.category}'. Description: '${row.description}'. 
  
            Perform a step-by-step visual audit:
            1. Environment Comparison: Look VERY closely at the surrounding environment, landmarks, buildings, trees, walls, or road patterns in the LEFT half. Does the RIGHT half contain these EXACT SAME landmarks? (NOTE: If BOTH sides show computer screens or monitors, they must be displaying the EXACT same background/environment).
            2. Issue Resolution: If the environments match, look at the specific civic issue (e.g. pothole) in the RIGHT half. Has it been physically repaired/fixed compared to the LEFT half?
  
            CRITICAL RULE: If the environment/surroundings do NOT clearly match between the left and right halves (e.g. different streets, textures, angles that make it impossible to verify, or stock photos), you MUST return "valid": false and provide a clear, descriptive reason to the agent about exactly what did not match. 
  
            Respond ONLY with a JSON object in this exact format:
            {
                "reason": "Clear message to the agent. If rejected because the images show completely different things, format it exactly like: 'The first image is a [describe first image], but the second image is a [describe second image].' (e.g. 'The first image is a pothole on a street, but the second image is a keyboard.')",
                "environment_match": boolean,
                "issue_resolved": boolean,
                "valid": boolean
            }
            NO conversational text. ONLY raw JSON brackets.`;
          } else {
            promptText = `You are a strict, highly critical AI verification system. Analyze this image (the 'After' state uploaded by the worker as proof of resolution).
            Issue category: '${row.category}'. Description: '${row.description}'. 
  
            1. Issue Resolution: Look at the specific civic issue. Has it been physically repaired/fixed in this image? (NOTE: Photos of computer screens displaying the repaired issue are acceptable for testing).
  
            CRITICAL RULE: If the image is a random object and NOT a repaired civic environment, return "valid": false and provide a clear reason. 
  
            Respond ONLY with a JSON object in this exact format:
            {
                "reason": "Clear and specific message to the agent. If rejected, clearly state exactly why.",
                "environment_match": true,
                "issue_resolved": boolean,
                "valid": boolean
            }
            NO conversational text. ONLY raw JSON brackets.`;
          }

          const response = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/meta/llama-3.2-11b-vision-instruct`,
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiToken}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    prompt: promptText,
                    image: imageBufferToSend
                })
            }
          );
  
          if (!response.ok) throw new Error(`Cloudflare API Error: ${await response.text()}`);
          const dataResp = await response.json();
          if (!dataResp.success) throw new Error(JSON.stringify(dataResp.errors));
          
          const text = dataResp.result.response;
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
              verification = JSON.parse(jsonMatch[0]);
              success = true;
          } else {
              // Fallback for markdown
              const reasonMatch = text.match(/\*\*Reason:\*\*\s*(.*)/i) || text.match(/Reason:\s*(.*)/i);
              const envMatch = text.match(/\*\*Environment Match:\*\*\s*(.*)/i) || text.match(/Environment Match:\s*(.*)/i) || text.match(/"environment_match":\s*(true|false)/i);
              const resolvedMatch = text.match(/\*\*Issue Resolved:\*\*\s*(.*)/i) || text.match(/Issue Resolved:\s*(.*)/i) || text.match(/"issue_resolved":\s*(true|false)/i);
              const validMatch = text.match(/\*\*Valid:\*\*\s*(.*)/i) || text.match(/Valid:\s*(.*)/i) || text.match(/"valid":\s*(true|false)/i);
              
              if (reasonMatch) {
                  verification = {
                      reason: reasonMatch[1].replace(/[\*\_]/g, '').trim(),
                      environment_match: envMatch ? (envMatch[1].toLowerCase().includes('true')) : false,
                      issue_resolved: resolvedMatch ? (resolvedMatch[1].toLowerCase().includes('true')) : false,
                      valid: validMatch ? (validMatch[1].toLowerCase().includes('true')) : false
                  };
                  success = true;
              } else {
                  throw new Error("No JSON or valid markdown found in response: " + text);
              }
          }
          
        } catch (aiErr) {
          console.error(`Agent AI Verification failed (Attempt ${attempts}):`, aiErr);
          let msg = aiErr.message || "Unknown error";
          try {
            const parsed = JSON.parse(msg);
            if (parsed.error && parsed.error.message) msg = parsed.error.message;
          } catch(e) {}
          lastErrorMsg = msg;
          
          const status = aiErr.status || (aiErr.response && aiErr.response.status);
          if (status === 400 || status === 404) {
              attempts = 3; 
          }
          if (attempts < 3) await sleep(Math.pow(2, attempts) * 1000);
        }
      }
      
      if (!success) {
        return res.status(400).json({ error: `AI System Error: ${lastErrorMsg}` });
      }

      if (!verification.valid) {
        return res.status(400).json({ error: verification.reason });
      }
    }

    // Only upload to Cloudinary IF AI validation passes! (Massive speedup)
    const uploadResponse = await cloudinary.uploader.upload(`data:${mimeType};base64,${newBase64}`, { folder: 'complaints' });
    const imageUrl = uploadResponse.secure_url;

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
app.post('/analyze-image', authenticateToken, memoryUpload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Image is required' });
    const mimeType = req.file.mimetype;
    const base64Data = req.file.buffer.toString("base64");

    let success = false;
    let data = null;
    let attempts = 0;
    
    while (!success && attempts < 3) {
      attempts++;
      try {
        const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
        const apiToken = process.env.CLOUDFLARE_USER_API_TOKEN;
        
        if (!accountId || !apiToken) throw new Error("Cloudflare credentials missing");

        const promptText = `Analyze this image to determine if it shows a civic issue related to: road potholes, garbage/solid waste, water leakage/supply, sanitary issues, or electricity issues.
                CRITICAL RULES:
                1. If the image is blurred, return ONLY this JSON: {"category": "Invalid", "description": "Image is blurred. Please take a clear photo.", "department": "None"}
                2. If the image shows a valid civic issue (including photos of a computer screen or monitor displaying a civic issue), return a JSON object with 'category' (e.g., 'Road', 'Garbage', 'Water', 'Sanitary', 'Street Light', 'Electricity'), 'description' (Generate a very detailed, professional, and clear 3-4 sentence report describing the exact severity, location context seen in the photo, and the specific impact on the community to assist the municipal authority), and 'department' (e.g., 'Municipal Corporation (Road Maintenance)'). 
                3. If the image DOES NOT relate to any of these civic issues at all (e.g. it is just a plain wall, a mug, or a blank keyboard with no civic issue on the screen), return ONLY this JSON: {"category": "Invalid", "description": "This is not a recognized civic issue.", "department": "None"}. 
                Return ONLY valid JSON, nothing else. NO conversational text like 'Here is the JSON', just the raw JSON brackets.`;

        const response = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/meta/llama-3.2-11b-vision-instruct`,
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiToken}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    prompt: promptText,
                    image: Array.from(req.file.buffer)
                })
            }
        );

        if (!response.ok) {
            throw new Error(`Cloudflare API Error: ${await response.text()}`);
        }

        const dataResp = await response.json();
        if (!dataResp.success) {
            throw new Error(JSON.stringify(dataResp.errors));
        }

        const text = dataResp.result.response;
        
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            data = JSON.parse(jsonMatch[0]);
            success = true;
        } else {
            // Fallback: Try to parse markdown if the AI failed to use JSON
            const catMatch = text.match(/\*\*Category:\*\*\s*([^\n]*)/i) || text.match(/Category:\s*([^\n]*)/i);
            // Description might be multi-line or single-line. We will just take the rest of the paragraph.
            const descMatch = text.match(/\*\*Description:\*\*\s*([\s\S]*?)(?=\*\*Department:|$)/i) || text.match(/Description:\s*([\s\S]*?)(?=Department:|$)/i);
            const deptMatch = text.match(/\*\*Department:\*\*\s*([^\n]*)/i) || text.match(/Department:\s*([^\n]*)/i);

            if (catMatch) {
                data = {
                    category: catMatch[1].replace(/[\*\_]/g, '').trim(),
                    description: descMatch ? descMatch[1].trim() : "Civic issue detected.",
                    department: deptMatch ? deptMatch[1].replace(/[\*\_]/g, '').trim() : "Municipal Corporation"
                };
                success = true;
            } else {
                throw new Error("No JSON or valid markdown found in response: " + text);
            }
        }
      } catch (err) {
        console.error(`AI Error (Attempt ${attempts}):`, err);
        const status = err.status || (err.response && err.response.status);
        if (status === 400 || status === 404) {
            attempts = 3; // Do not retry for client errors to avoid lag
        }
        if (attempts < 3) await sleep(Math.pow(2, attempts) * 1000); // Exponential backoff
        if (attempts >= 3) {
          let niceMessage = "The AI servers are currently overloaded. Please try again later.";
          try {
              const parsed = JSON.parse(err.message);
              if (parsed.error && parsed.error.message) {
                  niceMessage = parsed.error.message;
              }
          } catch(e) {
              if (err.message) niceMessage = err.message;
          }
          
          return res.json({
            category: 'Unidentified Issue',
            description: `Could not automatically describe this issue: ${niceMessage}`,
            department: 'General Administration'
          });
        }
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
    const result = await db.query(`UPDATE reports SET assigned_staff_id = $1, status = 'In Progress', progress_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING category, address`, [staff_id, req.params.id]);
    
    // Notify the agent
    const staffRes = await db.query(`SELECT push_token FROM staff WHERE id = $1`, [staff_id]);
    if (staffRes.rows.length > 0 && staffRes.rows[0].push_token) {
      await sendPushNotification(staffRes.rows[0].push_token, 'New Assignment 📋', `You have been assigned to a ${result.rows[0]?.category} issue at ${result.rows[0]?.address}`);
    }
    
    clearCache(); // Invalidate cache on update! This fixes the assignment bug!
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

// Render Keep-Alive Ping
app.get('/ping', (req, res) => {
  res.send('pong');
});

// Serve frontend for any other route (SPA)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../admin-web/dist/index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
