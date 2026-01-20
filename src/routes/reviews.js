const express = require('express');
const ReviewsController = require('../controllers/ReviewsController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.get('/', ReviewsController.getAll);

// Protected routes - require authentication
router.post('/', authenticate, ReviewsController.create);
router.delete('/:id', authenticate, ReviewsController.delete);

module.exports = router;



