const express = require('express');
const slotController = require('../controllers/slotController');

const router = express.Router();

router.get('/', slotController.getDoctor);

module.exports = router;
