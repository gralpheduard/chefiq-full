// controllers/recipeController.js
const asyncHandler = require('express-async-handler');
const Recipe = require('../models/Recipe');
const User = require('../models/User'); // Used for follower checks and saved recipes

// Helper function for common validation before creating/updating
const validateRecipeFields = (recipeData, isCreation = true) => {
    const { title, description, metadata, ingredients, steps, privacy, mainImage } = recipeData;

    // Basic validation for essential fields common to create/update
    if (!title || !description || !metadata || !ingredients || !steps || ingredients.length === 0 || steps.length === 0 || !privacy) {
        throw new Error('Please include all required recipe fields (title, description, metadata, at least one ingredient, at least one step, and privacy).');
    }

    // Additional validation for fields required for a "published" recipe
    // Assuming 'yield' is a critical metadata field for a complete recipe
    if (!metadata.yield) {
        throw new Error('Recipe metadata must include "yield" for saving/publishing.');
    }

    // Check for main image (now a requirement for any saved recipe)
    if (!mainImage) {
        throw new Error('A main image is required for this recipe.');
    }
};


// @desc    Create a new recipe
// @route   POST /api/recipes
// @access  Private
const createRecipe = asyncHandler(async (req, res) => {
    const { title, description, metadata, ingredients, steps, privacy, mainImage } = req.body;

    // Validate incoming data
    validateRecipeFields(req.body, true);

    // Ensure steps have sequential stepNumbers
    steps.forEach((step, index) => {
        step.stepNumber = index + 1;
    });

    const recipe = await Recipe.create({
        user: req.user._id,
        title,
        description,
        metadata,
        ingredients,
        steps,
        status: 'published', // <-- ALWAYS SET TO 'published'
        privacy,
        mainImage,
    });

    res.status(201).json(recipe);
});

// @desc    Get all recipes for the authenticated user
// @route   GET /api/recipes
// @access  Private
const getUserRecipes = asyncHandler(async (req, res) => {
    const recipes = await Recipe.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json(recipes);
});

// @desc    Get all public recipes from all users
// @route   GET /api/recipes/public
// @access  Public
const getPublicRecipes = asyncHandler(async (req, res) => {
    // No 'protect' middleware here, so anyone (even unauthenticated) can view public recipes.
    // However, if the frontend sends a token, `req.user` might be populated.
    const publicRecipes = await Recipe.find({ privacy: 'public', status: 'published' })
        .populate('user', 'name profileImage') // Populate the owner's name and profile image
        .sort({ createdAt: -1 }); // Most recent first
    res.status(200).json(publicRecipes);
});


// @desc    Get a single recipe by ID
// @route   GET /api/recipes/:id
// @access  Private (though accessible to public/followers/friends based on privacy)
const getRecipeById = asyncHandler(async (req, res) => {
    const recipe = await Recipe.findById(req.params.id)
        .populate('user', 'name followers profileImage') // Make sure 'followers' and 'profileImage' is populated for the user
        .populate('comments.user', 'name')
        .populate('comments.replies.user', 'name');
    
    if (!recipe) {
        res.status(404);
        throw new Error('Recipe not found');
    }

    // --- ADD THESE LOGS ---
    console.log('--- getRecipeById Debug Info ---');
    console.log('Requested Recipe ID:', req.params.id);
    console.log('Recipe Privacy:', recipe.privacy);
    console.log('Recipe Owner ID:', recipe.user._id.toString());
    console.log('Authenticated User ID (req.user?._id):', req.user ? req.user._id.toString() : 'NOT AUTHENTICATED OR REQ.USER MISSING');
    
    const currentUserId = req.user ? req.user._id.toString() : null;
    const recipeOwnerId = recipe.user._id.toString();
    const isOwner = currentUserId && recipeOwnerId === currentUserId;
    console.log('Is Owner:', isOwner);

    let isAuthorized = false;

    switch (recipe.privacy) {
        case 'public':
            isAuthorized = true;
            console.log('Privacy: Public, Authorized: true');
            break;
        case 'private':
            isAuthorized = isOwner;
            console.log('Privacy: Private, Authorized:', isAuthorized);
            break;
        case 'followers':
            const isFollower = currentUserId && recipe.user.followers && recipe.user.followers.some(
                (followerId) => followerId.toString() === currentUserId
            );
            isAuthorized = isOwner || isFollower;
            console.log('Privacy: Followers, Is Follower:', isFollower, 'Authorized:', isAuthorized);
            console.log('Recipe Owner Followers:', recipe.user.followers.map(f => f.toString())); // See who follows the owner
            break;
        case 'friends':
            // If you have a 'friends' relationship implemented, check it here
            // For now, if no friend logic, you might treat it like 'private' or adjust.
            isAuthorized = isOwner; // Your current implementation for 'friends'
            console.log('Privacy: Friends, Authorized:', isAuthorized);
            break;
        default:
            isAuthorized = false;
            console.log('Privacy: Unknown/Default, Authorized: false');
    }
    console.log('Final isAuthorized:', isAuthorized);
    // --- END ADDED LOGS ---

    if (!isAuthorized) {
        res.status(403);
        throw new Error('Not authorized to view this recipe');
    }

    // --- NEW LOGIC: Check if the current user has saved this recipe ---
    let isSaved = false;
    let hasLiked = false;
    if (currentUserId) {
        const currentUser = await User.findById(currentUserId).select('savedRecipes likes'); // Fetch user's saved recipes and likes
        if (currentUser) {
            isSaved = currentUser.savedRecipes.some(id => id.toString() === req.params.id.toString());
            hasLiked = recipe.likes.some(id => id.toString() === currentUserId.toString());
        }
    }
    // --- END NEW LOGIC ---

    res.status(200).json({
        ...recipe.toObject(), // Convert Mongoose document to plain object
        _isSaved: isSaved,
        _hasLiked: hasLiked // Also good to include like status here
    });
});
// @desc    Update a recipe
// @route   PUT /api/recipes/:id
// @access  Private
const updateRecipe = asyncHandler(async (req, res) => {
    const { title, description, metadata, ingredients, steps, privacy, mainImage } = req.body;

    const recipe = await Recipe.findById(req.params.id);

    if (!recipe) {
        res.status(404);
        throw new Error('Recipe not found');
    }

    // Ensure the authenticated user owns this recipe
    if (recipe.user.toString() !== req.user._id.toString()) {
        res.status(403); // Forbidden
        throw new Error('Not authorized to update this recipe');
    }

    // Prepare updated data for validation
    const updatedRecipeData = {
        title: title !== undefined ? title : recipe.title,
        description: description !== undefined ? description : recipe.description,
        metadata: metadata !== undefined ? metadata : recipe.metadata,
        ingredients: ingredients !== undefined ? ingredients : recipe.ingredients,
        steps: steps !== undefined ? steps : recipe.steps,
        privacy: privacy !== undefined ? privacy : recipe.privacy,
        mainImage: mainImage !== undefined ? mainImage : recipe.mainImage,
        status: 'published' // Ensure status remains published or is set to published
    };

    // Validate the updated data
    validateRecipeFields(updatedRecipeData, false); // isCreation = false

    // Apply updates to the recipe object
    recipe.title = updatedRecipeData.title;
    recipe.description = updatedRecipeData.description;
    recipe.metadata = updatedRecipeData.metadata;
    recipe.ingredients = updatedRecipeData.ingredients;
    recipe.steps = updatedRecipeData.steps;
    recipe.privacy = updatedRecipeData.privacy;
    recipe.mainImage = updatedRecipeData.mainImage;
    recipe.status = 'published'; // Explicitly keep or set to 'published' on update

    // Re-sequence step numbers
    if (recipe.steps && recipe.steps.length > 0) {
        recipe.steps.forEach((step, index) => {
            step.stepNumber = index + 1;
        });
    }

    const updatedRecipe = await recipe.save();
    res.status(200).json(updatedRecipe);
});

// @desc    Delete a recipe
// @route   DELETE /api/recipes/:id
// @access  Private
const deleteRecipe = asyncHandler(async (req, res) => {
    const recipe = await Recipe.findById(req.params.id);

    if (!recipe) {
        res.status(404);
        throw new Error('Recipe not found');
    }

    // Ensure the authenticated user owns this recipe
    if (recipe.user.toString() !== req.user._id.toString()) {
        res.status(403); // Forbidden
        throw new Error('Not authorized to delete this recipe');
    }

    await Recipe.deleteOne({ _id: req.params.id });
    res.status(200).json({ message: 'Recipe removed successfully' });
});

// --- NEW FUNCTIONALITY BELOW ---

// @desc    Toggle like on a recipe
// @route   PATCH /api/recipes/:id/like
// @access  Private
const toggleLikeRecipe = asyncHandler(async (req, res) => {
    const recipeId = req.params.id;
    const userId = req.user._id;

    const recipe = await Recipe.findById(recipeId);

    if (!recipe) {
        res.status(404);
        throw new Error('Recipe not found');
    }

    const likedIndex = recipe.likes.findIndex(
        (id) => id.toString() === userId.toString()
    );

    if (likedIndex > -1) {
        // User already liked, so unlike
        recipe.likes.splice(likedIndex, 1);
        await recipe.save();
        res.status(200).json({ message: 'Recipe unliked', likesCount: recipe.likes.length, isLiked: false });
    } else {
        // User hasn't liked, so like
        recipe.likes.push(userId);
        await recipe.save();
        res.status(200).json({ message: 'Recipe liked', likesCount: recipe.likes.length, isLiked: true });
    }
});

// @desc    Toggle saving a recipe to user's saved list
// @route   PATCH /api/recipes/:id/save
// @access  Private
const toggleSaveRecipe = asyncHandler(async (req, res) => {
    const recipeId = req.params.id;
    const userId = req.user._id;

    const user = await User.findById(userId);
    const recipe = await Recipe.findById(recipeId); // Ensure recipe exists

    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }
    if (!recipe) {
        res.status(404);
        throw new Error('Recipe not found');
    }

    const savedIndex = user.savedRecipes.findIndex(
        (id) => id.toString() === recipeId.toString()
    );

    if (savedIndex > -1) {
        // Recipe already saved, so unsave
        user.savedRecipes.splice(savedIndex, 1);
        await user.save();
        res.status(200).json({ message: 'Recipe unsaved', saved: false });
    } else {
        // Recipe not saved, so save
        user.savedRecipes.push(recipeId);
        await user.save();
        res.status(200).json({ message: 'Recipe saved', saved: true });
    }
});

// @desc    Get all comments for a recipe
// @route   GET /api/recipes/:id/comments
// @access  Public (or Private depending on recipe privacy)
const getRecipeComments = asyncHandler(async (req, res) => {
    const recipe = await Recipe.findById(req.params.id)
        .populate('comments.user', 'name')
        .populate('comments.replies.user', 'name');

    if (!recipe) {
        res.status(404);
        throw new Error('Recipe not found');
    }

    // The privacy check for the recipe itself should ideally be done before reaching this,
    // or repeated here if this route can be accessed independently of `getRecipeById`.
    // For simplicity, we assume if they can reach here, basic recipe view authorization passed.
    res.status(200).json(recipe.comments);
});


// @desc    Add a new comment to a recipe
// @route   POST /api/recipes/:id/comments
// @access  Private
const addComment = asyncHandler(async (req, res) => {
    const { text } = req.body;
    const recipeId = req.params.id;
    const userId = req.user._id;

    if (!text || text.trim() === '') {
        res.status(400);
        throw new Error('Comment text cannot be empty');
    }

    const recipe = await Recipe.findById(recipeId);

    if (!recipe) {
        res.status(404);
        throw new Error('Recipe not found');
    }

    const newComment = {
        user: userId,
        text,
        replies: [], // Initialize with an empty replies array
    };

    recipe.comments.push(newComment);
    await recipe.save();

    // To return the populated comment, we need to find it again or populate the last one added
    const savedRecipe = await Recipe.findById(recipeId)
        .populate('comments.user', 'name')
        .populate('comments.replies.user', 'name');

    const addedComment = savedRecipe.comments[savedRecipe.comments.length - 1];

    res.status(201).json(addedComment);
});

// @desc    Add a reply to a specific comment on a recipe
// @route   POST /api/recipes/:id/comments/:commentId/replies
// @access  Private
const addReplyToComment = asyncHandler(async (req, res) => {
    const { text } = req.body;
    const { id: recipeId, commentId } = req.params;
    const userId = req.user._id;

    if (!text || text.trim() === '') {
        res.status(400);
        throw new Error('Reply text cannot be empty');
    }

    const recipe = await Recipe.findById(recipeId);

    if (!recipe) {
        res.status(404);
        throw new Error('Recipe not found');
    }

    const comment = recipe.comments.id(commentId); // Mongoose helper to find subdocument by _id

    if (!comment) {
        res.status(404);
        throw new Error('Comment not found');
    }

    const newReply = {
        user: userId,
        text,
    };

    comment.replies.push(newReply);
    await recipe.save();

    // To return the populated reply, we need to find it again or populate the last one added
    const savedRecipe = await Recipe.findById(recipeId)
        .populate('comments.user', 'name')
        .populate('comments.replies.user', 'name');

    const updatedComment = savedRecipe.comments.id(commentId);
    const addedReply = updatedComment.replies[updatedComment.replies.length - 1];

    res.status(201).json(addedReply);
});

// @desc    Edit a comment or reply
// @route   PUT /api/recipes/:id/comments/:commentId
// @route   PUT /api/recipes/:id/comments/:commentId/replies/:replyId
// @access  Private
const editComment = asyncHandler(async (req, res) => {
    const { text } = req.body;
    const { id: recipeId, commentId, replyId } = req.params;
    const userId = req.user._id;

    if (!text || text.trim() === '') {
        res.status(400);
        throw new Error('Edited text cannot be empty');
    }

    const recipe = await Recipe.findById(recipeId);

    if (!recipe) {
        res.status(404);
        throw new Error('Recipe not found');
    }

    const comment = recipe.comments.id(commentId);
    if (!comment) {
        res.status(404);
        throw new Error('Comment not found');
    }

    let target;
    if (replyId) { // Editing a reply
        target = comment.replies.id(replyId);
        if (!target) {
            res.status(404);
            throw new Error('Reply not found');
        }
    } else { // Editing a top-level comment
        target = comment;
    }

    if (target.user.toString() !== userId.toString()) {
        res.status(403);
        throw new Error('Not authorized to edit this comment or reply');
    }

    target.text = text;
    target.updatedAt = Date.now(); // Manually update for nested schemas
    await recipe.save();

    // Re-fetch and populate for consistent response
    const updatedRecipe = await Recipe.findById(recipeId)
        .populate('comments.user', 'name')
        .populate('comments.replies.user', 'name');

    const updatedComment = updatedRecipe.comments.id(commentId);
    if (replyId) {
        res.status(200).json(updatedComment.replies.id(replyId));
    } else {
        res.status(200).json(updatedComment);
    }
});


// @desc    Delete a comment or reply
// @route   DELETE /api/recipes/:id/comments/:commentId
// @route   DELETE /api/recipes/:id/comments/:commentId/replies/:replyId
// @access  Private
const deleteComment = asyncHandler(async (req, res) => {
    const { id: recipeId, commentId, replyId } = req.params;
    const userId = req.user._id;

    const recipe = await Recipe.findById(recipeId);

    if (!recipe) {
        res.status(404);
        throw new Error('Recipe not found');
    }

    const comment = recipe.comments.id(commentId);
    if (!comment) {
        res.status(404);
        throw new Error('Comment not found');
    }

    let message;
    if (replyId) { // Deleting a reply
        const reply = comment.replies.id(replyId);
        if (!reply) {
            res.status(404);
            throw new Error('Reply not found');
        }
        if (reply.user.toString() !== userId.toString()) {
            res.status(403);
            throw new Error('Not authorized to delete this reply');
        }
        // Use pull to remove the subdocument
        comment.replies.pull({ _id: replyId });
        message = 'Reply removed successfully';
    } else { // Deleting a top-level comment
        if (comment.user.toString() !== userId.toString()) {
            res.status(403);
            throw new Error('Not authorized to delete this comment');
        }
        recipe.comments.pull({ _id: commentId });
        message = 'Comment removed successfully';
    }

    await recipe.save();
    res.status(200).json({ message });
});

const getSavedRecipesForCurrentUser = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const user = await User.findById(userId).populate({
        path: 'savedRecipes',
        // When populating savedRecipes, it's a good idea to also populate relevant
        // fields of the recipe itself, like 'likes' and the owner 'user' (for displaying)
        populate: [
            {
                path: 'user', // Populate the owner of each saved recipe
                select: 'name profileImage' // Select desired fields
            },
            {
                path: 'likes', // Populate the likes array within each saved recipe
                select: '_id' // We only need the IDs for checking if the current user liked it
            }
        ]
    });

    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    const savedRecipes = user.savedRecipes.map(recipe => {
        // Ensure recipe is converted to a plain JavaScript object
        const recipeObject = recipe.toObject();

        // Safely check if recipe.likes exists before calling .some()
        // Use optional chaining (?.) and nullish coalescing (??) for robustness
        const hasLiked = recipeObject.likes?.some(id => id.toString() === userId.toString()) ?? false;

        return {
            ...recipeObject, // Use the plain object
            _hasLiked: hasLiked,
            _isSaved: true // By definition, these recipes are saved by the current user
        };
    });

    res.status(200).json(savedRecipes);
});

const getLikedRecipesForCurrentUser = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const likedRecipes = await Recipe.find({ likes: userId })
        .populate('user', 'name profileImage'); // Populate owner for display

    // Optionally, you might want to also indicate if these liked recipes are also saved by the user
    // This requires another DB call, so decide if it's necessary for this specific endpoint.
    // For now, let's keep it simple and just return the liked recipes.

    res.status(200).json(likedRecipes);
});

// @desc    Search for recipes by title, description, ingredients, or tags
// @route   GET /api/recipes/search
// @access  Public (can also include private logic if user is authenticated)
const searchRecipes = asyncHandler(async (req, res) => {
    const query = req.query.q; // Get the search query from the URL parameter '?q='
    const currentUserId = req.user ? req.user._id : null; // User might be authenticated or not

    // If no query, return public recipes (or an empty array if preferred)
    if (!query || query.trim() === '') {
        const publicRecipes = await Recipe.find({ privacy: 'public', status: 'published' })
            .populate('user', 'name profileImage')
            .sort({ createdAt: -1 });

        // Manually add _isSaved and _hasLiked for authenticated users
        let finalPublicRecipes = publicRecipes;
        if (currentUserId) {
            const currentUserData = await User.findById(currentUserId).select('savedRecipes');
            const savedRecipeIds = currentUserData ? currentUserData.savedRecipes.map(id => id.toString()) : [];

            finalPublicRecipes = publicRecipes.map(recipe => {
                const recipeObj = recipe.toObject();
                return {
                    ...recipeObj,
                    _isSaved: savedRecipeIds.includes(recipeObj._id.toString()),
                    _hasLiked: recipeObj.likes.some(id => id.toString() === currentUserId.toString())
                };
            });
        }
        return res.status(200).json(finalPublicRecipes);
    }

    // Create a robust search query for Mongoose
    const searchRegex = new RegExp(query, 'i'); // Case-insensitive search

    // --- Start building the Mongoose find query filter ---
    let findQueryFilter = { status: 'published' }; // All search results must be published

    // Conditions for the actual search term (title, description, ingredients, tags)
    const searchOrConditions = [
        { title: searchRegex },
        { description: searchRegex },
        { 'ingredients.name': searchRegex },
        { 'metadata.tags': searchRegex }
    ];

    // Conditions for privacy (who can see the recipe)
    const privacyOrConditions = [{ privacy: 'public' }]; // Always include public recipes

    if (currentUserId) {
        // If authenticated, include their own private recipes
        privacyOrConditions.push({ user: currentUserId, privacy: 'private' });

        // Include recipes from users they follow (if privacy is 'followers')
        const currentUser = await User.findById(currentUserId).select('following');
        const followingIds = currentUser ? currentUser.following : [];
        if (followingIds.length > 0) {
            privacyOrConditions.push({ user: { $in: followingIds }, privacy: 'followers' });
        }
        // Add 'friends' logic here if you have a friend system beyond followers
        // e.g., privacyOrConditions.push({ user: { $in: friendsIds }, privacy: 'friends' });
    }

    // Combine search and privacy conditions using $and at the top level
    findQueryFilter.$and = [
        { $or: searchOrConditions },    // The actual search terms
        { $or: privacyOrConditions }    // Who is authorized to see these recipes
    ];

    // --- End building the Mongoose find query filter ---


    const recipes = await Recipe.find(findQueryFilter) // Use the correctly constructed filter
        .populate('user', 'name profileImage') // Populate recipe owner's info
        .sort({ createdAt: -1 }); // Sort by newest first

    // Manually add _isSaved and _hasLiked for authenticated users
    let finalRecipes = recipes;
    if (currentUserId) {
        const currentUserData = await User.findById(currentUserId).select('savedRecipes');
        const savedRecipeIds = currentUserData ? currentUserData.savedRecipes.map(id => id.toString()) : [];

        finalRecipes = recipes.map(recipe => {
            const recipeObj = recipe.toObject();
            return {
                ...recipeObj,
                _isSaved: savedRecipeIds.includes(recipeObj._id.toString()),
                _hasLiked: recipeObj.likes.some(id => id.toString() === currentUserId.toString())
            };
        });
    }

    res.status(200).json(finalRecipes);
});



module.exports = {
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
    searchRecipes, // <-- EXPORT THE NEW FUNCTION
};