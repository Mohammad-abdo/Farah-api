const express = require('express');
const RolesController = require('../controllers/RolesController');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication and ADMIN role
router.use(authenticate);
router.use(requireRole('ADMIN'));

// Get all roles with permissions
router.get('/', RolesController.getAll);

// Get role statistics
router.get('/stats', RolesController.getStats);

// Get role permissions
router.get('/:role/permissions', RolesController.getRolePermissions);

// Assign permissions to role
router.post('/:role/permissions', RolesController.assignPermissions);

// Add permission to role
router.post('/:role/permissions/add', RolesController.addPermission);

// Remove permission from role
router.delete('/:role/permissions/:permissionId', RolesController.removePermission);

module.exports = router;


