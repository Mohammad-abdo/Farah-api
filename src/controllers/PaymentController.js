const getPrisma = require('../utils/prisma');
const paymentService = require('../services/PaymentService');
const emailService = require('../services/EmailService');
const smsService = require('../services/SMSService');
const logger = require('../utils/logger');
const { ValidationError, NotFoundError } = require('../utils/errors');

const prisma = getPrisma();

class PaymentController {
    /**
     * Create payment intent for booking
     */
    static async createPaymentIntent(req, res, next) {
        try {
            const { bookingId, amount } = req.body;

            if (!bookingId || !amount) {
                throw new ValidationError('Booking ID and amount are required');
            }

            // Verify booking exists and belongs to user
            const booking = await prisma.booking.findUnique({
                where: { id: bookingId },
                include: {
                    customer: true,
                },
            });

            if (!booking) {
                throw new NotFoundError('Booking');
            }

            if (booking.customerId !== req.user.id && req.user.role !== 'ADMIN') {
                throw new ValidationError('You can only create payment for your own bookings');
            }

            // Create payment intent
            const paymentIntent = await paymentService.createPaymentIntent(amount, 'usd', {
                bookingId,
                customerId: booking.customerId,
                bookingNumber: booking.bookingNumber,
            });

            // Store payment intent reference
            await prisma.payment.create({
                data: {
                    bookingId,
                    amount,
                    method: 'CREDIT_CARD',
                    status: 'PENDING',
                    transactionId: paymentIntent.id,
                },
            });

            logger.info('Payment intent created', {
                bookingId,
                paymentIntentId: paymentIntent.id,
                amount,
            });

            res.json({
                success: true,
                paymentIntent: {
                    id: paymentIntent.id,
                    clientSecret: paymentIntent.client_secret,
                    amount: paymentIntent.amount,
                    currency: paymentIntent.currency,
                },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Confirm payment and update booking
     */
    static async confirmPayment(req, res, next) {
        try {
            const { paymentIntentId, bookingId } = req.body;

            if (!paymentIntentId || !bookingId) {
                throw new ValidationError('Payment intent ID and booking ID are required');
            }

            // Get payment intent status
            const paymentIntent = await paymentService.getPaymentIntent(paymentIntentId);

            // Update payment record
            const payment = await prisma.payment.findFirst({
                where: {
                    bookingId,
                    transactionId: paymentIntentId,
                },
            });

            if (!payment) {
                throw new NotFoundError('Payment record');
            }

            await prisma.payment.update({
                where: { id: payment.id },
                data: {
                    status: paymentIntent.status === 'succeeded' ? 'PAID' : 'FAILED',
                },
            });

            // Update booking
            const updatedBooking = await prisma.booking.update({
                where: { id: bookingId },
                data: {
                    paymentStatus: paymentIntent.status === 'succeeded' ? 'PAID' : 'PENDING',
                    status: paymentIntent.status === 'succeeded' ? 'CONFIRMED' : 'PENDING',
                },
                include: {
                    customer: true,
                    venue: true,
                },
            });

            // Send confirmation if payment succeeded
            if (paymentIntent.status === 'succeeded') {
                // Send email confirmation
                if (updatedBooking.customer.email) {
                    emailService.sendBookingConfirmation(updatedBooking.customer, updatedBooking)
                        .catch(err => logger.error('Failed to send confirmation email', { error: err.message }));
                }

                // Send SMS confirmation
                smsService.sendBookingConfirmation(
                    updatedBooking.customer.phone,
                    updatedBooking.bookingNumber,
                    updatedBooking.date
                ).catch(err => logger.error('Failed to send confirmation SMS', { error: err.message }));

                logger.info('Payment confirmed and notifications sent', {
                    bookingId,
                    paymentIntentId,
                });
            }

            res.json({
                success: true,
                booking: updatedBooking,
                paymentStatus: paymentIntent.status,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Handle Stripe webhook
     */
    static async handleWebhook(req, res, next) {
        try {
            const signature = req.headers['stripe-signature'];
            const payload = req.body;

            // Verify webhook signature
            const isValid = paymentService.verifyWebhookSignature(payload, signature);

            if (!isValid) {
                return res.status(400).json({ error: 'Invalid signature' });
            }

            // Handle webhook event
            await paymentService.handleWebhookEvent(payload);

            res.json({ received: true });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Request refund
     */
    static async requestRefund(req, res, next) {
        try {
            const { bookingId, amount } = req.body;

            // Find booking and payment
            const booking = await prisma.booking.findUnique({
                where: { id: bookingId },
                include: {
                    payments: {
                        where: { status: 'PAID' },
                        orderBy: { createdAt: 'desc' },
                    },
                },
            });

            if (!booking) {
                throw new NotFoundError('Booking');
            }

            if (!booking.payments || booking.payments.length === 0) {
                throw new ValidationError('No paid payment found for this booking');
            }

            const payment = booking.payments[0];

            // Create refund
            const refund = await paymentService.createRefund(payment.transactionId, amount);

            // Update payment status
            await prisma.payment.update({
                where: { id: payment.id },
                data: { status: 'REFUNDED' },
            });

            // Update booking
            await prisma.booking.update({
                where: { id: bookingId },
                data: {
                    paymentStatus: 'REFUNDED',
                    status: 'CANCELLED',
                },
            });

            logger.info('Refund processed', {
                bookingId,
                refundId: refund.id,
                amount: amount || payment.amount,
            });

            res.json({
                success: true,
                refund: {
                    id: refund.id,
                    amount: refund.amount,
                    status: refund.status,
                },
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = PaymentController;
