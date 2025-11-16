// C:\Users\Ralph Gannaban\Desktop\dev\sideline\chefiq\chef-iq-studio-backend\controllers\aiController.js
const asyncHandler = require('express-async-handler');
const Ingredient = require('../models/Ingredient');
const IngredientSynonym = require('../models/IngredientSynonym');
const ChefIQCooker = require('../models/ChefIQCooker');
const AIRecipe = require('../models/AIRecipe');
const AIRecipeFeedback = require('../models/AIRecipeFeedback');
const User = require('../models/User'); // Required to access the User model for saving recipes
const Recipe = require('../models/Recipe'); // Required to save AI-generated recipes to user's collection

const { validateIngredientIsFood, generateRecipe } = require('../utils/aiService');

// Helper function to standardize ingredient names for consistent database lookup
const standardizeIngredientName = (name) => {
    return name.toLowerCase().trim();
};

// @desc    Get all available Chef iQ cookers
// @route   GET /api/ai/cookers
// @access  Public
const getChefIQCookers = asyncHandler(async (req, res) => {
    const cookers = await ChefIQCooker.find({});
    res.status(200).json(cookers);
});

// @desc    Validate an ingredient as food. Checks DB first, then AI, then saves AI's result to DB.
// @route   POST /api/ai/ingredients/validate
// @access  Public (Can be protected if only authenticated users can use this)
const validateAndSaveIngredient = asyncHandler(async (req, res) => {
    const { name } = req.body;

    if (!name || name.trim() === '') {
        res.status(400);
        throw new Error('Ingredient name is required for validation.');
    }

    const standardizedName = standardizeIngredientName(name);
    let isFood = null;
    let source = 'unknown';
    let ingredientEntry = null;

    // 1. Check database for canonical name
    ingredientEntry = await Ingredient.findOne({ name: standardizedName });

    if (ingredientEntry) {
        isFood = ingredientEntry.is_food;
        source = 'database_canonical';
    } else {
        // 2. Check database for synonym
        const synonymEntry = await IngredientSynonym.findOne({ synonym: standardizedName }).populate('ingredient');
        if (synonymEntry) {
            ingredientEntry = synonymEntry.ingredient; // Get the canonical ingredient linked by the synonym
            isFood = ingredientEntry.is_food;
            source = 'database_synonym';
        }
    }

    if (isFood !== null) {
        // Found in DB (either as canonical or synonym)
        return res.status(200).json({ name: standardizedName, isFood: isFood, source: source });
    }

    // 3. Not found in DB, ask AI
    const aiResponse = await validateIngredientIsFood(standardizedName);
    isFood = aiResponse.isFood;

    // 4. Save AI's determination to DB as a new canonical ingredient
    ingredientEntry = await Ingredient.create({
        name: standardizedName,
        is_food: isFood,
        last_validated_at: Date.now(),
    });
    source = 'ai_new_entry';

    res.status(200).json({ name: standardizedName, isFood: isFood, source: source, reason: aiResponse.reason });
});


// @desc    Generate a recipe based on cooker, ingredients, intent, and optional time
// @route   POST /api/ai/recipes/generate
// @access  Public (Can be protected if only authenticated users can generate)
const generateAIRecipe = asyncHandler(async (req, res) => {
    const { cookerId, ingredients, cookingIntent, optionalTime } = req.body; // ingredients is an array of {name, quantity, unit}

    if (!cookerId || !ingredients || !Array.isArray(ingredients) || ingredients.length === 0 || !cookingIntent) {
        res.status(400);
        throw new Error('Cooker ID, at least one ingredient, and cooking intent are required to generate a recipe.');
    }

    const cooker = await ChefIQCooker.findById(cookerId);
    if (!cooker) {
        res.status(404);
        throw new Error('Selected Chef iQ Cooker not found.');
    }

    // Validate if ALL provided ingredients are recognized as food items (using our DB/AI validation)
    const validatedIngredientsForAI = [];
    for (const ing of ingredients) {
        const standardizedName = standardizeIngredientName(ing.name);
        
        let ingredientDBEntry = await Ingredient.findOne({ name: standardizedName });
        if (!ingredientDBEntry) {
            const synonymEntry = await IngredientSynonym.findOne({ synonym: standardizedName }).populate('ingredient');
            if (synonymEntry) {
                ingredientDBEntry = synonymEntry.ingredient;
            }
        }

        if (!ingredientDBEntry || !ingredientDBEntry.is_food) {
            res.status(400);
            throw new Error(`"${ing.name}" is not recognized as a valid food ingredient. Please ensure all ingredients are food items.`);
        }

        // *** MODIFICATION START: Validate user-provided quantity and unit ***
        const parsedQuantity = parseFloat(ing.quantity);
        if (isNaN(parsedQuantity) || parsedQuantity < 0) {
            res.status(400);
            throw new Error(`Quantity for "${ing.name}" must be a valid positive number.`);
        }
        if (!ing.unit || typeof ing.unit !== 'string' || ing.unit.trim() === '') {
            res.status(400);
            throw new new Error(`Unit for "${ing.name}" is required and cannot be empty. For items like 'onion', use units like 'whole', 'medium', or 'large'.`);
        }
        // *** MODIFICATION END ***

        validatedIngredientsForAI.push({ // Use the validated canonical name for AI
            name: ingredientDBEntry.name, 
            quantity: parsedQuantity, // Use the parsed number
            unit: ing.unit.trim() // Use the trimmed unit
        });
    }

    let aiGeneratedData;
    try {
        aiGeneratedData = await generateRecipe(
            cooker.name,
            validatedIngredientsForAI, // Pass validated and formatted ingredients
            cookingIntent,
            optionalTime
        );
    } catch (error) {
        // *** MODIFICATION START: Enhanced error handling ***
        console.error("Error from AI service during recipe generation:", error);
        res.status(500);
        // Include specific error message if available, otherwise a generic one
        throw new Error(`Failed to generate recipe from AI: ${error.message || 'Unknown AI service error.'}`);
        // *** MODIFICATION END ***
    }

    // Save the AI-generated recipe to our AIRecipe collection for temporary display/review
    // The AIRecipe.create call will now validate against the stricter aiRecipeIngredientSchema
    const aiRecipe = await AIRecipe.create({
        generated_by_user: req.user ? req.user._id : null, // Link to user if authenticated
        chef_iq_cooker: cooker._id,
        cooking_intent: cookingIntent,
        user_provided_ingredients: validatedIngredientsForAI, // These are already validated
        title: aiGeneratedData.title,
        description: aiGeneratedData.description,
        mainImage: aiGeneratedData.mainImage || '', // Ensure empty string if AI doesn't provide
        metadata: aiGeneratedData.metadata,
        ingredients: aiGeneratedData.ingredients, // This array will be validated by the schema
        steps: aiGeneratedData.steps,
        why_this_recipe: aiGeneratedData.whyThisRecipe,
        shopping_list_suggestions: aiGeneratedData.shoppingListSuggestions || [],
    });

    res.status(200).json(aiRecipe);
});

// @desc    Get an AI-generated recipe by its ID
// @route   GET /api/ai/recipes/:id
// @access  Public
const getAIRecipeById = asyncHandler(async (req, res) => {
    const aiRecipe = await AIRecipe.findById(req.params.id)
        .populate('chef_iq_cooker', 'name description capabilities'); // Populate cooker details

    if (!aiRecipe) {
        res.status(404);
        throw new Error('AI-generated recipe not found.');
    }

    res.status(200).json(aiRecipe);
});


// @desc    Allow a user to save an AI-generated recipe to their personal recipe collection
// @route   POST /api/ai/recipes/:id/save
// @access  Private (requires authentication using `protect` middleware)
const saveAIRecipeToUserCollection = asyncHandler(async (req, res) => {
    const aiRecipeId = req.params.id;
    const userId = req.user._id; // Authenticated user ID from `protect` middleware

    const aiRecipe = await AIRecipe.findById(aiRecipeId);
    if (!aiRecipe) {
        res.status(404);
        throw new Error('AI-generated recipe not found.');
    }

    // Convert AIRecipe data to fit the existing `Recipe` model schema
    // Since AIRecipeIngredientSchema now aligns with RecipeIngredientSchema,
    // the .map(ing => ing.toObject()) should work directly for ingredients.
    const newRecipeData = {
        user: userId, // Set the owner of this new recipe
        title: aiRecipe.title,
        description: aiRecipe.description,
        // Clone metadata and add AI flags
        metadata: {
            ...aiRecipe.metadata.toObject(), // Convert mongoose subdocument to plain object
            aiGenerated: true, // Custom flag to mark it as AI-generated
            aiSourceId: aiRecipe._id.toString(), // Store the ID of the original AIRecipe
        },
        ingredients: aiRecipe.ingredients.map(ing => ing.toObject()), // Convert subdocuments
        steps: aiRecipe.steps.map(step => step.toObject()), // Convert subdocuments
        status: 'published', // Assume saved recipes are published by default
        privacy: 'private', // Default to private; user can change this later
        mainImage: aiRecipe.mainImage || '', // Use AI-provided (empty) or default
    };

    // Ensure steps have sequential stepNumbers, as expected by the existing Recipe model/logic
    if (newRecipeData.steps && newRecipeData.steps.length > 0) {
        newRecipeData.steps.forEach((step, index) => {
            step.stepNumber = index + 1;
        });
    }

    // Create a new entry in the existing `Recipe` collection
    const savedUserRecipe = await Recipe.create(newRecipeData);

    res.status(201).json({ 
        message: 'AI recipe successfully saved to your personal collection!', 
        recipe: savedUserRecipe 
    });
});


// @desc    Submit feedback for an AI-generated recipe
// @route   POST /api/ai/recipes/:id/feedback
// @access  Public (Can be protected if only authenticated users can give feedback)
const submitAIRecipeFeedback = asyncHandler(async (req, res) => {
    const aiRecipeId = req.params.id;
    const { rating, comments } = req.body; // Rating is expected (e.g., 1-5 or 0/1)

    if (rating === undefined || rating === null || (rating < 0 || rating > 5)) { // Allow 0 for thumbs down
        res.status(400);
        throw new Error('A valid rating (e.g., 0-5) is required.');
    }

    const aiRecipe = await AIRecipe.findById(aiRecipeId);
    if (!aiRecipe) {
        res.status(404);
        throw new Error('AI-generated recipe not found.');
    }

    const feedback = await AIRecipeFeedback.create({
        ai_recipe: aiRecipeId,
        user: req.user ? req.user._id : null, // Link to user if authenticated
        rating,
        comments,
    });

    res.status(201).json({ message: 'Feedback submitted successfully.', feedback });
});


module.exports = {
    getChefIQCookers,
    validateAndSaveIngredient,
    generateAIRecipe,
    getAIRecipeById,
    saveAIRecipeToUserCollection,
    submitAIRecipeFeedback,
};