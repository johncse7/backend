const express = require('express');
const router = express.Router();
const CourseContent = require('../models/CourseContent');
const Course = require('../models/Course');
const { courseStorage, cloudinary } = require('../config/cloudinary');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const multer = require('multer');

// Configure multer for cloudinary course storage
const upload = multer({ storage: courseStorage });

// @desc    Upload course content
// @route   POST /api/content/upload
// @access  Private/Faculty
router.post('/upload', protect, authorize('faculty', 'admin'), (req, res) => {
  upload.single('file')(req, res, async (err) => {
    if (err) {
      console.error('Multer/Cloudinary Error:', err);
      return res.status(500).json({ message: err.message || 'Upload failed during processing' });
    }

    try {
      const { courseId, title, description, fileType } = req.body;

      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      // Verify the course exists
      const course = await Course.findById(courseId);
      if (!course) {
        // Since we already uploaded the file to Cloudinary, we should delete it if validation fails
        await cloudinary.uploader.destroy(req.file.filename);
        return res.status(404).json({ message: 'Course not found' });
      }

      const content = await CourseContent.create({
        facultyId: req.user._id,
        courseId,
        title,
        description,
        fileType,
        fileUrl: req.file.path, // secure_url from cloudinary
        publicId: req.file.filename // public_id from cloudinary
      });

      res.status(201).json(content);
    } catch (error) {
      // Cleanup file if DB creation fails
      if (req.file && req.file.filename) {
        await cloudinary.uploader.destroy(req.file.filename);
      }
      res.status(500).json({ message: error.message });
    }
  });
});

// @desc    Get logged in faculty's uploads
// @route   GET /api/content/my-uploads
// @access  Private/Faculty
router.get('/my-uploads', protect, authorize('faculty', 'admin'), async (req, res) => {
  try {
    const { courseId, search } = req.query;
    let query = { facultyId: req.user._id };

    if (courseId) {
      query.courseId = courseId;
    }

    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }

    const contents = await CourseContent.find(query)
      .populate('courseId', 'title code')
      .sort({ uploadedAt: -1 });

    res.json(contents);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get all uploads (Admin only)
// @route   GET /api/content/all
// @access  Private/Admin
router.get('/all', protect, authorize('admin'), async (req, res) => {
  try {
    const contents = await CourseContent.find()
      .populate('facultyId', 'name email')
      .populate('courseId', 'title code')
      .sort({ uploadedAt: -1 });

    res.json(contents);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Update course content
// @route   PUT /api/content/:id
// @access  Private/Faculty
router.put('/:id', protect, authorize('faculty', 'admin'), async (req, res) => {
  try {
    const { title, description } = req.body;
    const content = await CourseContent.findOne({ _id: req.params.id, facultyId: req.user._id });

    if (!content) {
      return res.status(404).json({ message: 'Content not found or not authorized' });
    }

    content.title = title || content.title;
    content.description = description !== undefined ? description : content.description;

    const updatedContent = await content.save();
    res.json(updatedContent);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Delete course content
// @route   DELETE /api/content/:id
// @access  Private/Faculty
router.delete('/:id', protect, authorize('faculty', 'admin'), async (req, res) => {
  try {
    const content = await CourseContent.findOne({ _id: req.params.id, facultyId: req.user._id });

    if (!content) {
      return res.status(404).json({ message: 'Content not found or not authorized' });
    }

    // Delete file from Cloudinary
    if (content.publicId) {
      await cloudinary.uploader.destroy(content.publicId);
    }

    // Delete thumbnail if it exists and is a Cloudinary image
    // (If using predefined icons, this step is skipped. We'll skip for now).

    await content.deleteOne();
    res.json({ message: 'Content removed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
