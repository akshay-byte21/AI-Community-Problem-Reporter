const axios = require('axios');
const jwt = require('jsonwebtoken');

async function run() {
  const SECRET_KEY = 'super_secret_key_for_this_app_only';
  const token = jwt.sign({ userId: 1 }, SECRET_KEY, { expiresIn: '365d' });
  try {
    const res = await axios.get('http://localhost:8080/user', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("Local API User:", res.data);
  } catch (err) {
    console.error("Error:", err.response?.data || err.message);
  }
}
run();
