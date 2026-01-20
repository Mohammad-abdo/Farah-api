const getPrisma = require('../utils/prisma');
const { NotFoundError, ValidationError, ForbiddenError } = require('../utils/errors');

const prisma = getPrisma();

class ReviewsController {
  /**
   * Get all reviews
   */
  static async getAll(req, res, next) {
    try {
      const { venueId, serviceId, userId, limit = 10, offset = 0 } = req.query;

      const where = {
        ...(venueId && { venueId }),
        ...(serviceId && { serviceId }),
        ...(userId && { userId }),
      };

      const [reviews, total] = await Promise.all([
        prisma.review.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
            venue: {
              select: {
                id: true,
                name: true,
                nameAr: true,
              },
            },
            service: {
              select: {
                id: true,
                name: true,
                nameAr: true,
              },
            },
          },
          take: parseInt(limit),
          skip: parseInt(offset),
          orderBy: { createdAt: 'desc' },
        }),
        prisma.review.count({ where }),
      ]);

      res.json({
        success: true,
        reviews,
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create review
   */
  static async create(req, res, next) {
    try {
      const { venueId, serviceId, rating, comment } = req.body;

      // Validation
      if (!rating || rating < 1 || rating > 5) {
        throw new ValidationError('Rating must be between 1 and 5');
      }

      if (!venueId && !serviceId) {
        throw new ValidationError('Either venueId or serviceId is required');
      }

      // Create review
      const review = await prisma.review.create({
        data: {
          userId: req.user.id,
          venueId: venueId || null,
          serviceId: serviceId || null,
          rating: parseInt(rating),
          comment,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
          venue: {
            select: {
              id: true,
              name: true,
              nameAr: true,
            },
          },
          service: {
            select: {
              id: true,
              name: true,
              nameAr: true,
            },
          },
        },
      });

      // Update venue/service rating
      if (venueId) {
        await updateVenueRating(venueId);
      } else if (serviceId) {
        await updateServiceRating(serviceId);
      }

      res.status(201).json({
        success: true,
        review,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete review
   */
  static async delete(req, res, next) {
    try {
      const { id } = req.params;

      const review = await prisma.review.findUnique({
        where: { id },
      });

      if (!review) {
        throw new NotFoundError('Review');
      }

      // Check if user has access (owner or admin)
      if (req.user.role !== 'ADMIN' && review.userId !== req.user.id) {
        throw new ForbiddenError('You do not have access to this review');
      }

      await prisma.review.delete({
        where: { id },
      });

      // Update venue/service rating
      if (review.venueId) {
        await updateVenueRating(review.venueId);
      } else if (review.serviceId) {
        await updateServiceRating(review.serviceId);
      }

      res.json({
        success: true,
        message: 'Review deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

// Helper function to update venue rating
async function updateVenueRating(venueId) {
  const reviews = await prisma.review.findMany({
    where: { venueId },
    select: { rating: true },
  });

  if (reviews.length > 0) {
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    await prisma.venue.update({
      where: { id: venueId },
      data: {
        rating: avgRating,
        reviewCount: reviews.length,
      },
    });
  }
}

// Helper function to update service rating
async function updateServiceRating(serviceId) {
  const reviews = await prisma.review.findMany({
    where: { serviceId },
    select: { rating: true },
  });

  if (reviews.length > 0) {
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    await prisma.service.update({
      where: { id: serviceId },
      data: {
        rating: avgRating,
        reviewCount: reviews.length,
      },
    });
  }
}

module.exports = ReviewsController;



