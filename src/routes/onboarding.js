const express = require('express');
const OnboardingController = require('../controllers/OnboardingController');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

// Public route for mobile app
router.get('/mobile', OnboardingController.getActive);

// Admin routes (require authentication and admin role)
router.use(authenticate);
router.use(requireRole('ADMIN'));

const { upload } = require('../utils/upload');

router.get('/', OnboardingController.getAll);
router.get('/:id', OnboardingController.getById);
router.post('/', upload.onboarding.single('image'), OnboardingController.create);
router.put('/:id', upload.onboarding.single('image'), OnboardingController.update);
router.delete('/:id', OnboardingController.delete);

module.exports = router;

