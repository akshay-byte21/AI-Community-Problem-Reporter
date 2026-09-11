const fs = require('fs');
const transcriptPath = 'C:/Users/Akshay Ganesh/.gemini/antigravity/brain/009cf919-decc-4a02-aad7-4f8d050595d4/.system_generated/logs/transcript.jsonl';
const outPath = 'C:/Users/Akshay Ganesh/.gemini/antigravity/brain/009cf919-decc-4a02-aad7-4f8d050595d4/prompt_history.md';

const lines = fs.readFileSync(transcriptPath, 'utf8').split('\n');
let out = '# Complete Prompt History\n\nHere are all the prompts you have given during this project:\n\n';
let num = 1;
const seenPrompts = new Set();

lines.forEach(l => {
  if (!l) return;
  try {
    const obj = JSON.parse(l);
    if (obj.type === 'USER_INPUT') {
      const match = obj.content.match(/<USER_REQUEST>([\s\S]*?)<\/USER_REQUEST>/);
      if (match) {
        const promptText = match[1].trim();
        if (promptText && !seenPrompts.has(promptText)) {
          seenPrompts.add(promptText);
          out += `**${num++}.** ${promptText}\n\n`;
        }
      }
    }
  } catch (e) {}
});

fs.writeFileSync(outPath, out);
console.log('Successfully wrote prompt history to ' + outPath);
