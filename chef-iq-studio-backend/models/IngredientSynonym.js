const mongoose = require('mongoose');

const ingredientSynonymSchema = mongoose.Schema(
    {
        ingredient: { // Links to the canonical ingredient
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Ingredient',
            required: true,
        },
        synonym: {
            type: String,
            required: true,
            unique: true, // Each synonym itself should be unique
            trim: true,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('IngredientSynonym', ingredientSynonymSchema);