const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware'); // Import the existing authentication middleware

const {
    getChefIQCookers,
    validateAndSaveIngredient,
    generateAIRecipe,
    getAIRecipeById,
    saveAIRecipeToUserCollection,
    submitAIRecipeFeedback,
} = require('../controllers/aiController');

// @route   GET /api/ai/cookers
// @desc    Get all available Chef iQ cookers
// @access  Public
router.get('/cookers', getChefIQCookers);

// @route   POST /api/ai/ingredients/validate
// @desc    Validate an ingredient as food (DB first, then AI, then save to DB)
// @access  Public (or protected if needed)
router.post('/ingredients/validate', validateAndSaveIngredient);

// @route   POST /api/ai/recipes/generate
// @desc    Generate a new AI recipe
// @access  Public (or protected if needed)
router.post('/recipes/generate', generateAIRecipe);

// @route   GET /api/ai/recipes/:id
// @desc    Get a specific AI-generated recipe
// @access  Public
router.get('/recipes/:id', getAIRecipeById);

// @route   POST /api/ai/recipes/:id/save
// @desc    Save an AI-generated recipe to the authenticated user's personal recipe collection
// @access  Private (requires JWT authentication)
router.post('/recipes/:id/save', protect, saveAIRecipeToUserCollection);

// @route   POST /api/ai/recipes/:id/feedback
// @desc    Submit feedback for a specific AI-generated recipe
// @access  Public (or protected if needed)
router.post('/recipes/:id/feedback', submitAIRecipeFeedback);

module.exports = router;