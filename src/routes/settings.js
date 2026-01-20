const express = require('express');
const SettingsController = require('../controllers/SettingsController');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

// Public route - Get settings
router.get('/', SettingsController.getSettings);

// Admin routes
router.use(authenticate);
router.use(requireRole('ADMIN'));

const { upload } = require('../utils/upload');

router.patch('/', upload.setting.fields([{ name: 'appLogo', maxCount: 1 }, { name: 'dashboardLogo', maxCount: 1 }, { name: 'favicon', maxCount: 1 }]), SettingsController.updateSettings);

module.exports = router;


