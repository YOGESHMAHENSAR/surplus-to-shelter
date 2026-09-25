const fs = require('fs');
const path = require('path');
const { runSegmentDensityModel } = require('./services/aiService');

// @desc    Estimate food volume and mass from image
// @route   POST /api/donations/estimate
// @access  Private (Donor)
exports.estimateSurplusQuantity = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Please upload an image' });
        }

        const imagePath = path.resolve(req.file.path);
        const { scale_cm_per_px, height_cm, density_g_cm3 } = req.body;

        // Execute AI Service
        const estimation = await runSegmentDensityModel(
            imagePath,
            scale_cm_per_px || 0.05,
            height_cm || 10.0,
            density_g_cm3 || 1.0
        );

        // Remove temporary uploaded image after process completes
        if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
        }

        return res.status(200).json({
            success: true,
            data: estimation
        });

    } catch (error) {
        // Clean up file if error occurs
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        next(error);
    }
};