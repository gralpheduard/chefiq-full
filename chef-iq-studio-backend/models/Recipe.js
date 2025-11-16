const mongoose = require('mongoose');

// Sub-schema for Ingredients
const ingredientSchema = mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    quantity: {
        type: Number,
        required: true,
        min: 0,
    },
    unit: {
        type: String,
        required: true,
        trim: true,
    },
    notes: {
        type: String,
        trim: true,
        default: ''
    },
}, { _id: true });

// Sub-schema for Appliance Integration within a step
const applianceIntegrationSchema = mongoose.Schema({
    type: { // e.g., 'pressure_cook', 'saute', 'sous_vide', 'slow_cook'
        type: String,
        trim: true,
        default: ''
    },
    settings: {
        type: Map,
        of: mongoose.Schema.Types.Mixed,
        default: {}
    },
    notes: {
        type: String,
        trim: true,
        default: ''
    },
}, { _id: true });

// Sub-schema for Steps
const stepSchema = mongoose.Schema({
    stepNumber: {
        type: Number,
        required: true,
        min: 1,
    },
    description: {
        type: String,
        required: true,
        trim: true,
    },
    photoUrl: {
        type: String,
        default: '',
    },
    videoUrl: {
        type: String,
        default: '',
    },
    applianceIntegration: { // <-- CHANGED: This entire sub-document is now optional
        type: applianceIntegrationSchema,
        default: null, // No integration by default
    },
}, { _id: true });

// NEW: Sub-schema for replies
const replySchema = mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    text: {
        type: String,
        required: true,
        trim: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
}, { _id: true }); // Each reply needs its own ID

// NEW: Sub-schema for comments
const commentSchema = mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    text: {
        type: String,
        required: true,
        trim: true,
    },
    replies: [replySchema], // Array of replies within a comment
}, {
    timestamps: true, // Includes createdAt and updatedAt for the comment
    _id: true // Each comment needs its own ID
});

// Main Recipe Schema
const recipeSchema = mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            immutable: true,
        },
        title: {
            type: String,
            required: [true, 'Please add a recipe title'],
            trim: true,
            maxlength: [100, 'Title cannot be more than 100 characters'],
        },
        description: {
            type: String,
            required: [true, 'Please add a recipe description'],
            trim: true,
            maxlength: [1000, 'Description cannot be more than 1000 characters'],
        },
        mainImage: {
            type: String,
            default: '',
            trim: true,
        },
        metadata: {
            difficulty: {
                type: String,
                enum: ['Easy', 'Medium', 'Hard'],
                default: 'Medium',
            },
            yield: {
                type: String,
                required: [true, 'Please add a yield quantity'],
                trim: true,
            },
            prepTime: {
                type: Number,
                min: 0,
                default: 0,
            },
            cookTime: {
                type: Number,
                min: 0,
                default: 0,
            },
            tags: {
                type: [String],
                default: [],
                set: (v) => Array.from(new Set(v.map(tag => tag.toLowerCase().trim()))),
            },
        },
        ingredients: {
            type: [ingredientSchema],
            required: [true, 'Please add at least one ingredient'],
            validate: {
                validator: function(v) { return v && v.length > 0; },
                message: 'A recipe must have at least one ingredient'
            }
        },
        steps: {
            type: [stepSchema],
            required: [true, 'Please add at least one step'],
            validate: {
                validator: function(v) { return v && v.length > 0; },
                message: 'A recipe must have at least one step'
            }
        },
        // Likes field - an array of User IDs who liked the recipe
        likes: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
        ],
        // Comments field - an array of commentSchema objects
        comments: [commentSchema],
        status: {
            type: String,
            enum: ['draft', 'submitted', 'published', 'rejected'],
            default: 'draft',
        },
        privacy: {
            type: String,
            enum: ['public', 'friends', 'followers', 'private'], // <-- ADDED 'followers' here
            default: 'private',
            required: [true, 'Please set a privacy level for the recipe'],
        },
    },
    {
        timestamps: true,
    }
);

const Recipe = mongoose.model('Recipe', recipeSchema);

module.exports = Recipe;