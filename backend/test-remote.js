async function testRemoteServer() {
  const fs = require('fs');
  // Read a real image from the artifacts
  const imagePath = "C:\\Users\\Akshay Ganesh\\.gemini\\antigravity\\brain\\009cf919-decc-4a02-aad7-4f8d050595d4\\.user_uploaded\\media_1788796306948.jpg";
  const imageBuffer = fs.readFileSync(imagePath);
  
  const dummyUser = {
      identifier: "testai" + Math.floor(Math.random() * 10000) + "@test.com",
      password: "password123",
      name: "Test User"
  };

  try {
      console.log("Registering user:", dummyUser.identifier);
      const regRes = await fetch('https://ai-community-problem-reporter.onrender.com/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dummyUser)
      });
      const regData = await regRes.json();
      console.log("Register response:", regData);

      console.log("Logging in...");
      const loginRes = await fetch('https://ai-community-problem-reporter.onrender.com/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: dummyUser.identifier, password: dummyUser.password })
      });
      const loginData = await loginRes.json();
      const token = loginData.token;
      
      if (!token) {
          console.error("Login failed, no token:", loginData);
          return;
      }

      console.log("Testing /analyze-image...");
      const form = new FormData();
      const blob = new Blob([imageBuffer], { type: 'image/jpeg' });
      form.append('image', blob, 'test.jpg');
      
      const res = await fetch('https://ai-community-problem-reporter.onrender.com/analyze-image', {
          method: 'POST',
          headers: {
              'Authorization': `Bearer ${token}`
          },
          body: form
      });
      const resultText = await res.text();
      console.log("STATUS:", res.status);
      console.log("RESPONSE:", resultText);
  } catch (err) {
      console.error("ERROR from remote:", err);
  }
}
testRemoteServer();
testRemoteServer();
