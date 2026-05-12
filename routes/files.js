const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const File = require('../models/File');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

// Multer Config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const filetypes = /pdf|ppt|pptx|doc|docx|jpg|jpeg|png|zip/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    if (extname) {
      return cb(null, true);
    } else {
      cb('Error: File type not supported!');
    }
  }
});

// @desc    Upload a file
// @route   POST /api/files/upload
// @access  Private/Faculty & Admin
router.post('/upload', protect, authorize('faculty', 'admin'), upload.single('file'), async (req, res) => {
  const { title, course, semester, description, category } = req.body;

  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  try {
    const file = await File.create({
      title,
      fileName: req.file.filename,
      filePath: req.file.path,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      course,
      semester,
      uploadedBy: req.user._id,
      description,
      category: category || 'Other'
    });

    res.status(201).json(file);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get all files with filtering
// @route   GET /api/files
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { course, semester, category, search } = req.query;
    let query = {};
    if (course) query.course = course;
    if (semester) query.semester = semester;
    if (category) query.category = category;
    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }

    const files = await File.find(query)
      .populate('course', 'title code')
      .populate('uploadedBy', 'name');
    res.json(files);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Download file
// @route   GET /api/files/download/:id
// @access  Private
router.get('/download/:id', protect, async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file) return res.status(404).json({ message: 'File not found' });

    const filePath = path.join(__dirname, '..', file.filePath);
    res.download(filePath, file.fileName);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Delete file
// @route   DELETE /api/files/:id
// @access  Private/Faculty & Admin
router.delete('/:id', protect, authorize('faculty', 'admin'), async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file) return res.status(404).json({ message: 'File not found' });

    // Only uploader or admin can delete
    if (file.uploadedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this file' });
    }

    // Delete from filesystem
    const filePath = path.join(__dirname, '..', file.filePath);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await file.deleteOne();
    res.json({ message: 'File removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
