const express = require('express');
const AdminController = require('../controllers/AdminController');
const CategoriesController = require('../controllers/CategoriesController');
const { authenticate, requireRole } = require('../middleware/auth');
const { upload } = require('../utils/upload');

const router = express.Router();

// All admin routes require authentication and ADMIN role
router.use(authenticate);
router.use(requireRole('ADMIN'));

// Dashboard Stats
router.get('/stats', AdminController.getStats);

// Admin Profile
router.get('/profile', AdminController.getProfile);
router.patch('/profile', upload.userAvatar.single('avatar'), AdminController.updateProfile);

// Users Management
router.get('/users', AdminController.getUsers);
router.post('/users', AdminController.createUser);
router.patch('/users/:id', AdminController.updateUser);
router.patch('/users/:id/status', AdminController.updateUserStatus);
router.delete('/users/:id', AdminController.deleteUser);

// Venues Management
router.get('/venues', AdminController.getVenues);
router.get('/venues/:id', AdminController.getVenueById);
router.post('/venues', upload.venue.array('images', 10), AdminController.createVenue);
router.put('/venues/:id', upload.venue.array('images', 10), AdminController.updateVenue);
router.patch('/venues/:id/status', AdminController.updateVenueStatus);
router.patch('/venues/:id/working-hours', AdminController.updateVenueWorkingHours);
router.patch('/venues/:id/pricing', AdminController.updateVenuePricing);
router.get('/venues/:id/bookings-calendar', AdminController.getVenueBookingsCalendar);
router.get('/venues/:id/holidays', AdminController.getVenueHolidays);
router.post('/venues/:id/holidays', AdminController.addVenueHoliday);
router.delete('/venues/:id/holidays/:holidayId', AdminController.deleteVenueHoliday);
router.delete('/venues/:id', AdminController.deleteVenue);

// Services Management
router.get('/services', AdminController.getServices);
router.post('/services', upload.service.array('images', 10), AdminController.createService);
router.put('/services/:id', upload.service.array('images', 10), AdminController.updateService);
router.patch('/services/:id/status', AdminController.updateServiceStatus);
router.patch('/services/:id/pricing', AdminController.updateServicePricing);
router.delete('/services/:id', AdminController.deleteService);
// Service Holidays
router.get('/services/:id/holidays', AdminController.getServiceHolidays);
router.post('/services/:id/holidays', AdminController.addServiceHoliday);
router.delete('/services/:id/holidays/:holidayId', AdminController.deleteServiceHoliday);

// Bookings Management
router.get('/bookings', AdminController.getBookings);
router.get('/bookings/:id', AdminController.getBookingById);
router.patch('/bookings/:id', AdminController.updateBooking);
router.patch('/bookings/:id/status', AdminController.updateBookingStatus);
router.patch('/bookings/:id/payment-status', AdminController.updateBookingPaymentStatus);
router.patch('/bookings/:id/cancel', AdminController.cancelBooking);

// Categories Management
router.get('/categories', AdminController.getCategories);
router.post('/categories', upload.category.fields([{ name: 'icon', maxCount: 1 }, { name: 'image', maxCount: 1 }]), CategoriesController.create);
router.patch('/categories/:id', upload.category.fields([{ name: 'icon', maxCount: 1 }, { name: 'image', maxCount: 1 }]), CategoriesController.update);
router.delete('/categories/:id', CategoriesController.delete);

// Reviews Management
router.get('/reviews', AdminController.getReviews);
router.delete('/reviews/:id', AdminController.deleteReview);

// Payments Management
router.get('/payments', AdminController.getPayments);
router.patch('/payments/:id/status', AdminController.updatePaymentStatus);

// ── Vendor Management ──────────────────────────────────────────────────────
const VendorLocationController = require('../controllers/VendorLocationController');

router.get('/vendor-orders', AdminController.getRecentVendorOrders);
router.get('/vendors', AdminController.getVendors);
router.get('/vendors-map', AdminController.getVendorsForMap);
router.get('/vendors/:id', AdminController.getVendorById);
router.patch('/vendors/:id', AdminController.updateVendor);
router.patch('/vendors/:id/approve', AdminController.approveVendor);
router.patch('/vendors/:id/reject', AdminController.rejectVendor);
router.patch('/vendors/:id/suspend', AdminController.suspendVendor);
router.post('/vendors/:id/send-money', AdminController.sendMoneyToVendor);
router.get('/vendors/:id/transactions', AdminController.getVendorTransactions);
router.get('/vendors/:id/orders', AdminController.getVendorOrders);
router.get('/vendors/:vendorId/orders/:orderId', AdminController.getVendorOrderById);

// Vendor Wallets
router.get('/wallets', AdminController.getVendorWallets);
router.get('/wallets/:walletId', AdminController.getVendorWalletById);
router.post('/wallets/adjust', AdminController.adjustWalletBalance);
router.patch('/wallets/:walletId/freeze', AdminController.freezeWallet);
router.patch('/wallets/:walletId/activate', AdminController.activateWallet);
router.get('/transactions', AdminController.getAllTransactions);

// Commission Reports
router.get('/commission/reports', AdminController.getCommissionReports);

// Vendor locations (branches)
router.get('/vendors/:vendorId/locations', VendorLocationController.listLocations);
router.post('/vendors/:vendorId/locations', VendorLocationController.createLocation);
router.patch('/vendors/:vendorId/locations/:locationId', VendorLocationController.updateLocation);
router.delete('/vendors/:vendorId/locations/:locationId', VendorLocationController.deleteLocation);

module.exports = router;
