const express = require('express');
const PaymentController = require('../controllers/PaymentController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Webhook route (no auth - Stripe calls this)
router.post('/webhook', express.raw({ type: 'application/json' }), PaymentController.handleWebhook);

// All other payment routes require authentication
router.use(authenticate);

// Create payment intent
router.post('/create-intent', PaymentController.createPaymentIntent);

// Confirm payment
router.post('/confirm', PaymentController.confirmPayment);

// Request refund
router.post('/refund', PaymentController.requestRefund);

module.exports = router;
