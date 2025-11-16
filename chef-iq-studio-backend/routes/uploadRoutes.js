// routes/uploadRoutes.js
const express = require('express');
const { protect } = require('../middleware/authMiddleware');
// CORRECTED IMPORT: Ensure 'createProcessAndUploadMiddleware' is imported by its correct name
const { upload, createProcessAndUploadMiddleware, uploadImage } = require('../controllers/uploadController');

const router = express.Router();

// @route   POST /api/upload
// @desc    Upload an image (generic, e.g., for recipes)
// @access  Private (requires authentication)
router.post(
    '/',
    protect,
    upload.single('image'),
    createProcessAndUploadMiddleware('chef-iq-recipe-images'), // Use the factory function for recipe images
    uploadImage
);

module.exports = router;