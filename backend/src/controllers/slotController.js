const { Slot, Doctor } = require('../models');

exports.getSlots = async (req, res) => {
    try {
        const slots = await Slot.findAll({ order: [['id', 'ASC']] });
        res.json(slots);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.addSlot = async (req, res) => {
    try {
        const { date, time, available = true } = req.body;

        if (!time) {
            return res.status(400).json({ success: false, message: 'time is required' });
        }
        if (!date) {
            return res.status(400).json({ success: false, message: 'date is required' });
        }

        const existingSlot = await Slot.findOne({ where: { date, time } });
        if (existingSlot) {
            return res.status(409).json({ success: false, message: 'Slot already exists for this date & time' });
        }

        const slot = await Slot.create({ date, time, available });
        res.status(201).json({ success: true, slot });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateSlot = async (req, res) => {
    try {
        const { time, available } = req.body;

        const existingSlot = await Slot.findOne({ where: { time } });
        if (existingSlot) {
            await existingSlot.update({ available });
        } else {
            await Slot.create({ time, available });
        }

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getDoctor = async (req, res) => {
    try {
        const doctor = await Doctor.findOne({
            order: [['id', 'ASC']],
            attributes: ['id', 'name', 'specialization'],
        });
        if (!doctor) {
            return res.status(404).json({ success: false, message: 'Doctor not found' });
        }
        res.json(doctor);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;
        const doctor = await Doctor.findOne({ where: { username, password } });

        if (doctor) {
            res.json({ success: true, token: 'fake-jwt-token', doctorId: doctor.id });
        } else {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
