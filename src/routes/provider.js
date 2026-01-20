const express = require('express');
const ProviderController = require('../controllers/ProviderController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// All provider routes require authentication
router.use(authenticate);

// Dashboard
router.get('/dashboard/stats', ProviderController.getDashboardStats);

// Venues
router.get('/venues', ProviderController.getVenues);
router.patch('/venues/:id', ProviderController.updateVenue);

// Services
router.get('/services', ProviderController.getServices);
router.patch('/services/:id', ProviderController.updateService);

// Bookings
router.get('/bookings', ProviderController.getBookings);

// Earnings
router.get('/earnings', ProviderController.getEarnings);

module.exports = router;
