// C:\Users\Ralph Gannaban\Desktop\dev\sideline\chefiq\chef-iq-studio-backend\models\AIRecipe.js
const mongoose = require('mongoose');

// Sub-schema for ingredients within an AI recipe
const aiRecipeIngredientSchema = mongoose.Schema({
    name: { type: String, required: true },
    // *** MODIFICATION START ***
    quantity: { 
        type: Number, 
        required: true, 
        min: 0, // Quantity should be a number, minimum 0
    }, 
    unit: { 
        type: String, 
        required: true, 
        trim: true, // Unit should be a non-empty string like "cup", "kg", "whole", "large"
    },    
    // *** MODIFICATION END ***
});

// Sub-schema for steps within an AI recipe
const aiRecipeStepSchema = mongoose.Schema({
    stepNumber: { type: Number, required: true },
    description: { type: String, required: true },
});

// Sub-schema for metadata (similar to existing Recipe model, for easier conversion)
const aiRecipeMetadataSchema = mongoose.Schema({
    prepTime: { type: String, default: 'N/A' }, // e.g., "15 minutes"
    cookTime: { type: String, default: 'N/A' }, // e.g., "30 minutes"
    yield: { type: String, default: 'N/A' },    // e.g., "4 servings"
    difficulty: { type: String, default: 'Easy' }, // e.g., "Easy", "Medium", "Hard"
    cuisine: { type: String, default: 'General' }, // e.g., "Italian", "Mexican"
    tags: { type: [String], default: [] }, // e.g., ["healthy", "quick", "one-pot"]
});

const aiRecipeSchema = mongoose.Schema(
    {
        generated_by_user: { // The user who initiated the AI generation (if authenticated)
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: false,
        },
        chef_iq_cooker: { // Which Chef iQ cooker was specified for the recipe
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ChefIQCooker',
            required: true,
        },
        cooking_intent: { // "Only These Ingredients" or "Including These Ingredients"
            type: String,
            required: true,
            enum: ['Only These Ingredients', 'Including These Ingredients'],
        },
        user_provided_ingredients: [aiRecipeIngredientSchema], // The *original* ingredients given by the user

        // Recipe details (structured to be easily convertible to the main Recipe model)
        title: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            required: true,
        },
        mainImage: { // Will be an empty string, as no image generation is required
            type: String,
            default: '',
        },
        metadata: aiRecipeMetadataSchema,
        ingredients: [aiRecipeIngredientSchema], // The *full* list of ingredients for the generated recipe
        steps: [aiRecipeStepSchema], // The full list of steps
        why_this_recipe: { // AI's explanation for its choices
            type: String,
            required: false,
        },
        shopping_list_suggestions: { // Additional ingredients suggested by AI for "Including These" intent
            type: [aiRecipeIngredientSchema],
            default: [],
        },
    },
    {
        timestamps: true, // createdAt (generation time) and updatedAt
    }
);

module.exports = mongoose.model('AIRecipe', aiRecipeSchema);