require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

async function listModels() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  try {
    const models = await ai.models.list();
    console.log(models);
  } catch (e) {
    console.error(e);
  }
}

listModels();
