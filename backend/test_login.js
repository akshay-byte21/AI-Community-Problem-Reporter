const axios = require('axios');

async function run() {
  try {
    const resLogin = await axios.post('https://ai-community-problem-reporter.onrender.com/login', {
      identifier: '9392671947',
      password: 'password123' // Is this the password? I don't know the password...
    });
    console.log(resLogin.data);
  } catch (err) {
    console.error("Error:", err.response?.data || err.message);
  }
}
run();
