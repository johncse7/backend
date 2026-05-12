const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

const User = require('./models/User');
const Department = require('./models/Department');
const Course = require('./models/Course');

dotenv.config();

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    console.log('Connected to MongoDB for seeding...');

    // Clear existing data
    await User.deleteMany();
    await Department.deleteMany();
    await Course.deleteMany();

    // Create Department
    const dept = await Department.create({
      name: 'Computer Science & Engineering',
      code: 'CSE',
      description: 'Department of CSE'
    });

    // Create Admin
    await User.create({
      name: 'System Admin',
      email: 'admin@example.com',
      password: 'admin123',
      role: 'admin',
      department: dept._id
    });

    // Create Faculty
    const faculty = await User.create({
      name: 'Dr. John Smith',
      email: 'faculty@example.com',
      password: 'faculty123',
      role: 'faculty',
      department: dept._id
    });

    // Create Course
    await Course.create({
      title: 'Data Structures & Algorithms',
      code: 'CS201',
      department: dept._id,
      semester: 3,
      faculty: [faculty._id]
    });

    console.log('Data Seeded Successfully!');

    process.exit();

  } catch (error) {

    console.error('Error seeding data:', error);

    process.exit(1);
  }
};

seedData();