require('dotenv').config();
const fs = require('fs');

async function testCloudflareVision() {
    try {
        const imagePath = "C:\\Users\\Akshay Ganesh\\.gemini\\antigravity\\brain\\009cf919-decc-4a02-aad7-4f8d050595d4\\.user_uploaded\\media_1789566322827.jpg";
        const base64Data = fs.readFileSync(imagePath).toString('base64');
        const buffer = Buffer.from(base64Data, 'base64');
        const imageBufferToSend = Array.from(buffer);
        
        const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
        const apiToken = process.env.CLOUDFLARE_USER_API_TOKEN;

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
                    image: imageBufferToSend
                })
            }
        );
        
        const data = await response.json();
        console.log("RESPONSE:", JSON.stringify(data, null, 2));
    } catch(e) {
        console.error("ERROR:", e);
    }
}
testCloudflareVision();
