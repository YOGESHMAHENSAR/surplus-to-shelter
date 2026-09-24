const express = require('express');
const router = express.Router();
const { createDonation } = require('../controllers/donorController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.post('/', protect, upload.single('photo'), createDonation);

module.exports = router;