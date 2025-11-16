// C:\Users\Ralph Gannaban\Desktop\dev\sideline\chefiq\chef-iq-studio-backend\routes\userRoutes.js
const express = require('express');
const {
    getUserProfile,
    toggleFollowUser,
    getUserFollowing,
    getUserFollowers,
    searchUsers,
    getTopFollowedUsers,
    getRecipesForUser,
    updateUserProfileImage,
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
// CORRECTED IMPORT: Ensure 'createProcessAndUploadMiddleware' is imported by its correct name
const { upload, createProcessAndUploadMiddleware } = require('../controllers/uploadController');

const router = express.Router();

// NEW: Get users sorted by most followers (MORE SPECIFIC, place first)
router.get('/top-followed', protect, getTopFollowedUsers);

// NEW: Search users by query (MORE SPECIFIC, place before generic :id)
router.get('/search', protect, searchUsers);

// @route   PUT /api/users/profile/image
// @desc    Update user's profile image
// @access  Private
router.put(
    '/profile/image',
    protect,
    upload.single('image'),
    createProcessAndUploadMiddleware('chef-iq-profile-images'), // Use the factory function
    updateUserProfileImage
);

// Toggle follow/unfollow for a specific user
router.patch('/:id/follow', protect, toggleFollowUser);

// Get lists for any specific user (could be public or require authorization)
router.get('/:id/following', getUserFollowing);
router.get('/:id/followers', getUserFollowers);

// NEW: Get recipes for a specific user, filtered by privacy
router.get('/:id/recipes', protect, getRecipesForUser);

// Get a specific user's public profile (MOST GENERAL, place last)
// This route should be after all other routes that use fixed strings as part of their path,
// to prevent them from being mistaken for an ':id'.
router.get('/:id', protect, getUserProfile); // Profile info is sensitive enough to warrant authentication.

module.exports = router;