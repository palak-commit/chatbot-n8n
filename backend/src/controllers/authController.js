const { Doctor } = require('../models');

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
