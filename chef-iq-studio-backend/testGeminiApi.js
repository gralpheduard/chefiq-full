require('dotenv').config(); // Ensure dotenv is loaded
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGeminiHello() {
  const apiKey = process.env.GEMINI_API_KEY;
  const modelName = "gemini-1.5-flash"; // Using the last model name you tried

  if (!apiKey) {
    console.error('ERROR: GEMINI_API_KEY not found in .env file.');
    console.error('Please ensure your .env has: GEMINI_API_KEY=YOUR_KEY_HERE');
    return;
  }
  console.log('API Key loaded (first 5 chars):', apiKey.substring(0, 5) + '...');
  console.log(`Attempting to use model: "${modelName}"`);

  let genAI;
  try {
    genAI = new GoogleGenerativeAI(apiKey);
    console.log('GoogleGenerativeAI instance created successfully.');
  } catch (initError) {
    console.error('ERROR: Failed to initialize GoogleGenerativeAI:', initError);
    console.error('This indicates a problem with the SDK itself or its dependencies.');
    return;
  }

  let model;
  try {
    model = genAI.getGenerativeModel({ model: modelName });
    console.log(`Generative model "${modelName}" obtained successfully.`);
  } catch (getModelError) {
    console.error(`ERROR: Failed to get generative model "${modelName}":`, getModelError);
    console.error('This often means the model name is incorrect or unavailable for your API key/project.');
    return;
  }

  try {
    console.log('Attempting to "say hi" to Gemini...');
    const prompt = "Say hi to Gemini.";
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    console.log('\n--- Gemini\'s Reply ---');
    console.log(text);
    console.log('----------------------');

  } catch (apiError) {
    console.error('\nERROR: Failed to get a response from Gemini API:', apiError);
    if (apiError.status === 404) {
      console.error(`  [404 Not Found] The model "${modelName}" might still be incorrect or unavailable for generateContent.`);
      console.error('  Please verify the exact model name in Google AI Studio.');
    } else if (apiError.status === 403) {
      console.error('  [403 Forbidden] API key might lack permissions, or billing not enabled.');
    } else {
      console.error('  Further error details:', apiError.errorDetails);
    }
  }
}

testGeminiHello();