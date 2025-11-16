const mongoose = require('mongoose');

const ingredientSchema = mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true, // Ensure ingredient names are unique
            trim: true,
        },
        is_food: {
            type: Boolean,
            required: true,
        },
        last_validated_at: {
            type: Date,
            default: null, // Stores when AI last validated this ingredient
        },
    },
    {
        timestamps: true, // Adds createdAt and updatedAt fields
    }
);

module.exports = mongoose.model('Ingredient', ingredientSchema);