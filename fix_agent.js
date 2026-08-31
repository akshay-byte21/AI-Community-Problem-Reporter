const fs = require('fs');
let code = fs.readFileSync('backend/server.js', 'utf16le'); // Try utf16le
if (!code.includes('environment_match')) {
  code = fs.readFileSync('backend/server.js', 'utf8'); // fallback
}

const oldPrompt = `Perform a step-by-step analysis:
                    1. Identify the environment in the FIRST image.
                    2. Identify the environment in the SECOND image.
                    3. Are they the EXACT SAME physical location? If the second image is a random object (like a keyboard, screen, or floor), the answer is NO.
                    4. If they match, is the civic issue fixed in the second image?

                    Respond ONLY with a JSON object in this exact format:
                    {
                        "environment_match": boolean,
                        "issue_resolved": boolean,
                        "reason": "your step-by-step reasoning",
                        "valid": boolean (true ONLY if both environment_match and issue_resolved are true)
                    }`;

const newPrompt = `Perform a step-by-step visual audit:
                    1. Environment Comparison: Look VERY closely at the surrounding environment, landmarks, buildings, trees, walls, or road patterns in the FIRST image (the before image). Does the SECOND image contain these EXACT SAME landmarks? If the agent uploaded a random stock photo, a picture of a screen, or an unrelated location, environment_match is false.
                    2. Issue Resolution: If the environments match, look at the specific civic issue (e.g. the pothole). Has it been physically repaired/fixed in the SECOND image?

                    Respond ONLY with a JSON object in this exact format:
                    {
                        "reason": "First, analyze the environment in both images. Explain exactly what landmarks match or don't match. Then, explain if the civic issue has been repaired.",
                        "environment_match": boolean,
                        "issue_resolved": boolean,
                        "valid": boolean
                    }`;

// Ignore whitespace differences in replacement
code = code.replace(/Perform a step-by-step analysis:[\s\S]*?"valid": boolean \(true ONLY if both environment_match and issue_resolved are true\)\s*\}/, newPrompt);

fs.writeFileSync('backend/server.js', code, 'utf8');
