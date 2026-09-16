require('dotenv').config();
const fs = require('fs');

async function testCloudflareVision() {
    try {
        const imagePath = "C:\\Users\\Akshay Ganesh\\.gemini\\antigravity\\brain\\009cf919-decc-4a02-aad7-4f8d050595d4\\.user_uploaded\\media_1788796334887.jpg";
        const imageBuffer = fs.readFileSync(imagePath);
        const imageArray = Array.from(imageBuffer);
        
        const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
        const apiToken = process.env.CLOUDFLARE_USER_API_TOKEN;
        
        // 1. Accept license
        await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/meta/llama-3.2-11b-vision-instruct`,
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiToken}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ prompt: "agree" })
            }
        );

        // 2. Query model
        const response = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/meta/llama-3.2-11b-vision-instruct`,
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiToken}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    prompt: "Analyze this image to determine if it shows a civic issue related to: road potholes, garbage/solid waste, water leakage/supply, sanitary issues, or electricity issues. Return ONLY a JSON object with 'category', 'description', and 'department'. Nothing else.",
                    image: imageArray
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
