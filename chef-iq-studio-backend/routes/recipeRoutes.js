const express = require('express');
const {
    createRecipe,
    getUserRecipes,
    getPublicRecipes,
    getRecipeById,
    updateRecipe,
    deleteRecipe,
    toggleLikeRecipe,
    toggleSaveRecipe,
    getSavedRecipesForCurrentUser,
    getLikedRecipesForCurrentUser,
    getRecipeComments,
    addComment,
    addReplyToComment,
    editComment,
    deleteComment,
    searchRecipes, // <-- IMPORT THE NEW FUNCTION
} = require('../controllers/recipeController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// === IMPORTANT: Place specific static routes BEFORE general parameterized routes ===

// 1. Routes for the collection (no ID)
router.route('/')
    .post(protect, createRecipe)
    .get(protect, getUserRecipes);

// 2. Specific static routes (like "/public", "/search", "/saved", "/liked")
// The order here matters: more specific routes should come before less specific ones.
router.get('/public', getPublicRecipes);
router.get('/search', searchRecipes); // <-- NEW: Add the search route here
router.get('/saved', protect, getSavedRecipesForCurrentUser);
router.get('/liked', protect, getLikedRecipesForCurrentUser);


// 3. Dynamic routes with an ID parameter (should come *after* all static path segments)
router.route('/:id')
    .get(getRecipeById) // <-- IMPORTANT: Removed 'protect' here to allow public/follower access handled in controller
    .put(protect, updateRecipe)
    .delete(protect, deleteRecipe);

// 4. Other routes that also use an :id parameter
router.patch('/:id/like', protect, toggleLikeRecipe);
router.patch('/:id/save', protect, toggleSaveRecipe);


// Comment routes (these are fine as they are more specific than a bare :id)
router.route('/:id/comments')
    .get(getRecipeComments) // Removed protect as comments can be public/follower-viewable
    .post(protect, addComment);

router.route('/:id/comments/:commentId')
    .put(protect, editComment)
    .delete(protect, deleteComment);

router.route('/:id/comments/:commentId/replies')
    .post(protect, addReplyToComment);

router.route('/:id/comments/:commentId/replies/:replyId')
    .put(protect, editComment)
    .delete(protect, deleteComment);

module.exports = router;