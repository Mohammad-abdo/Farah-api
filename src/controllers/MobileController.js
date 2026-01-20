const getPrisma = require('../utils/prisma');
const { NotFoundError, ValidationError } = require('../utils/errors');
const fs = require('fs');
const path = require('path');

const prisma = getPrisma();

class MobileController {
  /**
   * Get home page data (categories, top venues, popular venues, sliders)
   * GET /api/mobile/home
   */
  static async getHome(req, res, next) {
    try {
      const { limit = 5 } = req.query;

      // Fetch all data in parallel
      const [categories, topVenues, popularVenues, sliders] = await Promise.all([
        // Categories
        prisma.category.findMany({
          where: {},
          include: {
            _count: {
              select: { services: true }
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 10
        }),
        // Top rated venues
        prisma.venue.findMany({
          where: { isActive: true },
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
          orderBy: [
            { rating: 'desc' },
            { reviewCount: 'desc' },
          ],
        }),
        // Popular venues (by booking count)
        prisma.venue.findMany({
          where: { isActive: true },
          include: {
            provider: {
              select: {
                id: true,
                name: true,
              },
            },
            _count: {
              select: { bookings: true }
            }
          },
          take: parseInt(limit),
          orderBy: [
            { clients: 'desc' },
            { rating: 'desc' },
          ],
        }),
        // Active sliders
        prisma.slider.findMany({
          where: { isActive: true },
          orderBy: { order: 'asc' },
          take: 10
        })
      ]);

      res.json({
        success: true,
        data: {
          categories,
          topVenues,
          popularVenues,
          sliders,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get venues list
   * GET /api/mobile/venues
   */
  static async getVenues(req, res, next) {
    try {
      const {
        search,
        categoryId,
        minPrice,
        maxPrice,
        sortBy = 'rating',
        limit = 20,
        offset = 0,
      } = req.query;

      const where = {
        isActive: true,
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { nameAr: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
            { descriptionAr: { contains: search, mode: 'insensitive' } },
          ],
        }),
        ...(categoryId && {
          services: {
            some: {
              service: {
                categoryId: categoryId,
              },
            },
          },
        }),
        ...(minPrice && { price: { gte: parseFloat(minPrice) } }),
        ...(maxPrice && { price: { lte: parseFloat(maxPrice) } }),
      };

      let orderBy = [];
      switch (sortBy) {
        case 'price_asc':
          orderBy = [{ price: 'asc' }];
          break;
        case 'price_desc':
          orderBy = [{ price: 'desc' }];
          break;
        case 'popular':
          orderBy = [{ clients: 'desc' }, { rating: 'desc' }];
          break;
        default:
          orderBy = [{ rating: 'desc' }, { reviewCount: 'desc' }];
      }

      const [venues, total] = await Promise.all([
        prisma.venue.findMany({
          where,
          include: {
            provider: {
              select: {
                id: true,
                name: true,
                nameAr: true,
              },
            },
          },
          orderBy,
          take: parseInt(limit),
          skip: parseInt(offset),
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
   * Get venue details
   * GET /api/mobile/venues/:id
   */
  static async getVenueById(req, res, next) {
    try {
      const { id } = req.params;

      const userId = req.user?.id || null;
      
      const venue = await prisma.venue.findUnique({
        where: { id },
        include: {
          provider: {
            select: {
              id: true,
              name: true,
              nameAr: true,
              phone: true,
              email: true,
              location: true,
            },
          },
          services: {
            include: {
              service: {
                select: {
                  id: true,
                  name: true,
                  nameAr: true,
                  price: true,
                  images: true,
                  category: {
                    select: {
                      id: true,
                      name: true,
                      nameAr: true,
                    },
                  },
                },
              },
            },
          },
          reviews: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  nameAr: true,
                  avatar: true,
                },
              },
            },
            orderBy: {
              createdAt: 'desc'
            },
            take: 10
          },
          _count: {
            select: { bookings: true, reviews: true }
          }
        },
      });

      // Check if venue is in user's favorites
      let isFavorite = false;
      if (userId) {
        const favorite = await prisma.userFavoriteVenue.findUnique({
          where: {
            userId_venueId: {
              userId,
              venueId: id,
            },
          },
        });
        isFavorite = !!favorite;
      }

      if (!venue || !venue.isActive) {
        throw new NotFoundError('Venue');
      }

      res.json({
        success: true,
        venue: {
          ...venue,
          isFavorite,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get available time slots for a venue on a specific date
   * GET /api/mobile/venues/:id/available-slots?date=YYYY-MM-DD
   */
  static async getAvailableTimeSlots(req, res, next) {
    try {
      const { id } = req.params;
      const { date } = req.query;

      if (!date) {
        throw new ValidationError('Date parameter is required');
      }

      const venue = await prisma.venue.findUnique({
        where: { id },
        select: {
          workingHoursStart: true,
          workingHoursEnd: true,
        },
      });

      if (!venue) {
        throw new NotFoundError('Venue');
      }

      // Get all bookings for this venue on the specified date
      const selectedDate = new Date(date);
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      const bookings = await prisma.booking.findMany({
        where: {
          venueId: id,
          date: {
            gte: startOfDay,
            lte: endOfDay,
          },
          status: {
            not: 'CANCELLED',
          },
        },
        select: {
          startTime: true,
          endTime: true,
        },
      });

      // Get working hours (default: 9:00 - 22:00)
      const workStart = venue.workingHoursStart || '09:00';
      const workEnd = venue.workingHoursEnd || '22:00';

      // Generate all possible time slots (hourly)
      const slots = [];
      const [startHour, startMin] = workStart.split(':').map(Number);
      const [endHour, endMin] = workEnd.split(':').map(Number);

      let currentHour = startHour;
      while (currentHour < endHour || (currentHour === endHour && startMin < endMin)) {
        const slotStart = `${String(currentHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`;
        const nextHour = currentHour + 1;
        const slotEnd = `${String(nextHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`;
        
        // Check if this slot overlaps with any booking
        const isBooked = bookings.some(booking => {
          if (!booking.startTime || !booking.endTime) return false;
          
          const bookingStart = booking.startTime.split(':').map(Number);
          const bookingEnd = booking.endTime.split(':').map(Number);
          const slotStartTime = [currentHour, startMin];
          const slotEndTime = [nextHour, startMin];
          
          // Check for overlap
          return !(
            (slotEndTime[0] < bookingStart[0] || (slotEndTime[0] === bookingStart[0] && slotEndTime[1] <= bookingStart[1])) ||
            (slotStartTime[0] > bookingEnd[0] || (slotStartTime[0] === bookingEnd[0] && slotStartTime[1] >= bookingEnd[1]))
          );
        });

        slots.push({
          start: slotStart,
          end: slotEnd,
          available: !isBooked,
        });

        currentHour = nextHour;
      }

      res.json({
        success: true,
        date,
        workingHours: {
          start: workStart,
          end: workEnd,
        },
        slots,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get booked dates for a venue
   * GET /api/mobile/venues/:id/booked-dates
   */
  static async getBookedDates(req, res, next) {
    try {
      const { id } = req.params;
      const { startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate) : new Date();
      const end = endDate ? new Date(endDate) : new Date();
      end.setMonth(end.getMonth() + 3); // Default: next 3 months

      const bookings = await prisma.booking.findMany({
        where: {
          venueId: id,
          date: {
            gte: start,
            lte: end,
          },
          status: {
            not: 'CANCELLED',
          },
        },
        select: {
          date: true,
        },
      });

      // Group by date and check if fully booked
      const dateMap = new Map();
      bookings.forEach(booking => {
        const dateKey = booking.date.toISOString().split('T')[0];
        dateMap.set(dateKey, (dateMap.get(dateKey) || 0) + 1);
      });

      // Get venue working hours to check if day is fully booked
      const venue = await prisma.venue.findUnique({
        where: { id },
        select: {
          workingHoursStart: true,
          workingHoursEnd: true,
        },
      });

      const workStart = venue?.workingHoursStart || '09:00';
      const workEnd = venue?.workingHoursEnd || '22:00';
      const [startHour] = workStart.split(':').map(Number);
      const [endHour] = workEnd.split(':').map(Number);
      const totalSlots = endHour - startHour;

      const bookedDates = [];
      const fullyBookedDates = [];
      
      dateMap.forEach((count, dateKey) => {
        bookedDates.push(dateKey);
        if (count >= totalSlots) {
          fullyBookedDates.push(dateKey);
        }
      });

      res.json({
        success: true,
        bookedDates,
        fullyBookedDates,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get services list
   * GET /api/mobile/services
   */
  static async getServices(req, res, next) {
    try {
      const {
        search,
        categoryId,
        serviceType,
        worksExternal,
        worksInVenues,
        sortBy = 'rating',
        limit = 20,
        offset = 0,
      } = req.query;

      const where = {
        isActive: true,
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { nameAr: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
            { descriptionAr: { contains: search, mode: 'insensitive' } },
            { address: { contains: search, mode: 'insensitive' } },
          ],
        }),
        ...(categoryId && { categoryId }),
        ...(serviceType && { serviceType }),
        ...(worksExternal !== undefined && { worksExternal: worksExternal === 'true' }),
        ...(worksInVenues !== undefined && { worksInVenues: worksInVenues === 'true' }),
      };

      let orderBy = [];
      switch (sortBy) {
        case 'price_asc':
          orderBy = [{ price: 'asc' }];
          break;
        case 'price_desc':
          orderBy = [{ price: 'desc' }];
          break;
        default:
          orderBy = [{ rating: 'desc' }, { reviewCount: 'desc' }];
      }

      const [services, total] = await Promise.all([
        prisma.service.findMany({
          where,
          include: {
            category: {
              select: {
                id: true,
                name: true,
                nameAr: true,
              },
            },
            provider: {
              select: {
                id: true,
                name: true,
                nameAr: true,
              },
            },
          },
          orderBy,
          take: parseInt(limit),
          skip: parseInt(offset),
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
   * GET /api/mobile/services/:id
   */
  static async getServiceById(req, res, next) {
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
              nameAr: true,
              phone: true,
              email: true,
            },
          },
          reviews: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  nameAr: true,
                  avatar: true,
                },
              },
            },
            orderBy: {
              createdAt: 'desc'
            },
            take: 10
          },
          _count: {
            select: { bookings: true, reviews: true }
          }
        },
      });

      if (!service || !service.isActive) {
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
   * Check service availability
   * GET /api/mobile/services/:id/availability?date=YYYY-MM-DD&startTime=HH:mm&endTime=HH:mm
   */
  static async checkServiceAvailability(req, res, next) {
    try {
      const { id } = req.params;
      const { date, startTime, endTime } = req.query;

      if (!date) {
        return res.status(400).json({
          success: false,
          error: 'Date parameter is required',
        });
      }

      const service = await prisma.service.findUnique({
        where: { id },
        select: {
          id: true,
          workingHoursStart: true,
          workingHoursEnd: true,
          isActive: true,
        },
      });

      if (!service || !service.isActive) {
        return res.status(404).json({
          success: false,
          error: 'Service not found or inactive',
        });
      }

      const selectedDate = new Date(date);
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      // Check if service has a holiday on this date
      const holiday = await prisma.serviceHoliday.findFirst({
        where: {
          serviceId: id,
          date: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      });

      if (holiday) {
        return res.json({
          success: true,
          available: false,
          reason: holiday.reason || 'Service is not available on this date',
        });
      }

      // Check existing bookings for this service on this date
      const existingBookings = await prisma.bookingService.findMany({
        where: {
          serviceId: id,
          OR: [
            {
              date: {
                gte: startOfDay,
                lte: endOfDay,
              },
            },
            {
              booking: {
                date: {
                  gte: startOfDay,
                  lte: endOfDay,
                },
              },
            },
          ],
          booking: {
            status: {
              notIn: ['CANCELLED'],
            },
          },
        },
        include: {
          booking: {
            select: {
              date: true,
              startTime: true,
              endTime: true,
            },
          },
        },
      });

      // If specific time is requested, check for conflicts
      if (startTime && endTime) {
        const requestedStart = startTime;
        const requestedEnd = endTime;

        const hasConflict = existingBookings.some(bookingService => {
          const bookingStart = bookingService.startTime || bookingService.booking.startTime;
          const bookingEnd = bookingService.endTime || bookingService.booking.endTime;
          
          if (!bookingStart || !bookingEnd) return false;

          // Check if time ranges overlap
          return (requestedStart < bookingEnd && requestedEnd > bookingStart);
        });

        if (hasConflict) {
          return res.json({
            success: true,
            available: false,
            reason: 'Service is already booked for this time slot',
          });
        }
      }

      res.json({
        success: true,
        available: true,
        message: 'Service is available',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get categories
   * GET /api/mobile/categories
   */
  static async getCategories(req, res, next) {
    try {
      const categories = await prisma.category.findMany({
        include: {
          _count: {
            select: { services: true }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      res.json({
        success: true,
        categories,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Search venues and services
   * GET /api/mobile/search
   */
  static async search(req, res, next) {
    try {
      const { q, type = 'all', limit = 10 } = req.query;

      if (!q) {
        throw new ValidationError('Search query is required');
      }

      const results = {
        venues: [],
        services: [],
      };

      if (type === 'all' || type === 'venues') {
        try {
          results.venues = await prisma.venue.findMany({
            where: {
              isActive: true,
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { nameAr: { contains: q, mode: 'insensitive' } },
                { description: { contains: q, mode: 'insensitive' } },
                { descriptionAr: { contains: q, mode: 'insensitive' } },
              ],
            },
            include: {
              provider: {
                select: {
                  id: true,
                  name: true,
                  nameAr: true,
                },
              },
            },
            take: parseInt(limit),
          });
        } catch (error) {
          // Fallback if mode: 'insensitive' is not supported
          const searchLower = q.toLowerCase();
          results.venues = await prisma.venue.findMany({
            where: {
              isActive: true,
              OR: [
                { name: { contains: q } },
                { nameAr: { contains: q } },
                { description: { contains: q } },
                { descriptionAr: { contains: q } },
              ],
            },
            include: {
              provider: {
                select: {
                  id: true,
                  name: true,
                  nameAr: true,
                },
              },
            },
            take: parseInt(limit),
          });
          // Filter in memory for case-insensitive search
          results.venues = results.venues.filter(venue => 
            (venue.name && venue.name.toLowerCase().includes(searchLower)) ||
            (venue.nameAr && venue.nameAr.toLowerCase().includes(searchLower)) ||
            (venue.description && venue.description.toLowerCase().includes(searchLower)) ||
            (venue.descriptionAr && venue.descriptionAr.toLowerCase().includes(searchLower))
          );
        }
      }

      if (type === 'all' || type === 'services') {
        try {
          results.services = await prisma.service.findMany({
            where: {
              isActive: true,
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { nameAr: { contains: q, mode: 'insensitive' } },
                { description: { contains: q, mode: 'insensitive' } },
                { descriptionAr: { contains: q, mode: 'insensitive' } },
              ],
            },
            include: {
              category: {
                select: {
                  id: true,
                  name: true,
                  nameAr: true,
                },
              },
            },
            take: parseInt(limit),
          });
        } catch (error) {
          // Fallback if mode: 'insensitive' is not supported
          const searchLower = q.toLowerCase();
          results.services = await prisma.service.findMany({
            where: {
              isActive: true,
              OR: [
                { name: { contains: q } },
                { nameAr: { contains: q } },
                { description: { contains: q } },
                { descriptionAr: { contains: q } },
              ],
            },
            include: {
              category: {
                select: {
                  id: true,
                  name: true,
                  nameAr: true,
                },
              },
            },
            take: parseInt(limit),
          });
          // Filter in memory for case-insensitive search
          results.services = results.services.filter(service => 
            (service.name && service.name.toLowerCase().includes(searchLower)) ||
            (service.nameAr && service.nameAr.toLowerCase().includes(searchLower)) ||
            (service.description && service.description.toLowerCase().includes(searchLower)) ||
            (service.descriptionAr && service.descriptionAr.toLowerCase().includes(searchLower))
          );
        }
      }

      res.json({
        success: true,
        results,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get app settings
   * GET /api/mobile/settings
   */
  static async getSettings(req, res, next) {
    try {
      const settings = await prisma.appSettings.findFirst();

      res.json({
        success: true,
        settings: settings || {},
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get privacy policy
   * GET /api/mobile/content/privacy
   */
  static async getPrivacy(req, res, next) {
    try {
      const settings = await prisma.appSettings.findFirst();
      res.json({
        success: true,
        content: settings?.privacyPolicy || '',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get terms of service
   * GET /api/mobile/content/terms
   */
  static async getTerms(req, res, next) {
    try {
      const settings = await prisma.appSettings.findFirst();
      res.json({
        success: true,
        content: settings?.termsOfService || '',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get about us
   * GET /api/mobile/content/about
   */
  static async getAbout(req, res, next) {
    try {
      const settings = await prisma.appSettings.findFirst();
      res.json({
        success: true,
        content: settings?.aboutUs || '',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user bookings
   * GET /api/mobile/bookings
   */
  static async getBookings(req, res, next) {
    try {
      const { status, limit = 20, offset = 0 } = req.query;

      let mappedStatus = status;
      if (status === 'active') {
        mappedStatus = 'IN_PROGRESS';
      } else if (status === 'completed') {
        mappedStatus = 'COMPLETED';
      } else if (status === 'cancelled') {
        mappedStatus = 'CANCELLED';
      } else if (status === 'pending') {
        mappedStatus = 'PENDING';
      }

      const where = {
        customerId: req.user.id,
        ...(mappedStatus && { status: mappedStatus }),
      };

      const [bookings, total] = await Promise.all([
        prisma.booking.findMany({
          where,
          include: {
            venue: {
              select: {
                id: true,
                name: true,
                nameAr: true,
                images: true,
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
          orderBy: {
            createdAt: 'desc',
          },
          take: parseInt(limit),
          skip: parseInt(offset),
        }),
        prisma.booking.count({ where }),
      ]);

      res.json({
        success: true,
        bookings,
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get booking by ID
   * GET /api/mobile/bookings/:id
   */
  static async getBookingById(req, res, next) {
    try {
      const { id } = req.params;

      const booking = await prisma.booking.findUnique({
        where: { id },
        include: {
          venue: {
            include: {
              provider: {
                select: {
                  id: true,
                  name: true,
                  nameAr: true,
                  phone: true,
                },
              },
            },
          },
          services: {
            include: {
              service: {
                include: {
                  category: true,
                },
              },
            },
          },
          payments: {
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
      });

      if (!booking || booking.customerId !== req.user.id) {
        throw new NotFoundError('Booking');
      }

      res.json({
        success: true,
        booking,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get wallet
   * GET /api/mobile/wallet
   */
  static async getWallet(req, res, next) {
    try {
      const { limit = 20, offset = 0 } = req.query;

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          walletBalance: true,
        },
      });

      const transactions = await prisma.transaction.findMany({
        where: { userId: req.user.id },
        orderBy: {
          createdAt: 'desc',
        },
        take: parseInt(limit),
        skip: parseInt(offset),
      });

      res.json({
        success: true,
        wallet: {
          balance: user?.walletBalance || 0,
          transactions,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user profile
   * GET /api/mobile/profile
   */
  static async getProfile(req, res, next) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          name: true,
          nameAr: true,
          email: true,
          phone: true,
          location: true,
          locationAr: true,
          avatar: true,
          role: true,
          createdAt: true,
        },
      });

      if (!user) {
        throw new NotFoundError('User');
      }

      // Log avatar info for debugging
      console.log('Profile fetched:', {
        userId: user.id,
        hasAvatar: !!user.avatar,
        avatarLength: user.avatar?.length || 0,
        avatarPreview: user.avatar ? user.avatar.substring(0, 100) : 'No avatar',
      });

      // Ensure avatar is included in response
      const responseUser = {
        ...user,
        avatar: user.avatar || null, // Explicitly include avatar even if null
      };

      res.json({
        success: true,
        user: responseUser,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user profile
   * PATCH /api/mobile/profile
   */
  static async updateProfile(req, res, next) {
    try {
      const { name, nameAr, email, phone, location, locationAr, avatar } = req.body;
      const userId = req.user.id;
      
      // Handle file upload (new method - preferred)
      if (req.file) {
        // File was uploaded via multer
        const fileUrl = `/uploads/users/avatars/${req.file.filename}`;
        
        // Use environment variable for base URL, fallback to request-based URL
        const BASE_URL = process.env.BASE_URL || process.env.API_BASE_URL || `${req.protocol}://${req.get('host')}`;
        const fullUrl = `${BASE_URL}${fileUrl}`;
        
        console.log('File uploaded successfully:', {
          filename: req.file.filename,
          originalname: req.file.originalname,
          size: req.file.size,
          fileUrl: fileUrl,
          fullUrl: fullUrl,
          baseUrl: BASE_URL
        });
        
        // Delete old avatar file if it exists and is a file path (not base64)
        try {
          const existingUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { avatar: true }
          });
          
          if (existingUser?.avatar && existingUser.avatar.startsWith('/uploads/')) {
            const oldFilePath = path.join(__dirname, '../../', existingUser.avatar);
            if (fs.existsSync(oldFilePath)) {
              fs.unlinkSync(oldFilePath);
              console.log('Deleted old avatar file:', oldFilePath);
            }
          }
        } catch (error) {
          console.warn('Error deleting old avatar file:', error);
          // Continue even if deletion fails
        }
        
        // Store the full URL in database
        const updateData = {};
        if (name !== undefined) updateData.name = name?.trim() || null;
        if (nameAr !== undefined) updateData.nameAr = nameAr?.trim() || null;
        if (email !== undefined) updateData.email = email?.trim() || null;
        if (phone !== undefined) updateData.phone = phone.trim();
        if (location !== undefined) updateData.location = location ? location.trim() : null;
        if (locationAr !== undefined) updateData.locationAr = locationAr ? locationAr.trim() : null;
        updateData.avatar = fullUrl; // Store full URL
        
        // Validate required fields
        if (!updateData.name && !updateData.nameAr) {
          const existingUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { name: true, nameAr: true },
          });
          if (!existingUser?.name && !existingUser?.nameAr) {
            // Delete uploaded file if validation fails
            fs.unlinkSync(req.file.path);
            return res.status(400).json({
              success: false,
              error: 'Name (Arabic or English) is required',
            });
          }
        }
        
        if (!updateData.phone) {
          const existingUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { phone: true },
          });
          if (!existingUser?.phone) {
            // Delete uploaded file if validation fails
            fs.unlinkSync(req.file.path);
            return res.status(400).json({
              success: false,
              error: 'Phone number is required',
            });
          }
        }
        
        const updatedUser = await prisma.user.update({
          where: { id: userId },
          data: updateData,
          select: {
            id: true,
            name: true,
            nameAr: true,
            email: true,
            phone: true,
            location: true,
            locationAr: true,
            avatar: true,
            role: true,
            isActive: true,
            createdAt: true,
          },
        });
        
        console.log('Profile updated with file upload:', {
          userId: updatedUser.id,
          avatarUrl: updatedUser.avatar
        });
        
        return res.json({
          success: true,
          user: updatedUser,
          message: 'Profile updated successfully',
        });
      }

      // Validate required fields
      if (!name && !nameAr) {
        return res.status(400).json({
          success: false,
          error: 'Name (Arabic or English) is required',
        });
      }

      if (!phone) {
        return res.status(400).json({
          success: false,
          error: 'Phone number is required',
        });
      }

      // Prepare update data - only include fields that are provided
      const updateData = {};
      
      if (name !== undefined) {
        updateData.name = name.trim() || null;
      }
      if (nameAr !== undefined) {
        updateData.nameAr = nameAr.trim() || null;
      }
      if (email !== undefined) {
        updateData.email = email.trim() || null;
      }
      if (phone !== undefined) {
        updateData.phone = phone.trim();
      }
      if (location !== undefined) {
        updateData.location = location ? location.trim() : null;
      }
      if (locationAr !== undefined) {
        updateData.locationAr = locationAr ? locationAr.trim() : null;
      }
      if (avatar !== undefined) {
        // Validate avatar is a valid base64 string or data URL
        if (avatar && typeof avatar === 'string' && avatar.trim().length > 0) {
          // Check if it's a data URL or base64
          const trimmedAvatar = avatar.trim();
          
          // Log avatar info for debugging
          console.log('Avatar update received:', {
            length: trimmedAvatar.length,
            startsWithData: trimmedAvatar.startsWith('data:image/'),
            first100: trimmedAvatar.substring(0, 100),
            last50: trimmedAvatar.substring(Math.max(0, trimmedAvatar.length - 50)),
          });
          
          if (trimmedAvatar.startsWith('data:image/') || trimmedAvatar.length > 100) {
            updateData.avatar = trimmedAvatar;
            console.log('Avatar accepted for update, length:', trimmedAvatar.length);
          } else {
            console.warn('Invalid avatar format received - too short or invalid format');
          }
        } else if (avatar === null || avatar === '') {
          updateData.avatar = null;
          console.log('Avatar set to null (removing avatar)');
        }
      }

      // Ensure at least one name exists
      if (!updateData.name && !updateData.nameAr) {
        // Try to get existing names from database
        const existingUser = await prisma.user.findUnique({
          where: { id: userId },
          select: { name: true, nameAr: true },
        });
        
        if (!existingUser.name && !existingUser.nameAr) {
          return res.status(400).json({
            success: false,
            error: 'Name (Arabic or English) is required',
          });
        }
      }

      console.log('Updating user profile:', {
        userId,
        fieldsToUpdate: Object.keys(updateData),
        hasAvatar: !!updateData.avatar,
      });

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          name: true,
          nameAr: true,
          email: true,
          phone: true,
          location: true,
          locationAr: true,
          avatar: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
      });

      console.log('Profile updated successfully:', {
        userId: updatedUser.id,
        name: updatedUser.name,
        hasAvatar: !!updatedUser.avatar,
        avatarLength: updatedUser.avatar?.length || 0,
        avatarPreview: updatedUser.avatar ? updatedUser.avatar.substring(0, 100) : 'No avatar',
      });

      // Ensure avatar is included in response
      const responseUser = {
        ...updatedUser,
        avatar: updatedUser.avatar || null, // Explicitly include avatar even if null
      };

      res.json({
        success: true,
        user: responseUser,
        message: 'Profile updated successfully',
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      
      // Handle Prisma errors
      if (error.code === 'P2002') {
        return res.status(400).json({
          success: false,
          error: 'Phone number or email already exists',
        });
      }

      if (error.code === 'P2025') {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }

      next(error);
    }
  }

  /**
   * Delete user profile
   * DELETE /api/mobile/profile
   */
  static async deleteProfile(req, res, next) {
    try {
      await prisma.user.delete({
        where: { id: req.user.id },
      });

      res.json({
        success: true,
        message: 'Account deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get notifications
   * GET /api/mobile/notifications
   */
  static async getNotifications(req, res, next) {
    try {
      const { limit = 20, offset = 0 } = req.query;

      const [notifications, total, unreadCount] = await Promise.all([
        prisma.notification.findMany({
          where: { userId: req.user.id },
          orderBy: {
            createdAt: 'desc',
          },
          take: parseInt(limit),
          skip: parseInt(offset),
        }),
        prisma.notification.count({ where: { userId: req.user.id } }),
        prisma.notification.count({ 
          where: { 
            userId: req.user.id,
            isRead: false 
          } 
        }),
      ]);

      res.json({
        success: true,
        notifications,
        total,
        unreadCount,
        limit: parseInt(limit),
        offset: parseInt(offset),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mark notification as read
   * PATCH /api/mobile/notifications/:id/read
   */
  static async markNotificationAsRead(req, res, next) {
    try {
      const { id } = req.params;

      const notification = await prisma.notification.update({
        where: { id },
        data: { isRead: true },
      });

      res.json({
        success: true,
        notification,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add venue to favorites
   * POST /api/mobile/venues/:id/favorite
   */
  static async addToFavorites(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Check if venue exists
      const venue = await prisma.venue.findUnique({
        where: { id },
      });

      if (!venue) {
        throw new NotFoundError('Venue');
      }

      // Check if already favorited
      const existing = await prisma.userFavoriteVenue.findUnique({
        where: {
          userId_venueId: {
            userId,
            venueId: id,
          },
        },
      });

      if (existing) {
        return res.json({
          success: true,
          message: 'Venue already in favorites',
        });
      }

      // Add to favorites
      await prisma.userFavoriteVenue.create({
        data: {
          userId,
          venueId: id,
        },
      });

      res.json({
        success: true,
        message: 'Venue added to favorites',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Remove venue from favorites
   * DELETE /api/mobile/venues/:id/favorite
   */
  static async removeFromFavorites(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      await prisma.userFavoriteVenue.delete({
        where: {
          userId_venueId: {
            userId,
            venueId: id,
          },
        },
      });

      res.json({
        success: true,
        message: 'Venue removed from favorites',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user favorites
   * GET /api/mobile/favorites
   */
  static async getFavorites(req, res, next) {
    try {
      const favorites = await prisma.userFavoriteVenue.findMany({
        where: { userId: req.user.id },
        include: {
          venue: {
            include: {
              provider: {
                select: {
                  id: true,
                  name: true,
                  nameAr: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      res.json({
        success: true,
        favorites: favorites.map(fav => fav.venue),
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = MobileController;
