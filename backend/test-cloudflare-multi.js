require('dotenv').config();
const fs = require('fs');

async function testCloudflareVisionMulti() {
    try {
        const imagePath = "C:\\Users\\Akshay Ganesh\\.gemini\\antigravity\\brain\\009cf919-decc-4a02-aad7-4f8d050595d4\\.user_uploaded\\media_1788796334887.jpg";
        const base64Data = fs.readFileSync(imagePath).toString('base64');
        const dataUrl = `data:image/jpeg;base64,${base64Data}`;
        
        const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
        const apiToken = process.env.CLOUDFLARE_USER_API_TOKEN;

        const response = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1/chat/completions`,
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiToken}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: "@cf/meta/llama-3.2-11b-vision-instruct",
                    messages: [
                        {
                            role: "user",
                            content: [
                                { type: "text", text: "Are these two images identical?" },
                                { type: "image_url", image_url: { url: dataUrl } },
                                { type: "image_url", image_url: { url: dataUrl } }
                            ]
                        }
                    ]
                })
            }
        );
        
        const data = await response.json();
        console.log("RESPONSE:", JSON.stringify(data, null, 2));
    } catch(e) {
        console.error("ERROR:", e);
    }
}
testCloudflareVisionMulti();
