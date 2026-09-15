require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

async function test() {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: 'Write a valid JSON object with {"status": "ok"}. Reply with only JSON.',
        config: {
            responseMimeType: "application/json",
        }
    });
    console.log("RESPONSE TEXT TYPE:", typeof response.text);
    console.log("RESPONSE TEXT IS FUNCTION?", typeof response.text === 'function');
    console.log("RESPONSE TEXT VALUE:", response.text);
    
    // Check if we need to call it
    const actualText = typeof response.text === 'function' ? response.text() : response.text;
    console.log("ACTUAL TEXT:", actualText);

  } catch (err) {
    console.error("ERROR:", err);
  }
}
test();
