const getPrisma = require('../utils/prisma');
const { NotFoundError, ValidationError } = require('../utils/errors');

const prisma = getPrisma();

class VenuesController {
  /**
   * Get all venues
   */
  static async getAll(req, res, next) {
    try {
      const { search, limit = 10, offset = 0, categoryId } = req.query;

      const where = {
        isActive: true,
        ...(search && {
          OR: [
            { name: { contains: search } },
            { nameAr: { contains: search } },
            { location: { contains: search } },
          ],
        }),
        // Note: Venues don't have direct category relation
        // If categoryId is provided, we'll filter by services in that category
        // For now, we'll just ignore categoryId for venues
      };

      const [venues, total] = await Promise.all([
        prisma.venue.findMany({
          where,
          include: {
            provider: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
          },
          take: parseInt(limit),
          skip: parseInt(offset),
          orderBy: [
            { rating: 'desc' },
            { reviewCount: 'desc' },
          ],
        }),
        prisma.venue.count({ where }),
      ]);

      res.json({
        success: true,
        venues,
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get top rated venues
   */
  static async getTop(req, res, next) {
    try {
      const { limit = 5 } = req.query;

      const venues = await prisma.venue.findMany({
        where: { isActive: true },
        include: {
          provider: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        take: parseInt(limit),
        orderBy: [
          { rating: 'desc' },
          { reviewCount: 'desc' },
        ],
      });

      res.json({
        success: true,
        venues,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get popular venues
   */
  static async getPopular(req, res, next) {
    try {
      const { limit = 5 } = req.query;

      const venues = await prisma.venue.findMany({
        where: { isActive: true },
        include: {
          provider: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        take: parseInt(limit),
        orderBy: [
          { clients: 'desc' },
          { reviewCount: 'desc' },
        ],
      });

      res.json({
        success: true,
        venues,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get venue by ID
   */
  static async getById(req, res, next) {
    try {
      const { id } = req.params;

      const venue = await prisma.venue.findUnique({
        where: { id },
        include: {
          provider: {
            select: {
              id: true,
              name: true,
              phone: true,
              location: true,
            },
          },
          reviews: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  avatar: true,
                },
              },
            },
            orderBy: {
              createdAt: 'desc',
            },
            take: 10,
          },
        },
      });

      if (!venue) {
        throw new NotFoundError('Venue');
      }

      res.json({
        success: true,
        venue,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = VenuesController;



