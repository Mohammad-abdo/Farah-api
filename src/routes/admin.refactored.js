const express = require('express');
const AdminController = require('../controllers/AdminController');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

// All admin routes require authentication and ADMIN role
router.use(authenticate);
router.use(requireRole('ADMIN'));

// Dashboard Stats
router.get('/stats', AdminController.getStats);

// Users Management
router.get('/users', AdminController.getUsers);
router.patch('/users/:id/status', AdminController.updateUserStatus);
router.delete('/users/:id', AdminController.deleteUser);

// Venues Management
router.get('/venues', AdminController.getVenues);
router.patch('/venues/:id/status', AdminController.updateVenueStatus);
router.delete('/venues/:id', AdminController.deleteVenue);

// Services Management
router.get('/services', AdminController.getServices);
router.patch('/services/:id/status', AdminController.updateServiceStatus);
router.delete('/services/:id', AdminController.deleteService);

// Bookings Management
router.get('/bookings', AdminController.getBookings);
router.patch('/bookings/:id/status', AdminController.updateBookingStatus);
router.patch('/bookings/:id/payment-status', AdminController.updateBookingPaymentStatus);

// Categories Management
router.get('/categories', AdminController.getCategories);

// Reviews Management
router.get('/reviews', AdminController.getReviews);
router.delete('/reviews/:id', AdminController.deleteReview);

// Payments Management
router.get('/payments', AdminController.getPayments);
router.patch('/payments/:id/status', AdminController.updatePaymentStatus);

module.exports = router;



