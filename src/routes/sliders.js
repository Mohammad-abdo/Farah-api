const express = require('express');
const SliderController = require('../controllers/SliderController');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

// Public route - Get all sliders
router.get('/', SliderController.getAll);

// Admin routes
router.use(authenticate);
router.use(requireRole('ADMIN'));

const { upload } = require('../utils/upload');

router.get('/:id', SliderController.getById);
router.post('/', upload.slider.single('image'), SliderController.create);
router.patch('/:id', upload.slider.single('image'), SliderController.update);
router.delete('/:id', SliderController.delete);

module.exports = router;


