// C:\Users\Ralph Gannaban\Desktop\dev\sideline\chefiq\chef-iq-studio-backend\controllers\uploadController.js
const asyncHandler = require('express-async-handler');
const cloudinary = require('../config/cloudinaryConfig');
const multer = require('multer');
const sharp = require('sharp');
const { Readable } = require('stream');

// Configure multer to store files in memory
const storage = multer.memoryStorage();
const upload = multer({ storage: storage }); // Exported as a middleware

// Middleware factory to process, resize/optimize, and upload image to Cloudinary
// This function now accepts a folderName parameter and returns an actual middleware function.
const createProcessAndUploadMiddleware = (folderName) => asyncHandler(async (req, res, next) => {
    if (!req.file) {
        res.status(400);
        return next(new Error('No image file provided for upload.'));
    }

    console.log(`[UPLOAD_MIDDLEWARE] Original file received: ${req.file.originalname}`);
    console.log(`[UPLOAD_MIDDLEWARE] Original file size: ${req.file.buffer.length} bytes`);
    console.log(`[UPLOAD_MIDDLEWARE] Original file mimetype: ${req.file.mimetype}`);

    try {
        let processedImageBuffer = req.file.buffer;
        let outputFormat = 'webp'; // Default to webp for modern browsers and good compression
        let quality = 75; // Default quality for webp/jpeg/png

        // List of image mimetypes that Sharp can process
        const supportedImageMimetypes = [
            'image/jpeg', 'image/png', 'image/gif', 'image/tiff',
            'image/webp', 'image/heif', 'image/avif', 'image/svg+xml' // Added SVG
        ];

        // Check if the mimetype is supported by sharp for processing
        if (!supportedImageMimetypes.includes(req.file.mimetype)) {
            console.warn(`[UPLOAD_MIDDLEWARE] Skipping sharp processing for unsupported mimetype: ${req.file.mimetype}. Uploading original file.`);
            // For unsupported types, try to extract format or use 'auto' for Cloudinary
            outputFormat = req.file.mimetype.split('/')[1] || 'auto';
        } else {
            const image = sharp(req.file.buffer);
            const metadata = await image.metadata();

            console.log(`[UPLOAD_MIDDLEWARE] Sharp detected original format: ${metadata.format}, width: ${metadata.width}, height: ${metadata.height}`);

            // Keep original format for GIF and SVG as sharp's conversion might be lossy or undesired
            if (metadata.format === 'gif' || metadata.format === 'svg') {
                outputFormat = metadata.format;
                console.log(`[UPLOAD_MIDDLEWARE] Keeping original format ${outputFormat} for special type.`);
            } else {
                // Otherwise, convert to webp by default for better performance
                outputFormat = 'webp';
                console.log(`[UPLOAD_MIDDLEWARE] Converting to ${outputFormat} with quality ${quality}.`);
            }

            let sharpProcessing = image;

            // Resize if dimensions exceed 1920x1920, maintaining aspect ratio and not enlarging
            if (metadata.width > 1920 || metadata.height > 1920) {
                sharpProcessing = sharpProcessing.resize({
                    width: 1920,
                    height: 1920,
                    fit: sharp.fit.inside,
                    withoutEnlargement: true
                });
                console.log(`[UPLOAD_MIDDLEWARE] Resizing image to max 1920x1920.`);
            }

            // Apply format-specific quality/compression settings
            if (outputFormat === 'webp') {
                sharpProcessing = sharpProcessing.webp({ quality: quality, effort: 6 });
            } else if (outputFormat === 'jpeg' || outputFormat === 'jpg') {
                sharpProcessing = sharpProcessing.jpeg({ quality: quality, mozjpeg: true });
            } else if (outputFormat === 'png') {
                sharpProcessing = sharpPrcocessing.png({ quality: quality, compressionLevel: 9 });
            }
            // If outputFormat is gif or svg, no specific sharp processing for format conversion/quality is applied here

            processedImageBuffer = await sharpProcessing.toBuffer();
            console.log(`[UPLOAD_MIDDLEWARE] Processed file size: ${processedImageBuffer.length} bytes`);
        }

        const readableStream = Readable.from(processedImageBuffer);

        const result = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: folderName, // Dynamic folder name now!
                    resource_type: 'image',
                    format: outputFormat,
                },
                (error, result) => {
                    if (error) {
                        console.error('[CLOUD_UPLOAD_STREAM_ERROR]', error);
                        reject(error);
                    } else {
                        resolve(result);
                    }
                }
            );
            readableStream.pipe(uploadStream);
        });

        req.cloudinaryResult = { secure_url: result.secure_url }; // Attach result to req object
        console.log(`[UPLOAD_MIDDLEWARE] Image uploaded to Cloudinary: ${result.secure_url}`);
        next(); // Call next middleware/controller

    } catch (error) {
        console.error('Image processing or Cloudinary upload error:', error);
        res.status(500);
        next(new Error(`Image processing or upload failed: ${error.message}`));
    }
});

// Original uploadImage handler - now utilizes the new middleware
const uploadImage = asyncHandler(async (req, res) => {
    // If createProcessAndUploadMiddleware was successful, req.cloudinaryResult will exist
    if (req.cloudinaryResult && req.cloudinaryResult.secure_url) {
        res.status(200).json({
            message: 'Image uploaded successfully',
            imageUrl: req.cloudinaryResult.secure_url,
        });
    } else {
        res.status(500).json({ message: 'Image upload failed due to an unknown error (middleware did not provide URL).' });
    }
});


module.exports = {
    upload, // Multer middleware
    createProcessAndUploadMiddleware, // EXPORTED HERE!
    uploadImage, // Original endpoint controller
};