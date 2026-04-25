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

app.get('/', (req, res) => {
    res.json({
        success: true,
        service: 'chatbot-backend',
        status: 'running',
        timestamp: new Date().toISOString(),
    });
});

app.use('/api', routes);

async function startServer() {
    try {
        await syncAndSeed();
        app.listen(PORT, () => {
            console.log(`Backend running on http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error.message);
        process.exit(1);
    }
}

startServer();
