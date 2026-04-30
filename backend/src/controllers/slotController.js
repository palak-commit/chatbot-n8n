const { Slot } = require('../models');

exports.getSlots = async (req, res) => {
    try {
        const { doctorId } = req.query;
        const where = {};
        if (doctorId) {
            where.doctorId = doctorId;
        }
        const slots = await Slot.findAll({
            where,
            order: [['date', 'ASC'], ['id', 'ASC']]
        });
        res.json(slots);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.addSlot = async (req, res) => {
    try {
        const { date, time, available = true, doctorId } = req.body;

        if (!time) {
            return res.status(400).json({ success: false, message: 'time is required' });
        }
        if (!date) {
            return res.status(400).json({ success: false, message: 'date is required' });
        }
        if (!doctorId) {
            return res.status(400).json({ success: false, message: 'doctorId is required' });
        }

        const existingSlot = await Slot.findOne({ where: { date, time, doctorId } });
        if (existingSlot) {
            return res.status(409).json({ success: false, message: 'Slot already exists for this date & time' });
        }

        const slot = await Slot.create({ date, time, available, doctorId });
        res.status(201).json({ success: true, slot });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateSlot = async (req, res) => {
    try {
        const { date, time, available, doctorId } = req.body;

        if (!doctorId) {
            return res.status(400).json({ success: false, message: 'doctorId is required' });
        }

        const existingSlot = await Slot.findOne({ where: { date, time, doctorId } });
        if (existingSlot) {
            await existingSlot.update({ available });
        } else {
            await Slot.create({ date, time, available, doctorId });
        }

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
