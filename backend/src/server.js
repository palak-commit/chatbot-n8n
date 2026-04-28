require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const routes = require('./routes');
const { syncAndSeed } = require('./models');

const app = express();
const PORT = Number(process.env.PORT || 3000);
let dbInitPromise = null;

app.use(
    cors({
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    })
);
app.use(bodyParser.json());

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

app.get('/test', (req, res) => {
    res.json({ message: 'Test endpoint working' });
});

function ensureDatabaseInitialized() {
    if (!dbInitPromise) {
        dbInitPromise = syncAndSeed()
            .then(() => {
                console.log('[DB] Database initialized successfully');
            })
            .catch((error) => {
                console.error('[DB] Database initialization failed:', error.message);
                dbInitPromise = null;
                throw error;
            });
    }

    return dbInitPromise;
}

app.use('/api', async (req, res, next) => {
    try {
        await ensureDatabaseInitialized();
        next();
    } catch {
        res.status(500).json({ error: 'Database initialization failed' });
    }
});

app.use('/api', routes);

// Warm-up on cold start to reduce first API latency.
ensureDatabaseInitialized().catch(() => {});

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Backend running on http://localhost:${PORT}`);
    });
}

module.exports = app;
