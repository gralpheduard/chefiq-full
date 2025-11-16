// C:\Users\Ralph Gannaban\Desktop\dev\sideline\chefiq\chef-iq-studio-backend\server.js

require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// Import auth, recipe, upload, user, and NEW ai routes
const authRoutes = require('./routes/authRoutes');
const recipeRoutes = require('./routes/recipeRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const userRoutes = require('./routes/userRoutes');
const aiRoutes = require('./routes/aiRoutes'); // <--- ADD THIS LINE

console.log('Type of userRoutes:', typeof userRoutes);
console.log('Is userRoutes an Express Router?', userRoutes && typeof userRoutes.stack === 'object');


const app = express();

// ------------------------------------------
// CORS Middleware
// ------------------------------------------
const corsOptions = {
    origin: 'http://localhost:4200',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    optionsSuccessStatus: 204
};
app.use(cors(corsOptions));

// Middleware to parse JSON bodies
app.use(express.json());

// ------------------------------------------
// MongoDB Connection
// ------------------------------------------
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};
connectDB();

// ------------------------------------------
// Basic Routes (for testing connection)
// ------------------------------------------
app.get('/', (req, res) => {
    res.send('CHEF iQ Studio Backend API is running...');
});

app.get('/api/status', (req, res) => {
    if (mongoose.connection.readyState === 1) {
        res.status(200).json({ message: 'Database connected successfully!', dbStatus: 'Connected' });
    } else {
        res.status(500).json({ message: 'Database not connected.', dbStatus: 'Disconnected' });
    }
});

// ------------------------------------------
// Use Routes
// ------------------------------------------
app.use('/api/auth', authRoutes);
app.use('/api/recipes', recipeRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/users', userRoutes);
app.use('/api/ai', aiRoutes); // <--- ADD THIS LINE

// ------------------------------------------
// Start the Server
// ------------------------------------------
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Visit http://localhost:${PORT}`);
});