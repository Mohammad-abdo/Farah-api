const express = require('express');
const PermissionsController = require('../controllers/PermissionsController');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication and ADMIN role
router.use(authenticate);
router.use(requireRole('ADMIN'));

// Get all permissions
router.get('/', PermissionsController.getAll);

// Get permissions by resource
router.get('/resource/:resource', PermissionsController.getByResource);

// Get permission by ID
router.get('/:id', PermissionsController.getById);

// Create permission
router.post('/', PermissionsController.create);

// Update permission
router.patch('/:id', PermissionsController.update);

// Delete permission
router.delete('/:id', PermissionsController.delete);

module.exports = router;


