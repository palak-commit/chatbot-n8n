require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const routes = require('./routes');
const { syncAndSeed } = require('./models');
const vectorService = require('./services/vector.service');
const reminderService = require('./services/reminder.service');

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

async function ensureDatabaseInitialized() {
    if (!dbInitPromise) {
        dbInitPromise = Promise.all([
            syncAndSeed(),
            vectorService.initializeVectorStore()
        ])
            .then(() => {
                console.log('[Init] Database and Vector Store initialized successfully');
                reminderService.startReminderCron();
            })
            .catch((error) => {
                console.error('[Init] Initialization failed:', error.message);
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
