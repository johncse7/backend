const express = require('express');
const router = express.Router();
const Department = require('../models/Department');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

// @desc    Get all departments
// @route   GET /api/departments
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const departments = await Department.find();
    res.json(departments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Create a department
// @route   POST /api/departments
// @access  Private/Admin
router.post('/', protect, authorize('admin'), async (req, res) => {
  const { name, code, description } = req.body;

  try {
    const departmentExists = await Department.findOne({ code });
    if (departmentExists) {
      return res.status(400).json({ message: 'Department with this code already exists' });
    }

    const department = await Department.create({ name, code, description });
    res.status(201).json(department);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Update a department
// @route   PUT /api/departments/:id
// @access  Private/Admin
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const department = await Department.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!department) return res.status(404).json({ message: 'Department not found' });
    res.json(department);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Delete a department
// @route   DELETE /api/departments/:id
// @access  Private/Admin
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const department = await Department.findByIdAndDelete(req.params.id);
    if (!department) return res.status(404).json({ message: 'Department not found' });
    res.json({ message: 'Department removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
