const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads directory structure
const uploadsDir = path.join(__dirname, '../../uploads');
const directories = {
  users: path.join(uploadsDir, 'users', 'avatars'),
  categories: path.join(uploadsDir, 'categories'),
  venues: path.join(uploadsDir, 'venues'),
  services: path.join(uploadsDir, 'services'),
  sliders: path.join(uploadsDir, 'sliders'),
  settings: path.join(uploadsDir, 'settings'),
  onboarding: path.join(uploadsDir, 'onboarding'),
  coupons: path.join(uploadsDir, 'coupons'),
};

// Create all directories
Object.values(directories).forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
});

// File filter - only images
const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, WebP, and SVG images are allowed.'), false);
  }
};

// Create storage function for different image types
const createStorage = (subfolder) => {
  return multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, directories[subfolder] || uploadsDir);
    },
    filename: function (req, file, cb) {
      // Generate unique filename: type_timestamp_random.extension
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 8);
      const ext = path.extname(file.originalname) || '.jpg';
      const filename = `${subfolder}_${timestamp}_${random}${ext}`;
      cb(null, filename);
    }
  });
};

// Configure multer instances for different image types
const upload = {
  // User avatars
  userAvatar: multer({
    storage: createStorage('users'),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: fileFilter
  }),
  
  // Categories (icon and image)
  category: multer({
    storage: createStorage('categories'),
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
    fileFilter: fileFilter
  }),
  
  // Venues (multiple images)
  venue: multer({
    storage: createStorage('venues'),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per image
    fileFilter: fileFilter
  }),
  
  // Services (multiple images)
  service: multer({
    storage: createStorage('services'),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per image
    fileFilter: fileFilter
  }),
  
  // Sliders
  slider: multer({
    storage: createStorage('sliders'),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: fileFilter
  }),
  
  // Settings (logos, favicon)
  setting: multer({
    storage: createStorage('settings'),
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
    fileFilter: fileFilter
  }),
  
  // Onboarding slides
  onboarding: multer({
    storage: createStorage('onboarding'),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: fileFilter
  }),
  
  // Coupons
  coupon: multer({
    storage: createStorage('coupons'),
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
    fileFilter: fileFilter
  }),
};

// Helper function to generate full URL from file path
const getFileUrl = (req, filePath) => {
  if (!filePath) return null;
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    return filePath; // Already a full URL
  }
  
  const BASE_URL = process.env.BASE_URL || process.env.API_BASE_URL || `${req.protocol}://${req.get('host')}`;
  return `${BASE_URL}${filePath}`;
};

// Helper function to delete old file if it exists
const deleteOldFile = (filePath) => {
  if (!filePath) return;
  
  // Only delete if it's a local file path (starts with /uploads/)
  if (filePath.startsWith('/uploads/')) {
    const fullPath = path.join(__dirname, '../../', filePath);
    if (fs.existsSync(fullPath)) {
      try {
        fs.unlinkSync(fullPath);
        console.log('Deleted old file:', fullPath);
      } catch (error) {
        console.warn('Error deleting old file:', error);
      }
    }
  }
};

module.exports = {
  upload,
  directories,
  uploadsDir,
  getFileUrl,
  deleteOldFile
};

