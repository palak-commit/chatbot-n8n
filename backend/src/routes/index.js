const express = require('express');
const authRoutes = require('./authRoutes');
const slotRoutes = require('./slotRoutes');
const doctorRoutes = require('./doctorRoutes');
const chatRoutes = require('./chatRoutes');
const appointmentRoutes = require('./appointmentRoutes');
const notificationRoutes = require('./notificationRoutes');

const router = express.Router();

router.use('/', authRoutes);
router.use('/slots', slotRoutes);
router.use('/doctor', doctorRoutes);
router.use('/chat', chatRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/notifications', notificationRoutes);

module.exports = router;
