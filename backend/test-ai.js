require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function testImage() {
  let attempts = 0;
  let success = false;
  
  while (attempts < 3 && !success) {
    attempts++;
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const dummyBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
        
        console.log(`Attempt ${attempts}...`);
        const response = await ai.models.generateContent({
            model: 'gemini-3.6-flash',
            contents: [
                "Is this a pothole?",
                { inlineData: { data: dummyBase64, mimeType: "image/png" } }
            ]
        });
        
        console.log("SUCCESS!");
        console.log("TEXT VALUE:", response.text);
        success = true;
    } catch (err) {
        console.error(`ERROR on attempt ${attempts}:`, err.message);
        if (attempts < 3) {
            console.log("Sleeping for 2 seconds before retry...");
            await sleep(2000);
        }
    }
  }
}
testImage();
