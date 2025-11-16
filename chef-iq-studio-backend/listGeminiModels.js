require('dotenv').config(); // Ensure dotenv is loaded to access process.env
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error('ERROR: GEMINI_API_KEY not found in .env file.');
    console.error('Please ensure your .env has: GEMINI_API_KEY=YOUR_KEY_HERE');
    return;
  }
  console.log('API Key loaded (first 5 chars):', apiKey.substring(0, 5) + '...');

  const genAI = new GoogleGenerativeAI(apiKey);

  // --- ADVANCED DIAGNOSTIC LOGS ---
  console.log('\n--- Deep Debugging GoogleGenerativeAI instance ---');
  console.log('Type of genAI object itself:', typeof genAI);
  console.log('Is genAI an object:', genAI && typeof genAI === 'object');
  console.log('Constructor name:', genAI.constructor ? genAI.constructor.name : 'N/A');

  // Check for the method directly on the prototype chain
  let currentProto = Object.getPrototypeOf(genAI);
  let foundListModels = false;
  while (currentProto) {
      console.log(`Checking prototype: ${currentProto.constructor.name}`);
      if (Object.prototype.hasOwnProperty.call(currentProto, 'listModels')) {
          console.log(`  Found 'listModels' on prototype: ${currentProto.constructor.name}`);
          console.log(`  Type of listModels on this proto: ${typeof currentProto.listModels}`);
          foundListModels = true;
          break;
      }
      currentProto = Object.getPrototypeOf(currentProto);
  }
  if (!foundListModels) {
      console.log("CRITICAL: 'listModels' method was NOT found anywhere on the prototype chain of genAI.");
  }

  console.log('Full genAI object properties (non-enumerable might be missing):', Object.keys(genAI));
  console.log('--- End Deep Debugging ---\n');


  try {
    console.log('Attempting to fetch available Gemini models using genAI.listModels()...');
    // The problematic line
    const { models } = await genAI.listModels(); 

    console.log('\n--- Available Gemini Models for Your API Key ---');
    if (models.length === 0) {
      console.log('No models found. Check your API key and project settings.');
      return;
    }

    let foundProModel = false;
    for (const model of models) {
      console.log(`\nID: ${model.name}`);
      console.log(`  Display Name: ${model.displayName}`);
      console.log(`  Version: ${model.version}`);
      console.log(`  Description: ${model.description}`);
      console.log(`  Input Token Limit: ${model.inputTokenLimit}`);
      console.log(`  Output Token Limit: ${model.outputTokenLimit}`);
      console.log(`  Supported Methods: ${model.supportedGenerationMethods?.join(', ') || 'None'}`);

      if (model.name.includes('gemini-') && model.name.includes('pro') && model.supportedGenerationMethods?.includes('generateContent')) {
        console.log('  *** This looks like a suitable Gemini Pro model for generateContent! ***');
        foundProModel = true;
      }
    }
    if (!foundProModel) {
        console.log('\n--- IMPORTANT: Could not find a "gemini-pro" model that supports "generateContent". ---');
        console.log('   Please review the list above carefully, or check your Google Cloud project settings and API key permissions.');
    }
    console.log('\n----------------------------------------------');


  } catch (error) {
    console.error('Error listing models:', error);
    if (error.status === 403) {
      console.error('Possible API Key or permissions issue. Ensure your API key is correct and has access to Gemini models.');
    }
  }
}

listModels();