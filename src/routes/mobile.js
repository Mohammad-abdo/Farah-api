const express = require('express');
const MobileController = require('../controllers/MobileController');
const BookingsController = require('../controllers/BookingsController');
const CouponController = require('../controllers/CouponController');
const CreditCardController = require('../controllers/CreditCardController');
const { authenticate } = require('../middleware/auth');
const { upload } = require('../utils/upload');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Mobile
 *   description: Mobile app endpoints
 */

/**
 * @swagger
 * /api/mobile/home:
 *   get:
 *     summary: Get home page data
 *     tags: [Mobile]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 5
 *         description: Number of venues to return
 *     responses:
 *       200:
 *         description: Home page data
 */
router.get('/home', MobileController.getHome);

/**
 * @swagger
 * /api/mobile/venues:
 *   get:
 *     summary: Get venues list
 *     tags: [Mobile]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: string
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [rating, price_asc, price_desc, popular]
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: List of venues
 */
router.get('/venues', MobileController.getVenues);

/**
 * @swagger
 * /api/mobile/venues/:id:
 *   get:
 *     summary: Get venue details
 *     tags: [Mobile]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Venue details
 *       404:
 *         description: Venue not found
 */
router.get('/venues/:id', MobileController.getVenueById);
router.get('/venues/:id/available-slots', MobileController.getAvailableTimeSlots);
router.get('/venues/:id/booked-dates', MobileController.getBookedDates);
router.post('/venues/:id/favorite', authenticate, MobileController.addToFavorites);
router.delete('/venues/:id/favorite', authenticate, MobileController.removeFromFavorites);
router.get('/favorites', authenticate, MobileController.getFavorites);

/**
 * @swagger
 * /api/mobile/services:
 *   get:
 *     summary: Get services list
 *     tags: [Mobile]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: string
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [rating, price_asc, price_desc]
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: List of services
 */
router.get('/services', MobileController.getServices);

/**
 * @swagger
 * /api/mobile/services/booking:
 *   post:
 *     summary: Create a service-only booking (without venue) - supports multiple services
 *     description: >
 *       Convenience endpoint for booking one or MORE services from mobile app without a venue.
 *       This endpoint allows booking multiple services in a single booking (e.g., makeup + hair + nails).
 *       Internally uses the same logic as /api/bookings.  
 *       IMPORTANT: Do NOT send `venueId` - this is for service-only bookings.
 *       The `services` array can contain multiple service objects, each with its own details.
 *     tags: [Mobile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - services
 *               - date
 *               - totalAmount
 *             properties:
 *               date:
 *                 type: string
 *                 format: date-time
 *                 description: Booking date (ISO string)
 *                 example: "2026-02-01T18:00:00.000Z"
 *               startTime:
 *                 type: string
 *                 description: Start time (HH:mm format)
 *                 example: "18:00"
 *               endTime:
 *                 type: string
 *                 description: End time (HH:mm format)
 *                 example: "20:00"
 *               location:
 *                 type: string
 *                 description: Location type (home, hotel, outdoor, other, etc.)
 *                 example: "home"
 *               locationAddress:
 *                 type: string
 *                 description: Full address for the service location
 *                 example: "الرياض - حي النرجس"
 *               locationLatitude:
 *                 type: number
 *                 description: Latitude coordinate (optional)
 *                 example: 24.7136
 *               locationLongitude:
 *                 type: number
 *                 description: Longitude coordinate (optional)
 *                 example: 46.6753
 *               totalAmount:
 *                 type: number
 *                 description: Total amount for all services
 *                 example: 150.00
 *               discount:
 *                 type: number
 *                 description: Discount amount (optional)
 *                 default: 0
 *               cardId:
 *                 type: string
 *                 description: Credit card ID for payment (optional - can pay deposit later)
 *               notes:
 *                 type: string
 *                 description: Additional notes for the booking
 *               services:
 *                 type: array
 *                 minItems: 1
 *                 description: >
 *                   Array of service booking objects. You can book MULTIPLE services in one booking.
 *                   Each object should include serviceId and optional time/location fields.
 *                   Example: [{"serviceId": "srv_1", "price": 50}, {"serviceId": "srv_2", "price": 100}]
 *                 items:
 *                   type: object
 *                   required:
 *                     - serviceId
 *                   properties:
 *                     serviceId:
 *                       type: string
 *                       description: Service ID (required)
 *                       example: "srv_123"
 *                     price:
 *                       type: number
 *                       description: Price for this service (optional - will use service default if not provided)
 *                       example: 50.00
 *                     date:
 *                       type: string
 *                       format: date-time
 *                       description: Specific date for this service (optional - uses booking date if not provided)
 *                     startTime:
 *                       type: string
 *                       description: Specific start time for this service (optional)
 *                       example: "18:00"
 *                     endTime:
 *                       type: string
 *                       description: Specific end time for this service (optional)
 *                       example: "19:00"
 *                     locationType:
 *                       type: string
 *                       description: Location type for this specific service (optional)
 *                       example: "home"
 *                     locationAddress:
 *                       type: string
 *                       description: Address for this specific service (optional)
 *                     locationLatitude:
 *                       type: number
 *                       description: Latitude for this specific service (optional)
 *                     locationLongitude:
 *                       type: number
 *                       description: Longitude for this specific service (optional)
 *                     notes:
 *                       type: string
 *                       description: Notes specific to this service (optional)
 *           example:
 *             date: "2026-02-01T18:00:00.000Z"
 *             startTime: "18:00"
 *             endTime: "20:00"
 *             location: "home"
 *             locationAddress: "الرياض - حي النرجس"
 *             totalAmount: 200.00
 *             cardId: "card_123"
 *             notes: "حفلة عيد ميلاد"
 *             services:
 *               - serviceId: "srv_makeup_001"
 *                 price: 100.00
 *                 startTime: "18:00"
 *                 endTime: "19:00"
 *               - serviceId: "srv_hair_001"
 *                 price: 100.00
 *                 startTime: "19:00"
 *                 endTime: "20:00"
 *     responses:
 *       201:
 *         description: Service booking created successfully (supports multiple services)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 booking:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     bookingNumber:
 *                       type: string
 *                     bookingType:
 *                       type: string
 *                       example: "SERVICES_ONLY"
 *                     services:
 *                       type: array
 *                       description: Array of booked services
 *       400:
 *         description: Validation error (e.g., missing services, invalid service IDs, etc.)
 *       401:
 *         description: Unauthorized
 */
router.post('/services/booking', BookingsController.create);

/**
 * @swagger
 * /api/mobile/services/{id}:
 *   get:
 *     summary: Get single service details
 *     tags: [Mobile]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Service ID
 *     responses:
 *       200:
 *         description: Service details
 *       404:
 *         description: Service not found
 */
router.get('/services/:id', MobileController.getServiceById);
router.get('/services/:id/availability', MobileController.checkServiceAvailability);

/**
 * @swagger
 * /api/mobile/categories:
 *   get:
 *     summary: Get categories list
 *     tags: [Mobile]
 *     responses:
 *       200:
 *         description: List of categories
 */
router.get('/categories', MobileController.getCategories);

/**
 * @swagger
 * /api/mobile/search:
 *   get:
 *     summary: Search venues and services
 *     tags: [Mobile]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [all, venues, services]
 *           default: all
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Search results
 */
router.get('/search', MobileController.search);

// Public content routes (before authenticate middleware)
router.get('/settings', MobileController.getSettings);
router.get('/content/privacy', MobileController.getPrivacy);
router.get('/content/terms', MobileController.getTerms);
router.get('/content/about', MobileController.getAbout);

// Authenticated routes
router.use(authenticate);

/**
 * @swagger
 * /api/mobile/bookings:
 *   get:
 *     summary: Get user bookings
 *     tags: [Mobile]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, active, completed, cancelled]
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: List of user bookings
 *       401:
 *         description: Unauthorized
 */
router.get('/bookings', MobileController.getBookings);

/**
 * @swagger
 * /api/mobile/bookings/:id:
 *   get:
 *     summary: Get booking details
 *     tags: [Mobile]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Booking details
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Booking not found
 */
router.get('/bookings/:id', MobileController.getBookingById);

/**
 * @swagger
 * /api/mobile/bookings:
 *   post:
 *     summary: Create a new booking
 *     tags: [Mobile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - venueId
 *               - eventDate
 *             properties:
 *               venueId:
 *                 type: string
 *               eventDate:
 *                 type: string
 *               startTime:
 *                 type: string
 *               endTime:
 *                 type: string
 *               guestCount:
 *                 type: integer
 *               serviceIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               notes:
 *                 type: string
 *               paymentMethod:
 *                 type: string
 *     responses:
 *       201:
 *         description: Booking created successfully
 *       401:
 *         description: Unauthorized
 */
router.post('/bookings', BookingsController.create);

/**
 * @swagger
 * /api/mobile/bookings/:id/cancel:
 *   patch:
 *     summary: Cancel a booking
 *     tags: [Mobile]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Booking cancelled successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Booking not found
 */
router.patch('/bookings/:id/cancel', BookingsController.cancel);

/**
 * @swagger
 * /api/mobile/bookings/:id/pay-deposit:
 *   patch:
 *     summary: Pay deposit amount for a booking
 *     tags: [Mobile]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cardId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Deposit paid successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Booking not found
 */
router.patch('/bookings/:id/pay-deposit', BookingsController.payDeposit);

/**
 * @swagger
 * /api/mobile/bookings/:id/pay-remaining:
 *   patch:
 *     summary: Pay remaining amount for a booking
 *     tags: [Mobile]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cardId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Remaining amount paid successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Booking not found
 */
router.patch('/bookings/:id/pay-remaining', BookingsController.payRemaining);

/**
 * @swagger
 * /api/mobile/wallet:
 *   get:
 *     summary: Get wallet balance and transactions
 *     tags: [Mobile]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Wallet data
 *       401:
 *         description: Unauthorized
 */
router.get('/wallet', MobileController.getWallet);

/**
 * @swagger
 * /api/mobile/profile:
 *   get:
 *     summary: Get user profile
 *     tags: [Mobile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 *       401:
 *         description: Unauthorized
 */
router.get('/profile', MobileController.getProfile);

/**
 * @swagger
 * /api/mobile/profile:
 *   patch:
 *     summary: Update user profile
 *     tags: [Mobile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               nameAr:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               location:
 *                 type: string
 *               locationAr:
 *                 type: string
 *               avatar:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       401:
 *         description: Unauthorized
 */
// Profile update with file upload support
router.patch('/profile', authenticate, upload.userAvatar.single('avatar'), MobileController.updateProfile);

/**
 * @swagger
 * /api/mobile/profile:
 *   delete:
 *     summary: Delete user account
 *     tags: [Mobile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Account deleted successfully
 *       401:
 *         description: Unauthorized
 */
router.delete('/profile', MobileController.deleteProfile);

/**
 * @swagger
 * /api/mobile/notifications:
 *   get:
 *     summary: Get user notifications
 *     tags: [Mobile]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: List of notifications
 *       401:
 *         description: Unauthorized
 */
router.get('/notifications', MobileController.getNotifications);

/**
 * @swagger
 * /api/mobile/notifications/:id/read:
 *   patch:
 *     summary: Mark notification as read
 *     tags: [Mobile]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Notification marked as read
 *       401:
 *         description: Unauthorized
 */
router.patch('/notifications/:id/read', MobileController.markNotificationAsRead);

/**
 * @swagger
 * /api/mobile/coupons:
 *   get:
 *     summary: Get all active coupons
 *     tags: [Mobile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of active coupons
 *       401:
 *         description: Unauthorized
 */
router.get('/coupons', CouponController.getCoupons);

/**
 * @swagger
 * /api/mobile/coupons/:code:
 *   get:
 *     summary: Get coupon by code
 *     tags: [Mobile]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Coupon details
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Coupon not found
 */
router.get('/coupons/:code', CouponController.getCouponByCode);

/**
 * @swagger
 * /api/mobile/coupons/:code/apply:
 *   post:
 *     summary: Apply/Use a coupon
 *     tags: [Mobile]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *     responses:
 *       200:
 *         description: Coupon applied successfully
 *       401:
 *         description: Unauthorized
 *       400:
 *         description: Invalid coupon or validation error
 */
router.post('/coupons/:code/apply', CouponController.applyCoupon);

// Credit Cards Routes
router.get('/cards', authenticate, CreditCardController.getCards);
router.post('/cards', authenticate, CreditCardController.addCard);
router.patch('/cards/:id', authenticate, CreditCardController.updateCard);
router.delete('/cards/:id', authenticate, CreditCardController.deleteCard);

module.exports = router;

