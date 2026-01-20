const getPrisma = require('../utils/prisma');
const { NotFoundError, ValidationError, ForbiddenError } = require('../utils/errors');
const logger = require('../utils/logger');

const prisma = getPrisma();

class ProviderController {
    /**
     * Get provider dashboard stats
     */
    static async getDashboardStats(req, res, next) {
        try {
            const providerId = req.user.id;

            // Check if user is a provider
            const user = await prisma.user.findUnique({
                where: { id: providerId },
            });

            if (user.role !== 'PROVIDER' && user.role !== 'ADMIN') {
                throw new ForbiddenError('Only providers can access this endpoint');
            }

            // Get provider stats
            const [venues, services, bookings, totalEarnings] = await Promise.all([
                // Count venues
                prisma.venue.count({
                    where: { providerId },
                }),
                // Count services
                prisma.service.count({
                    where: { providerId },
                }),
                // Count bookings
                prisma.booking.count({
                    where: {
                        OR: [
                            { venue: { providerId } },
                            { services: { some: { service: { providerId } } } },
                        ],
                    },
                }),
                // Calculate total earnings
                prisma.booking.aggregate({
                    where: {
                        OR: [
                            { venue: { providerId } },
                            { services: { some: { service: { providerId } } } },
                        ],
                        status: 'COMPLETED',
                        paymentStatus: 'PAID',
                    },
                    _sum: {
                        finalAmount: true,
                    },
                }),
            ]);

            res.json({
                success: true,
                stats: {
                    venues,
                    services,
                    bookings,
                    totalEarnings: totalEarnings._sum.finalAmount || 0,
                },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get provider venues
     */
    static async getVenues(req, res, next) {
        try {
            const providerId = req.user.id;
            const { limit = 20, offset = 0 } = req.query;

            const [venues, total] = await Promise.all([
                prisma.venue.findMany({
                    where: { providerId },
                    include: {
                        _count: {
                            select: {
                                bookings: true,
                                reviews: true,
                            },
                        },
                    },
                    orderBy: { createdAt: 'desc' },
                    take: parseInt(limit),
                    skip: parseInt(offset),
                }),
                prisma.venue.count({ where: { providerId } }),
            ]);

            res.json({
                success: true,
                venues,
                total,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get provider services
     */
    static async getServices(req, res, next) {
        try {
            const providerId = req.user.id;
            const { limit = 20, offset = 0 } = req.query;

            const [services, total] = await Promise.all([
                prisma.service.findMany({
                    where: { providerId },
                    include: {
                        category: true,
                        _count: {
                            select: {
                                bookings: true,
                                reviews: true,
                            },
                        },
                    },
                    orderBy: { createdAt: 'desc' },
                    take: parseInt(limit),
                    skip: parseInt(offset),
                }),
                prisma.service.count({ where: { providerId } }),
            ]);

            res.json({
                success: true,
                services,
                total,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get provider bookings
     */
    static async getBookings(req, res, next) {
        try {
            const providerId = req.user.id;
            const { status, limit = 20, offset = 0 } = req.query;

            const where = {
                OR: [
                    { venue: { providerId } },
                    { services: { some: { service: { providerId } } } },
                ],
                ...(status && { status }),
            };

            const [bookings, total] = await Promise.all([
                prisma.booking.findMany({
                    where,
                    include: {
                        customer: {
                            select: {
                                id: true,
                                name: true,
                                phone: true,
                                email: true,
                            },
                        },
                        venue: {
                            select: {
                                id: true,
                                name: true,
                                nameAr: true,
                            },
                        },
                        services: {
                            include: {
                                service: {
                                    select: {
                                        id: true,
                                        name: true,
                                        nameAr: true,
                                    },
                                },
                            },
                        },
                    },
                    orderBy: { createdAt: 'desc' },
                    take: parseInt(limit),
                    skip: parseInt(offset),
                }),
                prisma.booking.count({ where }),
            ]);

            res.json({
                success: true,
                bookings,
                total,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get provider earnings
     */
    static async getEarnings(req, res, next) {
        try {
            const providerId = req.user.id;
            const { startDate, endDate } = req.query;

            const where = {
                OR: [
                    { venue: { providerId } },
                    { services: { some: { service: { providerId } } } },
                ],
                status: 'COMPLETED',
                paymentStatus: 'PAID',
                ...(startDate && endDate && {
                    date: {
                        gte: new Date(startDate),
                        lte: new Date(endDate),
                    },
                }),
            };

            const [totalEarnings, bookings] = await Promise.all([
                prisma.booking.aggregate({
                    where,
                    _sum: {
                        finalAmount: true,
                    },
                }),
                prisma.booking.findMany({
                    where,
                    select: {
                        id: true,
                        bookingNumber: true,
                        date: true,
                        finalAmount: true,
                        venue: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                        services: {
                            select: {
                                service: {
                                    select: {
                                        id: true,
                                        name: true,
                                    },
                                },
                                price: true,
                            },
                        },
                    },
                    orderBy: { date: 'desc' },
                }),
            ]);

            res.json({
                success: true,
                totalEarnings: totalEarnings._sum.finalAmount || 0,
                bookings,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Update venue (provider's own)
     */
    static async updateVenue(req, res, next) {
        try {
            const providerId = req.user.id;
            const { id } = req.params;
            const updateData = req.body;

            // Verify ownership
            const venue = await prisma.venue.findUnique({
                where: { id },
            });

            if (!venue) {
                throw new NotFoundError('Venue');
            }

            if (venue.providerId !== providerId) {
                throw new ForbiddenError('You can only update your own venues');
            }

            // Update venue
            const updatedVenue = await prisma.venue.update({
                where: { id },
                data: updateData,
            });

            logger.info('Provider updated venue', { providerId, venueId: id });

            res.json({
                success: true,
                venue: updatedVenue,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Update service (provider's own)
     */
    static async updateService(req, res, next) {
        try {
            const providerId = req.user.id;
            const { id } = req.params;
            const updateData = req.body;

            // Verify ownership
            const service = await prisma.service.findUnique({
                where: { id },
            });

            if (!service) {
                throw new NotFoundError('Service');
            }

            if (service.providerId !== providerId) {
                throw new ForbiddenError('You can only update your own services');
            }

            // Update service
            const updatedService = await prisma.service.update({
                where: { id },
                data: updateData,
            });

            logger.info('Provider updated service', { providerId, serviceId: id });

            res.json({
                success: true,
                service: updatedService,
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = ProviderController;
