const getPrisma = require('../utils/prisma');
const { NotFoundError } = require('../utils/errors');

const prisma = getPrisma();

class ServicesController {
  /**
   * Get all services
   */
  static async getAll(req, res, next) {
    try {
      const { categoryId, search, limit = 10, offset = 0 } = req.query;

      const where = {
        isActive: true,
        ...(categoryId && { categoryId }),
        ...(search && {
          OR: [
            { name: { contains: search } },
            { nameAr: { contains: search } },
            { location: { contains: search } },
          ],
        }),
      };

      const [services, total] = await Promise.all([
        prisma.service.findMany({
          where,
          include: {
            category: true,
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
        prisma.service.count({ where }),
      ]);

      res.json({
        success: true,
        services,
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get service by ID
   */
  static async getById(req, res, next) {
    try {
      const { id } = req.params;

      const service = await prisma.service.findUnique({
        where: { id },
        include: {
          category: true,
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

      if (!service) {
        throw new NotFoundError('Service');
      }

      res.json({
        success: true,
        service,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get services by category
   */
  static async getByCategory(req, res, next) {
    try {
      const { categoryId } = req.params;
      const { limit = 10, offset = 0 } = req.query;

      const services = await prisma.service.findMany({
        where: {
          categoryId,
          isActive: true,
        },
        include: {
          category: true,
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
      });

      res.json({
        success: true,
        services,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ServicesController;

