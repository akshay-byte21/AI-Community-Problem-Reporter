require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');

async function run() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const imagePath = "C:/Users/Akshay Ganesh/.gemini/antigravity/brain/009cf919-decc-4a02-aad7-4f8d050595d4/.user_uploaded/media_1788175833187.jpg";
  const imageBuffer = fs.readFileSync(imagePath);
  const base64Data = imageBuffer.toString('base64');

  let success = false;
  while (!success) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: [
            `You are an elite, highly strict civic issue classifier with forensic vision capabilities. 
             Analyze this image. You MUST detect if this is a photo of a computer/TV screen.
             
             Respond ONLY with a JSON object in this exact format:
             {
               "reasoning": "First, analyze the image specifically looking for screen bezels, moiré pixel patterns, screen glare, or wave structures. Describe what you see.",
               "is_screen": boolean (true if you see any evidence of it being a screen capture/monitor),
               "is_campus": boolean (true if you see educational institute or private campus infrastructure),
               "category": "Road, Garbage, Water, Sanitary, Electricity, or Unknown",
               "department": "Municipal Corporation (Road Maintenance), etc.",
               "description": "A 3-4 sentence formal request letter describing the issue."
             }`
            ,
            {
                inlineData: {
                    data: base64Data,
                    mimeType: 'image/jpeg'
                }
            }
        ]
      });
      console.log("Raw Response:", response.text);
      success = true;
    } catch (e) {
      if (e.status === 503) {
        console.log("503, retrying in 2 seconds...");
        await new Promise(r => setTimeout(r, 2000));
      } else {
        console.error(e);
        break;
      }
    }
  }
}

run().catch(console.error);
