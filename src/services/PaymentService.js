const stripe = require('stripe');
const logger = require('../utils/logger');

class PaymentService {
    constructor() {
        this.stripeClient = null;
        this.initializeStripe();
    }

    initializeStripe() {
        if (!process.env.STRIPE_SECRET_KEY) {
            logger.warn('Stripe configuration not found. Payment processing will be simulated.');
            return;
        }

        try {
            this.stripeClient = stripe(process.env.STRIPE_SECRET_KEY);
            logger.info('Stripe payment client initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize Stripe client', { error: error.message });
        }
    }

    /**
     * Create payment intent
     * @param {number} amount - Amount in base currency (e.g., dollars, not cents)
     * @param {string} currency - Currency code (default: 'usd')
     * @param {object} metadata - Additional metadata
     */
    async createPaymentIntent(amount, currency = 'usd', metadata = {}) {
        try {
            if (!this.stripeClient) {
                // Simulate payment intent in development
                const simulatedIntent = {
                    id: `pi_simulated_${Date.now()}`,
                    amount: Math.round(amount * 100),
                    currency,
                    status: 'succeeded',
                    client_secret: 'simulated_secret',
                    metadata,
                    mode: 'development',
                };

                logger.info('Simulated payment intent created', simulatedIntent);
                console.log('💳 Payment Intent (Simulated):', simulatedIntent);

                return simulatedIntent;
            }

            // Create actual Stripe payment intent
            const paymentIntent = await this.stripeClient.paymentIntents.create({
                amount: Math.round(amount * 100), // Convert to cents
                currency,
                metadata,
                automatic_payment_methods: {
                    enabled: true,
                },
            });

            logger.info('Stripe payment intent created', {
                id: paymentIntent.id,
                amount: paymentIntent.amount,
                currency: paymentIntent.currency,
            });

            return paymentIntent;
        } catch (error) {
            logger.error('Failed to create payment intent', {
                amount,
                currency,
                error: error.message,
            });
            throw error;
        }
    }

    /**
     * Confirm payment
     * @param {string} paymentIntentId - Payment intent ID
     */
    async confirmPayment(paymentIntentId) {
        try {
            if (!this.stripeClient) {
                // Simulate payment confirmation
                logger.info('Simulated payment confirmed', { paymentIntentId });
                return {
                    id: paymentIntentId,
                    status: 'succeeded',
                    mode: 'development',
                };
            }

            const paymentIntent = await this.stripeClient.paymentIntents.confirm(paymentIntentId);

            logger.info('Payment confirmed', {
                id: paymentIntent.id,
                status: paymentIntent.status,
            });

            return paymentIntent;
        } catch (error) {
            logger.error('Failed to confirm payment', {
                paymentIntentId,
                error: error.message,
            });
            throw error;
        }
    }

    /**
     * Retrieve payment intent
     * @param {string} paymentIntentId - Payment intent ID
     */
    async getPaymentIntent(paymentIntentId) {
        try {
            if (!this.stripeClient) {
                // Simulate retrieval
                return {
                    id: paymentIntentId,
                    status: 'succeeded',
                    mode: 'development',
                };
            }

            const paymentIntent = await this.stripeClient.paymentIntents.retrieve(paymentIntentId);
            return paymentIntent;
        } catch (error) {
            logger.error('Failed to retrieve payment intent', {
                paymentIntentId,
                error: error.message,
            });
            throw error;
        }
    }

    /**
     * Create refund
     * @param {string} paymentIntentId - Payment intent ID
     * @param {number} amount - Amount to refund (optional, full refund if not specified)
     */
    async createRefund(paymentIntentId, amount = null) {
        try {
            if (!this.stripeClient) {
                // Simulate refund
                logger.info('Simulated refund created', { paymentIntentId, amount });
                return {
                    id: `re_simulated_${Date.now()}`,
                    payment_intent: paymentIntentId,
                    amount: amount ? Math.round(amount * 100) : null,
                    status: 'succeeded',
                    mode: 'development',
                };
            }

            const refundData = {
                payment_intent: paymentIntentId,
            };

            if (amount) {
                refundData.amount = Math.round(amount * 100); // Convert to cents
            }

            const refund = await this.stripeClient.refunds.create(refundData);

            logger.info('Refund created', {
                id: refund.id,
                amount: refund.amount,
                status: refund.status,
            });

            return refund;
        } catch (error) {
            logger.error('Failed to create refund', {
                paymentIntentId,
                amount,
                error: error.message,
            });
            throw error;
        }
    }

    /**
     * Handle webhook event
     * @param {object} event - Stripe webhook event
     */
    async handleWebhookEvent(event) {
        try {
            logger.info('Processing Stripe webhook', { type: event.type, id: event.id });

            switch (event.type) {
                case 'payment_intent.succeeded':
                    await this.handlePaymentSuccess(event.data.object);
                    break;

                case 'payment_intent.payment_failed':
                    await this.handlePaymentFailure(event.data.object);
                    break;

                case 'charge.refunded':
                    await this.handleRefund(event.data.object);
                    break;

                default:
                    logger.info('Unhandled webhook event type', { type: event.type });
            }

            return { received: true };
        } catch (error) {
            logger.error('Failed to handle webhook event', {
                eventType: event.type,
                error: error.message,
            });
            throw error;
        }
    }

    /**
     * Handle successful payment
     */
    async handlePaymentSuccess(paymentIntent) {
        logger.info('Payment succeeded', {
            id: paymentIntent.id,
            amount: paymentIntent.amount,
        });

        // Update booking status in database
        // This will be implemented in the booking controller
    }

    /**
     * Handle failed payment
     */
    async handlePaymentFailure(paymentIntent) {
        logger.warn('Payment failed', {
            id: paymentIntent.id,
            amount: paymentIntent.amount,
        });

        // Notify user about failed payment
        // Update booking status
    }

    /**
     * Handle refund
     */
    async handleRefund(charge) {
        logger.info('Refund processed', {
            id: charge.id,
            amount: charge.amount_refunded,
        });

        // Update booking payment status
    }

    /**
     * Verify webhook signature
     * @param {string} payload - Raw request body
     * @param {string} signature - Stripe signature header
     */
    verifyWebhookSignature(payload, signature) {
        if (!this.stripeClient) {
            logger.warn('Webhook verification skipped (development mode)');
            return true;
        }

        try {
            const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
            if (!webhookSecret) {
                logger.error('Stripe webhook secret not configured');
                return false;
            }

            stripe.webhooks.constructEvent(payload, signature, webhookSecret);
            return true;
        } catch (error) {
            logger.error('Webhook signature verification failed', { error: error.message });
            return false;
        }
    }
}

// Export singleton instance
module.exports = new PaymentService();
