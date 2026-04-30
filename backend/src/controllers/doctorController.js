const { Doctor } = require('../models');

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
