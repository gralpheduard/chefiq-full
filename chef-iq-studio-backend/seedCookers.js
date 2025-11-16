require('dotenv').config(); // Load environment variables
const mongoose = require('mongoose');
const ChefIQCooker = require('./models/ChefIQCooker'); // Path to your ChefIQCooker model

const cookersToSeed = [
    {
        name: "iQ Cooker",
        description: "A smart multi-cooker with various functions and a built-in scale for precision cooking. Features pressure cook, slow cook, sauté, steam, and more.",
        capabilities: ["pressure cook", "slow cook", "sauté", "steam", "keep warm", "sous vide", "weigh"],
    },
    {
        name: "iQ MiniOven",
        description: "A versatile countertop oven with air frying capabilities, perfect for baking, roasting, toasting, and dehydrating. Integrates with the Chef iQ App.",
        capabilities: ["air fry", "bake", "roast", "toast", "broil", "dehydrate"],
    },
    {
        name: "iQ Sense",
        description: "A wireless meat thermometer providing precise temperature control and remote monitoring via Wi-Fi and Bluetooth for perfect doneness every time.",
        capabilities: ["temperature monitoring", "remote alerts", "doneness tracking", "flip reminders", "rest timers"],
    }
];

const seedCookers = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected!');

        console.log('Clearing existing ChefIQCookers data...');
        await ChefIQCooker.deleteMany({}); // Clear existing data to prevent duplicates
        console.log('Existing ChefIQCookers data cleared.');

        console.log('Inserting new ChefIQCookers data...');
        await ChefIQCooker.insertMany(cookersToSeed);
        console.log('ChefIQCookers data successfully seeded!');

    } catch (error) {
        console.error('Error seeding ChefIQCookers data:', error);
    } finally {
        console.log('Disconnecting from MongoDB...');
        await mongoose.disconnect();
        console.log('MongoDB Disconnected.');
        process.exit(); // Exit the process
    }
};

seedCookers();