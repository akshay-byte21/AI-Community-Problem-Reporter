const axios = require('axios');
const jwt = require('jsonwebtoken');
require('dotenv').config();

async function run() {
  const token = jwt.sign({ userId: 1 }, process.env.JWT_SECRET || 'secret123', { expiresIn: '7d' });
  try {
    const res = await axios.get('https://ai-community-problem-reporter.onrender.com/user', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("Render API User:", res.data);
  } catch (err) {
    console.error("Error:", err.response?.data || err.message);
  }
}
run();
