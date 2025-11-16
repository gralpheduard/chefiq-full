// C:\Users\Ralph Gannaban\Desktop\dev\sideline\chefiq\chef-iq-studio-backend\controllers\userController.js
const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const Recipe = require('../models/Recipe'); // <-- NEW: Import Recipe model

// @desc    Get a user's public profile (can be used for any user)
// @route   GET /api/users/:id
// @access  Public (you might add privacy checks later)
const getUserProfile = asyncHandler(async (req, res) => {
    const targetUserId = req.params.id;
    const currentUserId = req.user ? req.user._id : null; // Authenticated user ID

    // Find the target user and populate following/followers for counts
    const targetUser = await User.findById(targetUserId)
        .select('-password -email -savedRecipes -updatedAt -__v') // Exclude sensitive/unnecessary data
        .populate('following', '_id') // Only get IDs for count
        .populate('followers', '_id'); // Only get IDs for count

    if (!targetUser) {
        res.status(404);
        throw new Error('User not found');
    }

    // Get recipe count
    const recipeCount = await Recipe.countDocuments({ user: targetUserId });

    // Determine if the current user is following the target user
    const isFollowing = currentUserId ? targetUser.followers.some(id => id.toString() === currentUserId.toString()) : false;

    res.status(200).json({
        _id: targetUser._id,
        name: targetUser.name,
        profileImage: targetUser.profileImage,
        recipeCount: recipeCount,
        followingCount: targetUser.following.length,
        followersCount: targetUser.followers.length,
        isFollowing: isFollowing // Indicate if current user is following this profile owner
    });
});

// @desc    Toggle follow/unfollow a user
// @route   PATCH /api/users/:id/follow
// @access  Private (only authenticated users can follow/unfollow)
const toggleFollowUser = asyncHandler(async (req, res) => {
    const targetUserId = req.params.id; // The user to follow/unfollow
    const currentUserId = req.user._id; // The authenticated user

    // Ensure a user cannot follow themselves
    if (targetUserId.toString() === currentUserId.toString()) {
        res.status(400);
        throw new Error('You cannot follow yourself');
    }

    const targetUser = await User.findById(targetUserId);
    const currentUser = await User.findById(currentUserId);

    if (!targetUser || !currentUser) {
        res.status(404);
        throw new Error('User not found');
    }

    const isCurrentlyFollowing = currentUser.following.includes(targetUserId);
    let message;
    let status;

    if (isCurrentlyFollowing) {
        // Unfollow
        currentUser.following.pull(targetUserId);
        targetUser.followers.pull(currentUserId);
        message = `Unfollowed ${targetUser.name}`;
        status = 'unfollowed';
    } else {
        // Follow
        currentUser.following.push(targetUserId);
        targetUser.followers.push(currentUserId);
        message = `Following ${targetUser.name}`;
        status = 'followed';
    }
    
    await currentUser.save();
    await targetUser.save();

    // Return the updated follower count of the TARGET user, and whether CURRENT user is following
    res.status(200).json({ 
        message, 
        status, 
        targetUserFollowersCount: targetUser.followers.length,
        isFollowing: !isCurrentlyFollowing // Invert the original state to reflect new status
    });
});

// @desc    Get users that a specific user is following
// @route   GET /api/users/:id/following
// @access  Public (you might add privacy checks later)
const getUserFollowing = asyncHandler(async (req, res) => {
    const userId = req.params.id;

    const user = await User.findById(userId).populate('following', 'name profileImage');

    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    res.status(200).json(user.following);
});

// @desc    Get users who are following a specific user
// @route   GET /api/users/:id/followers
// @access  Public (you might add privacy checks later)
const getUserFollowers = asyncHandler(async (req, res) => {
    const userId = req.params.id;

    const user = await User.findById(userId).populate('followers', 'name profileImage');

    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    res.status(200).json(user.followers);
});

// @desc    Search for users by name or email
// @route   GET /api/users/search
// @access  Private (as it uses protect middleware)
const searchUsers = asyncHandler(async (req, res) => {
    const { q } = req.query; // Get search query from URL
    const currentUserId = req.user ? req.user._id : null; // Authenticated user ID

    if (!q) {
        return res.status(400).json({ message: 'Search query "q" is required.' });
    }

    const searchRegex = new RegExp(q, 'i');

    let query = {
        $or: [
            { name: { $regex: searchRegex } },
            // Removed email search for public view to maintain some privacy, can re-add if needed
            // { email: { $regex: searchRegex } }
        ]
    };

    if (currentUserId) {
        query._id = { $ne: currentUserId };
    }

    // Fetch users and their actual follower count (requires populating/checking length)
    const users = await User.find(query)
        .select('_id name profileImage followers') // Select profileImage and actual followers array
        .sort({ followers: -1 });

    // For each found user, determine if the current user is following them
    const currentUserDoc = currentUserId ? await User.findById(currentUserId).select('following') : null;
    const currentUserFollowingIds = new Set(currentUserDoc ? currentUserDoc.following.map(id => id.toString()) : []);

    const usersWithFollowerCountAndFollowingStatus = users.map(user => ({
        _id: user._id,
        name: user.name,
        profileImage: user.profileImage,
        followersCount: user.followers.length,
        isFollowing: currentUserId ? currentUserFollowingIds.has(user._id.toString()) : false // Check if current user follows this user
    }));

    res.status(200).json(usersWithFollowerCountAndFollowingStatus);
});


// @desc    Get users sorted by follower count (most following first)
// @route   GET /api/users/top-followed
// @access  Private (as it uses protect middleware)
const getTopFollowedUsers = asyncHandler(async (req, res) => {
    const currentUserId = req.user ? req.user._id : null;

    let query = {};
    if (currentUserId) {
        query._id = { $ne: currentUserId };
    }

    const users = await User.find(query)
        .select('_id name profileImage followers') // Select profileImage and followers for count
        .sort({ followers: -1 })
        .limit(20);

    const currentUserDoc = currentUserId ? await User.findById(currentUserId).select('following') : null;
    const currentUserFollowingIds = new Set(currentUserDoc ? currentUserDoc.following.map(id => id.toString()) : []);

    const usersWithFollowerCountAndFollowingStatus = users.map(user => ({
        _id: user._id,
        name: user.name,
        profileImage: user.profileImage,
        followersCount: user.followers.length,
        isFollowing: currentUserId ? currentUserFollowingIds.has(user._id.toString()) : false
    }));

    res.status(200).json(usersWithFollowerCountAndFollowingStatus);
});

// @desc    Get recipes for a specific user, applying privacy rules
// @route   GET /api/users/:id/recipes
// @access  Private (requires authentication to determine viewer's relationship)
const getRecipesForUser = asyncHandler(async (req, res) => {
    const targetUserId = req.params.id; // The user whose recipes we want to fetch
    const currentUserId = req.user._id; // The authenticated user making the request

    const targetUser = await User.findById(targetUserId).select('followers following'); // Get target user's followers/following
    if (!targetUser) {
        res.status(404);
        throw new Error('User not found.');
    }

    const isOwner = targetUserId.toString() === currentUserId.toString();
    const isFollower = targetUser.followers.some(id => id.toString() === currentUserId.toString());
    const isFollowingTarget = targetUser.following.some(id => id.toString() === currentUserId.toString()); // If current user follows target
    const isMutualFriend = isFollower && isFollowingTarget; // Both follow each other

    // Initial query to get all recipes for the target user that are published
    let query = {
        user: targetUserId,
        status: 'published',
        $or: [] // Initialize $or for privacy conditions
    };

    // Always include public recipes
    query.$or.push({ privacy: 'public' });

    // Include private recipes if the viewer is the owner
    if (isOwner) {
        query.$or.push({ privacy: 'private' });
    }

    // Include followers-only recipes if the viewer is the owner or a follower
    if (isOwner || isFollower) {
        query.$or.push({ privacy: 'followers' });
    }

    // Include friends-only recipes if the viewer is the owner or a mutual friend
    // Assuming 'friends' means mutual following
    if (isOwner || isMutualFriend) {
        query.$or.push({ privacy: 'friends' });
    }

    // If no specific privacy access granted and not owner, ensure they don't see private/followers/friends
    if (query.$or.length === 0) { // This case should ideally not be hit if default public is always pushed
        // Fallback: If no conditions allow access, explicitly add public recipes only
        // This is a safety net; the above logic should populate $or correctly.
        query.$or.push({ privacy: 'public' });
    }

    const recipes = await Recipe.find(query)
        .populate('user', 'name profileImage') // Populate owner details
        .sort({ createdAt: -1 });

    // For frontend convenience, mark if the current user has liked/saved each recipe
    const currentUserDoc = await User.findById(currentUserId).select('savedRecipes following');
    const currentUserSavedRecipeIds = new Set(currentUserDoc.savedRecipes.map(r => r.toString()));
    
    const recipesWithInteractionStatus = recipes.map(recipe => ({
        ...recipe.toObject(), // Convert to plain object for modifications
        _hasLiked: recipe.likes.some(id => id.toString() === currentUserId.toString()),
        _isSaved: currentUserSavedRecipeIds.has(recipe._id.toString()),
    }));

    res.status(200).json(recipesWithInteractionStatus);
});
const updateUserProfileImage = asyncHandler(async (req, res) => {
    // req.cloudinaryResult.secure_url will be available from the processAndUploadToCloudinary middleware
    if (!req.cloudinaryResult || !req.cloudinaryResult.secure_url) {
        res.status(400);
        throw new Error('Image upload failed or URL not provided by middleware.');
    }

    const userId = req.user._id; // User ID from the protect middleware
    const imageUrl = req.cloudinaryResult.secure_url;

    const user = await User.findById(userId);

    if (user) {
        user.profileImage = imageUrl;
        await user.save();

        res.status(200).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            profileImage: user.profileImage, // Send back the new profile image URL
            message: 'Profile image updated successfully.',
        });
    } else {
        res.status(404);
        throw new Error('User not found.');
    }
});

module.exports = {
    getUserProfile,
    toggleFollowUser,
    getUserFollowing,
    getUserFollowers,
    searchUsers,
    getTopFollowedUsers,
    getRecipesForUser, // <-- NEW
    updateUserProfileImage
};