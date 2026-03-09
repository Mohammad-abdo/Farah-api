const express = require('express');
const SettingsController = require('../controllers/SettingsController');
const { authenticate, requireRole } = require('../middleware/auth');
const { upload } = require('../utils/upload');

const router = express.Router();

const settingFields = [
  { name: 'appLogo', maxCount: 1 },
  { name: 'dashboardLogo', maxCount: 1 },
  { name: 'favicon', maxCount: 1 },
];

// Only use multer when client sends multipart/form-data (file upload). JSON body is already parsed by express.json().
function optionalSettingUpload(req, res, next) {
  const isMultipart = (req.get('content-type') || '').toLowerCase().includes('multipart/form-data');
  if (isMultipart) {
    return upload.setting.fields(settingFields)(req, res, (err) => {
      if (err) return next(err);
      next();
    });
  }
  next();
}

// Public route - Get settings
router.get('/', SettingsController.getSettings);

// Admin routes
router.use(authenticate);
router.use(requireRole('ADMIN'));

router.patch('/', optionalSettingUpload, SettingsController.updateSettings);

module.exports = router;


