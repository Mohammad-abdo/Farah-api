const express = require('express');
const ContentController = require('../controllers/ContentController');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

// Public routes - Get content
router.get('/about', ContentController.getAbout);
router.get('/privacy', ContentController.getPrivacy);
router.get('/terms', ContentController.getTerms);

// Admin routes
router.use(authenticate);
router.use(requireRole('ADMIN'));

router.patch('/about', ContentController.updateAbout);
router.patch('/privacy', ContentController.updatePrivacy);
router.patch('/terms', ContentController.updateTerms);

module.exports = router;


