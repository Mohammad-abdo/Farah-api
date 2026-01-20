const express = require('express');
const NotificationsController = require('../controllers/NotificationsController');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get all notifications for current user
router.get('/', NotificationsController.getAll);

// Get unread count
router.get('/unread-count', NotificationsController.getUnreadCount);

// Get notification by ID
router.get('/:id', NotificationsController.getById);

// Mark notification as read
router.patch('/:id/read', NotificationsController.markAsRead);

// Mark all as read
router.patch('/read-all', NotificationsController.markAllAsRead);

// Delete notification
router.delete('/:id', NotificationsController.delete);

// Delete all notifications
router.delete('/', NotificationsController.deleteAll);

// Create notification (Admin only)
router.post('/', requireRole('ADMIN'), NotificationsController.create);

module.exports = router;


