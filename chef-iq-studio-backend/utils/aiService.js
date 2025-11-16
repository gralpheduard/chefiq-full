// C:\Users\Ralph Gannaban\Desktop\dev\sideline\chefiq\chef-iq-studio-backend\utils\aiService.js
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config(); // Ensure dotenv is loaded to access process.env

// Initialize the Google Generative AI client
// Make sure you have GEMINI_API_KEY in your .env file
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

/**
 * Validates if a given string is a food ingredient using AI.
 * @param {string} ingredientName - The name of the ingredient to validate.
 * @returns {object} { isFood: boolean, reason: string }
 */
async function validateIngredientIsFood(ingredientName) {
    if (!ingredientName || typeof ingredientName !== 'string' || ingredientName.trim() === '') {
        return { isFood: false, reason: "Invalid input: Ingredient name is empty or not a string." };
    }

    const prompt = `Is "${ingredientName}" a food ingredient? Respond with "YES" if it is, and "NO" if it is not. Provide only "YES" or "NO" as the answer.`;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text().trim().toUpperCase();

        if (text === 'YES') {
            return { isFood: true, reason: "" };
        } else if (text === 'NO') {
            return { isFood: false, reason: "Not a food item" };
        } else {
            console.warn(`AI returned unexpected response for ingredient validation ("${ingredientName}"): ${text}`);
            // Fallback for unexpected AI response, assume not food for safety
            return { isFood: false, reason: "AI could not definitively determine if it's a food item." };
        }
    } catch (error) {
        console.error(`Error validating ingredient "${ingredientName}" with AI:`, error);
        return { isFood: false, reason: "AI service error during validation." };
    }
}

/**
 * Generates a recipe based on user input using AI.
 * @param {string} cookerName - The name of the Chef iQ cooker.
 * @param {Array<object>} ingredients - Array of ingredient objects {name, quantity, unit}.
 * @param {string} cookingIntent - "Only These Ingredients" or "Including These Ingredients".
 * @param {string} [optionalTime] - Optional time constraint (e.g., "under 30 minutes").
 * @returns {object} Structured JSON object representing the recipe.
 */
async function generateRecipe(cookerName, ingredients, cookingIntent, optionalTime) {
    const ingredientList = ingredients.map(ing => {
        // We already have quantity and unit from the frontend or validation, so use them directly.
        // For the AI prompt, construct a natural language string.
        let str = `${ing.quantity} ${ing.unit} ${ing.name}`;
        // Clean up "1  Chicken" if unit is empty, but with new schema, unit will always be present
        str = str.replace(/\s\s+/g, ' ').trim(); // Remove extra spaces
        return str;
    }).join(', ');

    let timeConstraint = '';
    if (optionalTime && optionalTime.trim() !== '') {
        timeConstraint = `Aim for a total preparation and cook time ${optionalTime}.`;
    }

    let prompt = `Generate a recipe for a Chef iQ ${cookerName}.
    The user wants to cook with the following ingredients: ${ingredientList}.
    Cooking intent: "${cookingIntent}". ${timeConstraint}
    
    If the intent is "Only These Ingredients", strictly use *only* the provided ingredients.
    If the intent is "Including These Ingredients", use the provided ingredients and *add other common, complementary ingredients* as needed to create a balanced meal.
    
    The output should be in a structured JSON format. Ensure 'mainImage' is an empty string. Ensure all steps have a 'stepNumber'.
    If 'shoppingListSuggestions' is empty or not applicable (for "Only These Ingredients" intent), provide an empty array.
    The 'chefIQCookerSettings' should be a concise string suggesting how to use the specific Chef iQ cooker.
    
    ***IMPORTANT INGREDIENT FORMATTING INSTRUCTIONS:***
    For each ingredient in the "ingredients" and "shoppingListSuggestions" arrays:
    -   The "name" field must be the descriptive name of the food item (e.g., "Chicken Breast", "Large Eggs", "Red Onion").
    -   The "quantity" field *must* be a **numerical value** (e.g., 0.5, 1, 250). It should NOT contain units or words.
    -   The "unit" field *must* be a **string describing the measurement unit** (e.g., "cups", "grams", "teaspoons", "whole", "medium", "cloves", "pieces"). This field should always be present and descriptive. For items that don't traditionally have a specific unit (like "1 onion"), use descriptive units like "whole", "large", "medium", or "piece".
    -   Avoid putting numbers or units into the "name" field.
    
    JSON format:
    {
      "title": "A short, descriptive title for the recipe",
      "description": "A brief, enticing description.",
      "mainImage": "",
      "metadata": {
        "prepTime": "e.g., 15 minutes",
        "cookTime": "e.g., 30 minutes",
        "yield": "e.g., 4 servings",
        "difficulty": "e.g., Easy",
        "cuisine": "e.g., American",
        "tags": ["e.g., healthy", "e.g., quick", "e.g., one-pot"]
      },
      "ingredients": [
        {"name": "Chicken Breast", "quantity": 500, "unit": "grams"},
        {"name": "Large Eggs", "quantity": 2, "unit": "whole"},
        {"name": "All-Purpose Flour", "quantity": 1.5, "unit": "cups"}
      ],
      "steps": [
        {"stepNumber": 1, "description": "Step 1 instruction."},
        {"stepNumber": 2, "description": "Step 2 instruction."}
      ],
      "chefIQCookerSettings": "Specific settings for the Chef iQ ${cookerName} (e.g., 'Pressure Cook, High, 10 minutes, Natural Release')",
      "whyThisRecipe": "A short explanation of why these ingredients and cooking method were chosen.",
      "shoppingListSuggestions": [
        {"name": "Garlic", "quantity": 3, "unit": "cloves"}
      ]
    }
    Ensure the JSON is perfectly parsable. Do not include any text outside the JSON block.
    `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // The AI might sometimes wrap JSON in markdown, so we extract it if present
        const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
        const jsonString = jsonMatch ? jsonMatch[1] : text;
        
        // Parse the JSON. If parsing fails, it will throw an error caught below.
        const parsedData = JSON.parse(jsonString);

        // *** MODIFICATION START: Post-process to ensure quantity is a number and unit is a string ***
        const processIngredientArray = (arr) => arr.map(ing => ({
            name: ing.name ? String(ing.name).trim() : 'Unnamed Ingredient',
            quantity: typeof ing.quantity === 'number' ? ing.quantity : parseFloat(ing.quantity || '0') || 0, // Ensure number, default to 0
            unit: ing.unit ? String(ing.unit).trim() : 'unit', // Ensure string, default to 'unit'
        }));

        parsedData.ingredients = processIngredientArray(parsedData.ingredients || []);
        parsedData.shoppingListSuggestions = processIngredientArray(parsedData.shoppingListSuggestions || []);
        // *** MODIFICATION END ***

        return parsedData;

    } catch (error) {
        console.error("Error generating recipe with AI:", error);
        // Include the AI's raw text in the error if available for debugging
        const aiRawText = result && result.response ? result.response.text() : 'N/A';
        throw new Error(`Failed to generate recipe. Please try again or refine your ingredients or query. (AI Service Error: ${error.message}). AI Raw Text: ${aiRawText}`);
    }
}


module.exports = {
    validateIngredientIsFood,
    generateRecipe,
};