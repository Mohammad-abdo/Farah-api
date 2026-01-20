const express = require('express');
const CategoriesController = require('../controllers/CategoriesController');
const { authenticate, requireRole } = require('../middleware/auth');
const { upload } = require('../utils/upload');

const router = express.Router();

// Public routes
router.get('/', CategoriesController.getAll);
router.get('/:id', CategoriesController.getById);

// Admin routes - require authentication and ADMIN role
// Use fields() to handle both icon and image files
router.post('/', authenticate, requireRole('ADMIN'), upload.category.fields([{ name: 'icon', maxCount: 1 }, { name: 'image', maxCount: 1 }]), CategoriesController.create);
router.patch('/:id', authenticate, requireRole('ADMIN'), upload.category.fields([{ name: 'icon', maxCount: 1 }, { name: 'image', maxCount: 1 }]), CategoriesController.update);
router.delete('/:id', authenticate, requireRole('ADMIN'), CategoriesController.delete);

module.exports = router;
