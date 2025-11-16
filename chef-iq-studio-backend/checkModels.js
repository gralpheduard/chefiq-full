require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function checkGeminiModels() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error('ERROR: GEMINI_API_KEY not found in .env file.');
    return;
  }

  console.log('API Key loaded.');

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    console.log('GoogleGenerativeAI instance created.');

    // ✅ Just test if your API key works by generating something
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    const result = await model.generateContent("Hello Gemini! List available models?");
    console.log("\n✅ Model is working!");
    console.log("Response:\n", result.response.text());

  } catch (error) {
    console.error('\nERROR during Gemini test:', error);
    if (error.status === 403) {
      console.error('  [403 Forbidden] API key might lack permissions, or billing not enabled.');
    } else if (error.status === 400) {
      console.error('  [400 Bad Request] Check your API key format or region settings.');
    } else {
      console.error('  Further error details:', error.errorDetails);
    }
  }
}

checkGeminiModels();
