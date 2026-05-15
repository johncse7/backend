const express = require('express');
const router = express.Router();
const Course = require('../models/Course');
const { courseStorage, cloudinary } = require('../config/cloudinary');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const multer = require('multer');

const upload = multer({ storage: courseStorage });

const defaultSections = [
  'CIS', 'LP', 'Timetable', 'Lecture / Content', 'Unitwise Q Bank',
  'University Question Papers', 'Internal Test Question Papers',
  'Quality of Internal Question Paper', 'Sample Internal Answer Sheets',
  'Assignments / Class Test Questions', 'Sample Assignments',
  'Course Beyond Syllabus', 'Student Roll List', 'Course End Survey'
];

// @desc    Get all courses
// @route   GET /api/courses
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { department, semester } = req.query;
    let query = {};
    if (department) query.department = department;
    if (semester) query.semester = semester;

    const courses = await Course.find(query).populate('department', 'name code');
    res.json(courses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get courses assigned to logged in faculty
// @route   GET /api/courses/my-courses
// @access  Private/Faculty
router.get('/my-courses', protect, authorize('faculty', 'admin'), async (req, res) => {
  try {
    const courses = await Course.find({ faculty: req.user._id }).populate('department', 'name code');
    res.json(courses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get single course
// @route   GET /api/courses/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id).populate('department', 'name code').populate('faculty', 'name email');
    if (!course) return res.status(404).json({ message: 'Course not found' });
    res.json(course);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Create a course
// @route   POST /api/courses
// @access  Private/Admin
router.post('/', protect, authorize('admin'), async (req, res) => {
  const { title, code, department, semester, faculty } = req.body;

  try {
    const courseExists = await Course.findOne({ code });
    if (courseExists) {
      return res.status(400).json({ message: 'Course with this code already exists' });
    }

    const sections = defaultSections.map(sectionName => ({ sectionName }));

    const course = await Course.create({ title, code, department, semester, faculty, sections });
    res.status(201).json(course);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Update a course
// @route   PUT /api/courses/:id
// @access  Private/Admin
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const course = await Course.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!course) return res.status(404).json({ message: 'Course not found' });
    res.json(course);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Delete a course
// @route   DELETE /api/courses/:id
// @access  Private/Admin
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    
    // Optional: Delete all files in sections from Cloudinary
    for (const section of course.sections) {
      if (section.publicId) {
        await cloudinary.uploader.destroy(section.publicId);
      }
    }

    await course.deleteOne();
    res.json({ message: 'Course removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Update a course section
// @route   PUT /api/courses/:id/sections/:sectionId
// @access  Private
router.put('/:id/sections/:sectionId', protect, async (req, res) => {
  try {
    const { assignedTo, status, remarks } = req.body;
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });

    const section = course.sections.id(req.params.sectionId);
    if (!section) return res.status(404).json({ message: 'Section not found' });

    if (assignedTo !== undefined) section.assignedTo = assignedTo;
    if (status) section.status = status;
    if (remarks !== undefined) section.remarks = remarks;

    await course.save();
    res.json(course);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Upload file to section
// @route   POST /api/courses/:id/sections/:sectionId/upload
// @access  Private
router.post('/:id/sections/:sectionId/upload', protect, (req, res) => {
  console.log('Upload request received for course:', req.params.id, 'section:', req.params.sectionId);
  upload.single('file')(req, res, async (err) => {
    if (err) {
      console.error('Multer/Cloudinary Upload Error:', err.message, err.stack);
      return res.status(500).json({ message: err.message || 'Upload failed during processing' });
    }
    
    try {
      if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

      console.log('File uploaded to Cloudinary:', req.file.path, 'public_id:', req.file.filename);

    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });

    const section = course.sections.id(req.params.sectionId);
    if (!section) return res.status(404).json({ message: 'Section not found' });

    // Delete old file from Cloudinary if exists
    if (section.publicId) {
      await cloudinary.uploader.destroy(section.publicId);
    }

    section.fileUrl = req.file.path;
    section.fileName = req.file.originalname;
    section.publicId = req.file.filename; // Cloudinary returns public_id as filename in multer-storage-cloudinary
    section.uploadedAt = new Date();
    section.status = 'Uploaded';

    await course.save();
    res.json(course);
  } catch (error) {
    console.error('Section upload catch error:', error.message, error.stack);
    res.status(500).json({ message: error.message });
  }
  });
});

// @desc    Delete file from section
// @route   DELETE /api/courses/:id/sections/:sectionId/file
// @access  Private
router.delete('/:id/sections/:sectionId/file', protect, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });

    const section = course.sections.id(req.params.sectionId);
    if (!section) return res.status(404).json({ message: 'Section not found' });

    if (section.publicId) {
      await cloudinary.uploader.destroy(section.publicId);
    }

    section.fileUrl = '';
    section.fileName = '';
    section.publicId = '';
    section.uploadedAt = undefined;
    section.status = 'Pending';

    await course.save();
    res.json(course);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Download section file
// @route   GET /api/courses/:id/sections/:sectionId/download
// @access  Private
router.get('/:id/sections/:sectionId/download', protect, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });

    const section = course.sections.id(req.params.sectionId);
    if (!section || !section.fileUrl) return res.status(404).json({ message: 'File not found' });

    // For Cloudinary, we just redirect to the secure URL
    res.redirect(section.fileUrl);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
