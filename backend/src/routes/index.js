const express = require('express');
const authRoutes = require('./auth.routes');
const slotRoutes = require('./slot.routes');
const doctorRoutes = require('./doctor.routes');
const chatRoutes = require('./chat.routes');
const appointmentRoutes = require('./appointment.routes');

const router = express.Router();

router.use('/', authRoutes);
router.use('/slots', slotRoutes);
router.use('/doctor', doctorRoutes);
router.use('/chat', chatRoutes);
router.use('/appointments', appointmentRoutes);

module.exports = router;
