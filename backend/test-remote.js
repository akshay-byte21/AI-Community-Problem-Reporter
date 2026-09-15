async function testRemoteServer() {
  const dummyBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
  const buffer = Buffer.from(dummyBase64, 'base64');
  
  // Try to login to get a token
  let token = null;
  try {
      const loginRes = await fetch('https://ai-community-problem-reporter.onrender.com/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: "aiproblemreporter@gmail.com", password: "password123" })
      });
      const loginData = await loginRes.json();
      token = loginData.token;
  } catch (e) {
      console.log("Login failed:", e.message);
  }

  if (token) {
      try {
          const form = new FormData();
          const blob = new Blob([buffer], { type: 'image/png' });
          form.append('image', blob, 'test.png');
          
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
}
testRemoteServer();
