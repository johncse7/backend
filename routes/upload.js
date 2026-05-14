const express = require('express');
const router = express.Router();
const multer = require('multer');
const { storage } = require('../config/cloudinary');
const { protect } = require('../middleware/authMiddleware');

const upload = multer({ storage });

// @desc    Upload image to Cloudinary
// @route   POST /api/upload
// @access  Private
router.post('/', protect, (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      console.error('Multer/Cloudinary Error:', err);
      return res.status(500).json({ message: err.message || 'Upload failed during processing' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    res.json({
      secure_url: req.file.path,
      public_id: req.file.filename
    });
  });
});

module.exports = router;
