const express = require('express');
const BookingsController = require('../controllers/BookingsController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// All booking routes require authentication
router.use(authenticate);

router.get('/', BookingsController.getAll);
router.get('/:id', BookingsController.getById);
router.post('/', BookingsController.create);
router.patch('/:id/status', BookingsController.updateStatus);
router.patch('/:id/pay-deposit', BookingsController.payDeposit);
router.patch('/:id/pay-remaining', BookingsController.payRemaining);
router.patch('/:id/cancel', BookingsController.cancel);

module.exports = router;

