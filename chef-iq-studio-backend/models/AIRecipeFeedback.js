const mongoose = require('mongoose');

const aiRecipeFeedbackSchema = mongoose.Schema(
    {
        ai_recipe: { // Links to the AI-generated recipe that was rated
            type: mongoose.Schema.Types.ObjectId,
            ref: 'AIRecipe',
            required: true,
        },
        user: { // The user providing feedback (if authenticated)
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: false,
        },
        rating: { // e.g., 1 (bad) to 5 (excellent), or 0/1 for thumbs up/down
            type: Number,
            required: true,
            min: 0, 
            max: 5, 
        },
        comments: { // Optional text comments
            type: String,
            required: false,
            trim: true,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('AIRecipeFeedback', aiRecipeFeedbackSchema);