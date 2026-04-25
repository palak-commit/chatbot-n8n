const express = require('express');
const slotController = require('../controllers/slotController');

const router = express.Router();

router.post('/login', slotController.login);

module.exports = router;
