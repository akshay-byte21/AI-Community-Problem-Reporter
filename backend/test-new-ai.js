require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');

async function run() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  // Using an image from the user's recent uploads
  const imagePath = "C:/Users/Akshay Ganesh/.gemini/antigravity/brain/009cf919-decc-4a02-aad7-4f8d050595d4/.user_uploaded/media_1788311081421.jpg";
  const imageBuffer = fs.readFileSync(imagePath);
  const base64Data = imageBuffer.toString('base64');
  const mimeType = 'image/jpeg';

  const response = await ai.models.generateContent({
        model: 'gemini-flash-latest',
        contents: [
            `Analyze this image to determine if it shows a civic issue related to: road potholes, garbage/solid waste, water leakage/supply, sanitary issues, or electricity issues (e.g. fallen poles, cut wires).
            CRITICAL RULES:
            1. If the image is blurred, return ONLY this JSON: {"category": "Invalid", "description": "Image is blurred. Please take a clear photo.", "department": "None"}
            2. If the image shows ONLY a keyboard, mug, or indoor object without any civic issue on a screen, return ONLY this JSON: {"category": "Invalid", "description": "[Object Name] is not a valid civic issue.", "department": "None"} (Replace [Object Name] with what you detected).
            3. If the image shows a valid civic issue (even if it is a photo of a computer screen or monitor displaying the issue for demo purposes), return a JSON object with 'category' (e.g., 'Road', 'Garbage', 'Water', 'Sanitary', 'Street Light', 'Electricity'), 'description' (a formal request letter of 3-4 sentences addressing the municipal authority describing the issue, providing context, and respectfully requesting action), and 'department' (e.g., 'Municipal Corporation (Road Maintenance)'). 
            4. If the image DOES NOT relate to any of these civic issues at all, return ONLY this JSON: {"category": "Invalid", "description": "Does not match any valid civic issues.", "department": "None"}. 
            Return ONLY valid JSON, nothing else.`,
            {
                inlineData: {
                    data: base64Data,
                    mimeType: mimeType
                }
            }
        ]
    });
    
    console.log("Raw Response:", response.text);
}

run().catch(console.error);
