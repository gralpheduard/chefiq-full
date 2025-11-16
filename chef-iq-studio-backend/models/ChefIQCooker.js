const mongoose = require('mongoose');

const chefIQCookerSchema = mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true, // Ensure cooker names are unique
            trim: true,
        },
        description: {
            type: String,
            required: false, // Optional description
        },
        capabilities: {
            type: [String], // Array of strings, e.g., ["pressure cook", "slow cook", "air fry"]
            default: [],
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('ChefIQCooker', chefIQCookerSchema);