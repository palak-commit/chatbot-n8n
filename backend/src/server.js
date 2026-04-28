require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const routes = require('./routes');
const { syncAndSeed } = require('./models');

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(cors());
app.use(bodyParser.json());

// Root route - should work without DB
app.get('/', (req, res) => {
    console.log('Root endpoint hit');
    res.json({
        success: true,
        message: 'Chatbot Backend API is working',
        service: 'chatbot-backend',
        status: 'running',
        timestamp: new Date().toISOString(),
    });
});

// Test route
app.get('/test', (req, res) => {
    res.json({ message: 'Test endpoint working' });
});

app.use('/api', routes);

async function initializeDatabase() {
    try {
        await syncAndSeed();
        console.log('[DB] Database initialized successfully');
    } catch (error) {
        console.error('[DB] Database initialization failed:', error.message);
    }
}

// Start database initialization (non-blocking for the app export)
initializeDatabase();

// Only listen if not running on Vercel
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Backend running on http://localhost:${PORT}`);
    });
}

module.exports = app;
