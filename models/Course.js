const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: true
  },
  semester: {
    type: Number,
    required: true,
    min: 1,
    max: 8
  },
  faculty: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  sections: [{
    sectionName: { type: String, required: true },
    assignedTo: { type: String, default: '' },
    status: { 
      type: String, 
      enum: ['Pending', 'Uploaded', 'Reviewed'], 
      default: 'Pending' 
    },
    remarks: { type: String, default: '' },
    fileUrl: { type: String, default: '' },
    fileName: { type: String, default: '' },
    publicId: { type: String, default: '' },
    uploadedAt: { type: Date }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Course', courseSchema);
