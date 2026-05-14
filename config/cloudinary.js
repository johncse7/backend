const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const dotenv = require('dotenv');

dotenv.config();

if (process.env.CLOUDINARY_URL) {
  console.log('Cloudinary: Using CLOUDINARY_URL for configuration');
  cloudinary.config();
} else {
  console.log('Cloudinary: Using separate variables for configuration');
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}

console.log('Cloud Name configured:', cloudinary.config().cloud_name);

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'my_app_uploads',
    allowed_formats: ['jpg', 'png', 'jpeg', 'pdf', 'docx', 'doc', 'xlsx', 'xls'],
  },
});

const courseStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'course_files',
    resource_type: 'auto' // Important for non-image files like PDFs, allows any file type
  },
});

module.exports = { cloudinary, storage, courseStorage };
