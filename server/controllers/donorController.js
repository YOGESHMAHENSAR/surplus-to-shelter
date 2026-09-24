const Donation = require('../models/Donation');

// @desc    Post new surplus food item (Phase 1)
// @route   POST /api/donations
// @access  Private (Donor)
const createDonation = async (req, res) => {
    try {
        const { itemName, quantity, unit, foodCategory, classificationMethod, latitude, longitude, address, expiryTime } = req.body;

        const photoUrl = req.file ? req.file.path : '';

        const donation = await Donation.create({
            donor: req.user.id, // Set via authMiddleware
            itemName,
            quantity,
            unit,
            foodCategory,
            photoUrl,
            classificationMethod,
            location: {
                type: 'Point',
                coordinates: [parseFloat(longitude), parseFloat(latitude)],
                address,
            },
            expiryTime,
        });

        // TODO: Trigger Event/Webhook for Phase 2 (Matching Engine) here

        res.status(201).json({ success: true, data: donation });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { createDonation };