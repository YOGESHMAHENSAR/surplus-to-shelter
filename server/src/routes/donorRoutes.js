const express = require('express');
const router = express.Router();
const { estimateSurplusQuantity } = require('../controllers/donorController');
const upload = require('../middleware/uploadMiddleware');
const { protect } = require('../middleware/authMiddleware');

// POST /api/donations/estimate
router.post('/estimate', protect, upload.single('image'), estimateSurplusQuantity);

module.exports = router;