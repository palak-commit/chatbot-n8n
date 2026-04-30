const express = require('express');
const slotController = require('../controllers/slotcontroller');

const router = express.Router();

router.get('/', slotController.getSlots);
router.post('/', slotController.addSlot);
router.put('/', slotController.updateSlot);

module.exports = router;
