const getPrisma = require('../utils/prisma');
const { NotFoundError, ValidationError } = require('../utils/errors');
const { getFileUrl, deleteOldFile } = require('../utils/upload');
const fs = require('fs');
const path = require('path');

const prisma = getPrisma();

class AdminController {
  /**
   * Get admin profile
   */
  static async getProfile(req, res, next) {
    try {
      const userId = req.user.id;

      const user = await prisma.user.findUnique({
        where: { id: userId },
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

      if (!user) {
        throw new NotFoundError('User not found');
      }

      res.json({
        success: true,
        user,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update admin profile
   */
  static async updateProfile(req, res, next) {
    try {
      const userId = req.user.id;
      const { name, nameAr, email, phone, location, locationAr, avatar, password } = req.body;

      const updateData = {
        ...(name !== undefined && { name }),
        ...(nameAr !== undefined && { nameAr }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
        ...(location !== undefined && { location }),
        ...(locationAr !== undefined && { locationAr }),
        ...(avatar !== undefined && { avatar }),
      };

      // Hash password if provided
      if (password) {
        const bcrypt = require('bcryptjs');
        updateData.password = await bcrypt.hash(password, 10);
      }

      const user = await prisma.user.update({
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

      res.json({
        success: true,
        user,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get dashboard statistics
   */
  static async getStats(req, res, next) {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const [
        totalUsers,
        totalVenues,
        totalServices,
        totalBookings,
        totalRevenue,
        pendingBookings,
        activeVenues,
        activeServices,
        adminUsers,
        providerUsers,
        customerUsers,
        completedBookings,
        confirmedBookings,
        cancelledBookings,
        pendingPayments,
        paidPayments,
        totalPayments,
        monthlyRevenue,
        monthlyBookings,
        monthlyUsers,
        recentBookings,
        recentUsers,
      ] = await Promise.all([
        prisma.user.count(),
        prisma.venue.count(),
        prisma.service.count(),
        prisma.booking.count(),
        prisma.booking.aggregate({
          _sum: { finalAmount: true },
          where: { paymentStatus: 'PAID' },
        }),
        prisma.booking.count({ where: { status: 'PENDING' } }),
        prisma.venue.count({ where: { isActive: true } }),
        prisma.service.count({ where: { isActive: true } }),
        prisma.user.count({ where: { role: 'ADMIN' } }),
        prisma.user.count({ where: { role: 'PROVIDER' } }),
        prisma.user.count({ where: { role: 'CUSTOMER' } }),
        prisma.booking.count({ where: { status: 'COMPLETED' } }),
        prisma.booking.count({ where: { status: 'CONFIRMED' } }),
        prisma.booking.count({ where: { status: 'CANCELLED' } }),
        prisma.payment.count({ where: { status: 'PENDING' } }),
        prisma.payment.count({ where: { status: 'PAID' } }),
        prisma.payment.count(),
        prisma.booking.aggregate({
          _sum: { finalAmount: true },
          where: {
            paymentStatus: 'PAID',
            createdAt: { gte: startOfMonth },
          },
        }),
        prisma.booking.count({
          where: { createdAt: { gte: startOfMonth } },
        }),
        prisma.user.count({
          where: { createdAt: { gte: startOfMonth } },
        }),
        prisma.booking.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            customer: { select: { id: true, name: true, phone: true } },
            venue: { select: { id: true, name: true, nameAr: true } },
          },
        }),
        prisma.user.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            role: true,
            createdAt: true,
          },
        }),
      ]);

      res.json({
        success: true,
        stats: {
          totalUsers,
          totalVenues,
          totalServices,
          totalBookings,
          totalRevenue: totalRevenue._sum.finalAmount || 0,
          pendingBookings,
          activeVenues,
          activeServices,
          usersByRole: {
            admin: adminUsers,
            provider: providerUsers,
            customer: customerUsers,
          },
          bookingsByStatus: {
            completed: completedBookings,
            confirmed: confirmedBookings,
            cancelled: cancelledBookings,
          },
          payments: {
            pending: pendingPayments,
            paid: paidPayments,
            total: totalPayments,
          },
          monthly: {
            revenue: monthlyRevenue._sum.finalAmount || 0,
            bookings: monthlyBookings,
            users: monthlyUsers,
          },
          recentBookings,
          recentUsers,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a new user (admin)
   */
  static async createUser(req, res, next) {
    try {
      const { name, nameAr, email, phone, password, role, location, locationAr, isActive } = req.body;

      // Validation
      if ((!name || name.trim() === '') && (!nameAr || nameAr.trim() === '')) {
        throw new ValidationError('Name (Arabic or English) is required');
      }
      if (!phone || phone.trim() === '') {
        throw new ValidationError('Phone number is required');
      }

      // Check if phone number already exists
      const existingUserByPhone = await prisma.user.findUnique({
        where: { phone },
      });

      if (existingUserByPhone) {
        throw new ValidationError('Phone number already exists');
      }

      // Check if email already exists (if provided)
      if (email && email.trim() !== '') {
        const existingUserByEmail = await prisma.user.findFirst({
          where: { email: email.trim() },
        });

        if (existingUserByEmail) {
          throw new ValidationError('Email already exists');
        }
      }

      // Ensure at least one name is provided
      const finalName = name || nameAr || `User ${phone.slice(-4)}`;
      const finalNameAr = nameAr || name || `مستخدم ${phone.slice(-4)}`;

      // Hash password if provided
      const bcrypt = require('bcryptjs');
      const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

      // Create user
      const user = await prisma.user.create({
        data: {
          name: finalName,
          nameAr: finalNameAr,
          phone,
          email: email || null,
          password: hashedPassword,
          location: location || null,
          locationAr: locationAr || location || null,
          role: role || 'CUSTOMER',
          isActive: isActive !== undefined ? isActive : true,
        },
        select: {
          id: true,
          name: true,
          nameAr: true,
          phone: true,
          email: true,
          location: true,
          locationAr: true,
          role: true,
          avatar: true,
          isActive: true,
          createdAt: true,
        },
      });

      res.status(201).json({
        success: true,
        user,
        message: 'User created successfully',
      });
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ValidationError('Phone number or email already exists');
      }
      next(error);
    }
  }

  /**
   * Get all users (admin)
   */
  static async getUsers(req, res, next) {
    try {
      const { role, search, limit = 10, offset = 0 } = req.query;

      const where = {
        ...(role && { role }),
        ...(search && {
          OR: [
            { name: { contains: search } },
            { phone: { contains: search } },
            { email: { contains: search } },
          ],
        }),
      };

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            role: true,
            location: true,
            avatar: true,
            isActive: true,
            lastLogin: true,
            createdAt: true,
            updatedAt: true,
          },
          take: parseInt(limit),
          skip: parseInt(offset),
          orderBy: { createdAt: 'desc' },
        }),
        prisma.user.count({ where }),
      ]);

      res.json({
        success: true,
        users,
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user
   */
  static async updateUser(req, res, next) {
    try {
      const { id } = req.params;
      const { name, email, phone, role, location, isActive } = req.body;

      const user = await prisma.user.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(email !== undefined && { email }),
          ...(phone && { phone }),
          ...(role && { role }),
          ...(location !== undefined && { location }),
          ...(isActive !== undefined && { isActive }),
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          location: true,
          avatar: true,
          isActive: true,
          createdAt: true,
        },
      });

      res.json({
        success: true,
        user,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user status
   */
  static async updateUserStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { isActive } = req.body;

      const user = await prisma.user.update({
        where: { id },
        data: { isActive },
        select: {
          id: true,
          name: true,
          isActive: true,
        },
      });

      res.json({
        success: true,
        user,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete user
   */
  static async deleteUser(req, res, next) {
    try {
      const { id } = req.params;

      await prisma.user.delete({
        where: { id },
      });

      res.json({
        success: true,
        message: 'User deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all venues (admin)
   */
  static async getVenues(req, res, next) {
    try {
      const { isActive, search, limit = 10, offset = 0 } = req.query;

      const where = {
        ...(isActive !== undefined && { isActive: isActive === 'true' }),
        ...(search && {
          OR: [
            { name: { contains: search } },
            { nameAr: { contains: search } },
            { location: { contains: search } },
          ],
        }),
      };

      const [venues, total] = await Promise.all([
        prisma.venue.findMany({
          where,
          include: {
            provider: {
              select: {
                id: true,
                name: true,
                nameAr: true,
                phone: true,
              },
            },
            _count: {
              select: {
                bookings: true,
              },
            },
          },
          take: parseInt(limit),
          skip: parseInt(offset),
          orderBy: { createdAt: 'desc' },
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
   * Update venue status
   */
  static async updateVenueStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { isActive } = req.body;

      const venue = await prisma.venue.update({
        where: { id },
        data: { isActive },
        select: {
          id: true,
          name: true,
          nameAr: true,
          isActive: true,
        },
      });

      res.json({
        success: true,
        venue,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create venue
   */
  static async createVenue(req, res, next) {
    try {
      const {
        name,
        nameAr,
        description,
        descriptionAr,
        price,
        pricePerHour,
        commission,
        providerId,
        images,
        location,
        address,
        latitude,
        longitude,
        capacity,
        serviceIds = [],
      } = req.body;

      // Validate required fields
      if (!name || !nameAr || !price || !providerId || !location) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: name, nameAr, price, providerId, location',
        });
      }

      // Check if provider exists
      const provider = await prisma.user.findUnique({
        where: { id: providerId },
      });

      if (!provider) {
        return res.status(404).json({
          success: false,
          error: 'Provider not found',
        });
      }

      // Handle images - prioritize file uploads over base64
      let imagesArray = [];
      
      // First, handle uploaded files (new method - preferred)
      if (req.files && req.files.images && req.files.images.length > 0) {
        imagesArray = req.files.images.map(file => {
          const imagePath = `/uploads/venues/${file.filename}`;
          return getFileUrl(req, imagePath);
        });
        console.log('Venue images uploaded as files:', imagesArray.length);
      } else if (images !== undefined && images !== null) {
        // Fallback to base64 for backward compatibility
        if (Array.isArray(images)) {
          imagesArray = images
            .filter(img => img && typeof img === 'string' && img.trim() !== '')
            .map(img => {
              // If it's already a URL, use it directly
              if (img.startsWith('http://') || img.startsWith('https://')) {
                return img;
              }
              // Otherwise, treat as base64
              const maxSize = 1000000; // 1MB limit for base64
              if (img.length > maxSize) {
                console.warn(`Image too large (${img.length} chars), skipping`);
                return null;
              }
              return img;
            })
            .filter(img => img !== null)
            .slice(0, 10); // Limit to maximum 10 images
        } else if (typeof images === 'string' && images.trim() !== '') {
          if (images.startsWith('http://') || images.startsWith('https://')) {
            imagesArray = [images];
          } else {
            const maxSize = 1000000;
            if (images.length <= maxSize) {
              imagesArray = [images];
            } else {
              console.warn(`Single image too large (${images.length} chars), skipping`);
            }
          }
        }
      }
      
      console.log('Venue images array length:', imagesArray.length);

      // Prepare venue data
      const venueData = {
        name: name.trim(),
        nameAr: nameAr.trim(),
        description: description ? description.trim() : null,
        descriptionAr: descriptionAr ? descriptionAr.trim() : null,
        price: parseFloat(price) || 0,
        pricePerHour: (pricePerHour && pricePerHour !== '' && !isNaN(pricePerHour)) ? parseFloat(pricePerHour) : null,
        commission: commission ? parseFloat(commission) : 10.0,
        providerId: providerId.trim(),
        images: imagesArray,
        location: location.trim(),
        address: address ? address.trim() : null,
        latitude: (latitude && latitude !== '' && !isNaN(latitude)) ? parseFloat(latitude) : null,
        longitude: (longitude && longitude !== '' && !isNaN(longitude)) ? parseFloat(longitude) : null,
        capacity: (capacity && capacity !== '' && !isNaN(capacity)) ? parseInt(capacity) : null,
        isActive: true,
      };

      console.log('Creating venue with data:', JSON.stringify(venueData, null, 2));

      // Validate price is positive
      if (venueData.price <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Price must be greater than 0',
        });
      }

      // Create venue first (without services relation)
      let venue;
      try {
        venue = await prisma.venue.create({
          data: venueData,
          include: {
            provider: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
          },
        });
        console.log('Venue created successfully:', venue.id);
      } catch (createError) {
        console.error('Error creating venue:', createError);
        console.error('Venue data that failed:', venueData);
        throw createError;
      }

      // Add services relation after venue creation if serviceIds is provided
      if (serviceIds && Array.isArray(serviceIds) && serviceIds.length > 0) {
        // Validate that all serviceIds exist
        const existingServices = await prisma.service.findMany({
          where: {
            id: { in: serviceIds },
          },
          select: { id: true },
        });

        if (existingServices.length !== serviceIds.length) {
          // Delete the venue if services validation fails
          await prisma.venue.delete({ where: { id: venue.id } });
          return res.status(400).json({
            success: false,
            error: 'One or more services not found',
          });
        }

        // Create venue-service relations
        await prisma.venueService.createMany({
          data: serviceIds.map(serviceId => ({
            venueId: venue.id,
            serviceId,
          })),
          skipDuplicates: true,
        });
      }

      // Fetch venue with all relations
      const venueWithRelations = await prisma.venue.findUnique({
        where: { id: venue.id },
        include: {
          provider: {
            select: {
              id: true,
              name: true,
              phone: true,
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
                },
              },
            },
          },
        },
      });

      res.json({
        success: true,
        venue: venueWithRelations,
      });
    } catch (error) {
      console.error('Error creating venue:', error);
      console.error('Error message:', error.message);
      console.error('Error code:', error.code);
      console.error('Error meta:', error.meta);
      
      // Return more detailed error message
      if (error.code === 'P2002') {
        return res.status(400).json({
          success: false,
          error: 'Venue with this name already exists',
        });
      }
      if (error.code === 'P2003') {
        return res.status(400).json({
          success: false,
          error: 'Invalid provider or service reference',
        });
      }
      
      // Return a more user-friendly error message
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to create venue. Please check all fields and try again.',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      });
    }
  }

  /**
   * Update venue
   */
  static async updateVenue(req, res, next) {
    try {
      const { id } = req.params;
      const {
        name,
        nameAr,
        description,
        descriptionAr,
        price,
        pricePerHour,
        commission,
        providerId,
        images,
        location,
        address,
        latitude,
        longitude,
        capacity,
        isActive,
        serviceIds,
      } = req.body;

      // Check if venue exists
      const existingVenue = await prisma.venue.findUnique({
        where: { id },
      });

      if (!existingVenue) {
        return res.status(404).json({
          success: false,
          error: 'Venue not found',
        });
      }

      // If providerId is being updated, check if provider exists
      if (providerId && providerId !== existingVenue.providerId) {
        const provider = await prisma.user.findUnique({
          where: { id: providerId },
        });

        if (!provider) {
          return res.status(404).json({
            success: false,
            error: 'Provider not found',
          });
        }
      }

      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (nameAr !== undefined) updateData.nameAr = nameAr;
      if (description !== undefined) updateData.description = description || null;
      if (descriptionAr !== undefined) updateData.descriptionAr = descriptionAr || null;
      if (price !== undefined) updateData.price = parseFloat(price);
      if (pricePerHour !== undefined) updateData.pricePerHour = pricePerHour ? parseFloat(pricePerHour) : null;
      if (commission !== undefined) updateData.commission = parseFloat(commission);
      if (providerId !== undefined) updateData.providerId = providerId;
      
      // Handle images - prioritize file uploads
      if (req.files && req.files.images && req.files.images.length > 0) {
        // Delete old images if they're file paths
        if (existingVenue.images && Array.isArray(existingVenue.images)) {
          existingVenue.images.forEach(img => {
            if (typeof img === 'string' && img.startsWith('/uploads/')) {
              deleteOldFile(img);
            }
          });
        }
        // Add new uploaded images
        const newImageUrls = req.files.images.map(file => {
          const imagePath = `/uploads/venues/${file.filename}`;
          return getFileUrl(req, imagePath);
        });
        // Merge with existing images if needed, or replace entirely
        updateData.images = newImageUrls;
        console.log('Venue images updated with files:', newImageUrls.length);
      } else if (images !== undefined) {
        // Fallback to base64 or URL array
        if (Array.isArray(images)) {
          updateData.images = images.filter(img => img && typeof img === 'string');
        } else if (typeof images === 'string') {
          updateData.images = [images];
        }
      }
      
      if (location !== undefined) updateData.location = location;
      if (address !== undefined) updateData.address = address || null;
      if (latitude !== undefined) updateData.latitude = latitude ? parseFloat(latitude) : null;
      if (longitude !== undefined) updateData.longitude = longitude ? parseFloat(longitude) : null;
      if (capacity !== undefined) updateData.capacity = capacity ? parseInt(capacity) : null;
      if (isActive !== undefined) updateData.isActive = isActive;

      // Handle services update
      if (serviceIds !== undefined) {
        // Delete existing venue services
        await prisma.venueService.deleteMany({
          where: { venueId: id },
        });
        
        // Create new venue services
        if (Array.isArray(serviceIds) && serviceIds.length > 0) {
          updateData.services = {
            create: serviceIds.map(serviceId => ({
              serviceId,
            })),
          };
        }
      }

      const venue = await prisma.venue.update({
        where: { id },
        data: updateData,
        include: {
          provider: {
            select: {
              id: true,
              name: true,
              phone: true,
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
                },
              },
            },
          },
        },
      });

      res.json({
        success: true,
        venue,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get venue by ID
   */
  static async getVenueById(req, res, next) {
    try {
      const { id } = req.params;

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
                },
              },
            },
          },
          _count: {
            select: {
              bookings: true,
              reviews: true,
            },
          },
        },
      });

      if (!venue) {
        return res.status(404).json({
          success: false,
          error: 'Venue not found',
        });
      }

      res.json({
        success: true,
        venue,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete venue
   */
  static async deleteVenue(req, res, next) {
    try {
      const { id } = req.params;

      await prisma.venue.delete({
        where: { id },
      });

      res.json({
        success: true,
        message: 'Venue deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all services (admin)
   */
  static async getServices(req, res, next) {
    try {
      const { 
        isActive, 
        search, 
        serviceType,
        categoryId,
        providerId,
        worksInVenues,
        worksExternal,
        limit = 10, 
        offset = 0 
      } = req.query;

      const where = {
        ...(isActive !== undefined && { isActive: isActive === 'true' }),
        ...(serviceType && { serviceType }),
        ...(categoryId && { categoryId }),
        ...(providerId && { providerId }),
        ...(worksInVenues !== undefined && { worksInVenues: worksInVenues === 'true' }),
        ...(worksExternal !== undefined && { worksExternal: worksExternal === 'true' }),
        ...(search && {
          OR: [
            { name: { contains: search } },
            { nameAr: { contains: search } },
            { location: { contains: search } },
            { address: { contains: search } },
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
                nameAr: true,
                phone: true,
              },
            },
            _count: {
              select: {
                bookings: true,
              },
            },
          },
          take: parseInt(limit),
          skip: parseInt(offset),
          orderBy: { createdAt: 'desc' },
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
   * Update service status
   */
  static async updateServiceStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { isActive } = req.body;

      const service = await prisma.service.update({
        where: { id },
        data: { isActive },
        select: {
          id: true,
          name: true,
          nameAr: true,
          isActive: true,
        },
      });

      res.json({
        success: true,
        service,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create service
   */
  static async createService(req, res, next) {
    try {
      const {
        name,
        nameAr,
        description,
        descriptionAr,
        price,
        pricePerHour,
        commission,
        categoryId,
        providerId,
        serviceType = 'OTHER',
        images = [],
        location,
        address,
        latitude,
        longitude,
        worksInVenues = true,
        worksExternal = true,
        requiresVenue = false,
        workingHoursStart,
        workingHoursEnd,
      } = req.body;

      // Validate required fields
      if (!name || !nameAr || !price || !categoryId || !providerId) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: name, nameAr, price, categoryId, providerId',
        });
      }

      // Validate serviceType
      const validServiceTypes = ['VENUE', 'FOOD_PROVIDER', 'PHOTOGRAPHER', 'CAR', 'DECORATION', 'DJ', 'FLORIST', 'OTHER'];
      if (!validServiceTypes.includes(serviceType)) {
        return res.status(400).json({
          success: false,
          error: `Invalid serviceType. Must be one of: ${validServiceTypes.join(', ')}`,
        });
      }

      // Check if category exists
      const category = await prisma.category.findUnique({
        where: { id: categoryId },
      });

      if (!category) {
        return res.status(404).json({
          success: false,
          error: 'Category not found',
        });
      }

      // Check if provider exists
      const provider = await prisma.user.findUnique({
        where: { id: providerId },
      });

      if (!provider) {
        return res.status(404).json({
          success: false,
          error: 'Provider not found',
        });
      }

      // Handle images - prioritize file uploads over base64
      let imagesArray = [];
      
      // First, handle uploaded files (new method - preferred)
      if (req.files && req.files.images && req.files.images.length > 0) {
        imagesArray = req.files.images.map(file => {
          const imagePath = `/uploads/services/${file.filename}`;
          return getFileUrl(req, imagePath);
        });
      } else if (images !== undefined && images !== null) {
        // Fallback to base64 for backward compatibility
        if (Array.isArray(images)) {
          imagesArray = images
            .filter(img => img && typeof img === 'string' && img.trim() !== '')
            .map(img => {
              // If it's already a URL, use it directly
              if (img.startsWith('http://') || img.startsWith('https://')) {
                return img;
              }
              return img; // Base64
            })
            .slice(0, 10); // Limit to maximum 10 images
        } else if (typeof images === 'string' && images.trim() !== '') {
          if (images.startsWith('http://') || images.startsWith('https://')) {
            imagesArray = [images];
          } else {
            imagesArray = [images]; // Base64
          }
        }
      }
      

      // Prepare service data
      const serviceData = {
        name: name.trim(),
        nameAr: nameAr.trim(),
        description: description ? description.trim() : null,
        descriptionAr: descriptionAr ? descriptionAr.trim() : null,
        price: parseFloat(price) || 0,
        pricePerHour: pricePerHour ? parseFloat(pricePerHour) : null,
        commission: commission ? parseFloat(commission) : 5.0,
        categoryId: categoryId.trim(),
        providerId: providerId.trim(),
        serviceType,
        images: imagesArray,
        location: location ? location.trim() : null,
        address: address ? address.trim() : null,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        worksInVenues: worksInVenues === true || worksInVenues === 'true',
        worksExternal: worksExternal === true || worksExternal === 'true',
        requiresVenue: requiresVenue === true || requiresVenue === 'true',
        workingHoursStart: workingHoursStart || null,
        workingHoursEnd: workingHoursEnd || null,
        isActive: true,
      };

      // Validate price is positive
      if (serviceData.price <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Price must be greater than 0',
        });
      }

      // Create service
      const service = await prisma.service.create({
        data: serviceData,
        include: {
          category: true,
          provider: {
            select: {
              id: true,
              name: true,
              nameAr: true,
              phone: true,
            },
          },
        },
      });

      res.status(201).json({
        success: true,
        service,
      });
    } catch (error) {
      if (error.code === 'P2002') {
        return res.status(400).json({
          success: false,
          error: 'Service with this name already exists',
        });
      }
      if (error.code === 'P2003') {
        return res.status(400).json({
          success: false,
          error: 'Invalid category or provider reference',
        });
      }
      next(error);
    }
  }

  /**
   * Update service
   */
  static async updateService(req, res, next) {
    try {
      const { id } = req.params;
      const {
        name,
        nameAr,
        description,
        descriptionAr,
        price,
        pricePerHour,
        commission,
        categoryId,
        providerId,
        serviceType,
        images,
        location,
        address,
        latitude,
        longitude,
        worksInVenues,
        worksExternal,
        requiresVenue,
        workingHoursStart,
        workingHoursEnd,
        isActive,
      } = req.body;

      // Check if service exists
      const existingService = await prisma.service.findUnique({
        where: { id },
      });

      if (!existingService) {
        return res.status(404).json({
          success: false,
          error: 'Service not found',
        });
      }

      // Prepare update data
      const updateData = {};

      if (name !== undefined) updateData.name = name.trim();
      if (nameAr !== undefined) updateData.nameAr = nameAr.trim();
      if (description !== undefined) updateData.description = description ? description.trim() : null;
      if (descriptionAr !== undefined) updateData.descriptionAr = descriptionAr ? descriptionAr.trim() : null;
      if (price !== undefined) {
        const priceValue = parseFloat(price);
        if (priceValue <= 0) {
          return res.status(400).json({
            success: false,
            error: 'Price must be greater than 0',
          });
        }
        updateData.price = priceValue;
      }
      if (pricePerHour !== undefined) updateData.pricePerHour = pricePerHour ? parseFloat(pricePerHour) : null;
      if (commission !== undefined) updateData.commission = parseFloat(commission) || 5.0;
      if (serviceType !== undefined) {
        const validServiceTypes = ['VENUE', 'FOOD_PROVIDER', 'PHOTOGRAPHER', 'CAR', 'DECORATION', 'DJ', 'FLORIST', 'OTHER'];
        if (!validServiceTypes.includes(serviceType)) {
          return res.status(400).json({
            success: false,
            error: `Invalid serviceType. Must be one of: ${validServiceTypes.join(', ')}`,
          });
        }
        updateData.serviceType = serviceType;
      }
      if (location !== undefined) updateData.location = location ? location.trim() : null;
      if (address !== undefined) updateData.address = address ? address.trim() : null;
      if (latitude !== undefined) updateData.latitude = latitude ? parseFloat(latitude) : null;
      if (longitude !== undefined) updateData.longitude = longitude ? parseFloat(longitude) : null;
      if (worksInVenues !== undefined) updateData.worksInVenues = worksInVenues === true || worksInVenues === 'true';
      if (worksExternal !== undefined) updateData.worksExternal = worksExternal === true || worksExternal === 'true';
      if (requiresVenue !== undefined) updateData.requiresVenue = requiresVenue === true || requiresVenue === 'true';
      if (workingHoursStart !== undefined) updateData.workingHoursStart = workingHoursStart || null;
      if (workingHoursEnd !== undefined) updateData.workingHoursEnd = workingHoursEnd || null;
      if (isActive !== undefined) updateData.isActive = isActive;

      // Handle category update
      if (categoryId !== undefined) {
        const category = await prisma.category.findUnique({
          where: { id: categoryId },
        });
        if (!category) {
          return res.status(404).json({
            success: false,
            error: 'Category not found',
          });
        }
        updateData.categoryId = categoryId;
      }

      // Handle provider update
      if (providerId !== undefined) {
        const provider = await prisma.user.findUnique({
          where: { id: providerId },
        });
        if (!provider) {
          return res.status(404).json({
            success: false,
            error: 'Provider not found',
          });
        }
        updateData.providerId = providerId;
      }

      // Handle images update - prioritize file uploads
      if (req.files && req.files.images && req.files.images.length > 0) {
        // Delete old images if they're file paths
        if (existingService.images && Array.isArray(existingService.images)) {
          existingService.images.forEach(img => {
            if (typeof img === 'string' && img.startsWith('/uploads/')) {
              deleteOldFile(img);
            }
          });
        }
        // Add new uploaded images
        const newImageUrls = req.files.images.map(file => {
          const imagePath = `/uploads/services/${file.filename}`;
          return getFileUrl(req, imagePath);
        });
        updateData.images = newImageUrls;
      } else if (images !== undefined) {
        // Fallback to base64 or URL array
        let imagesArray = [];
        if (images !== null) {
          if (Array.isArray(images)) {
            imagesArray = images
              .filter(img => img && typeof img === 'string' && img.trim() !== '')
              .slice(0, 10); // Limit to maximum 10 images
          } else if (typeof images === 'string' && images.trim() !== '') {
            imagesArray = [images];
          }
        }
        updateData.images = imagesArray;
      }

      // Update service
      const service = await prisma.service.update({
        where: { id },
        data: updateData,
        include: {
          category: true,
          provider: {
            select: {
              id: true,
              name: true,
              nameAr: true,
              phone: true,
            },
          },
        },
      });

      res.json({
        success: true,
        service,
      });
    } catch (error) {
      if (error.code === 'P2002') {
        return res.status(400).json({
          success: false,
          error: 'Service with this name already exists',
        });
      }
      if (error.code === 'P2003') {
        return res.status(400).json({
          success: false,
          error: 'Invalid category or provider reference',
        });
      }
      next(error);
    }
  }

  /**
   * Delete service
   */
  static async deleteService(req, res, next) {
    try {
      const { id } = req.params;

      // Soft delete - set isActive to false
      await prisma.service.update({
        where: { id },
        data: { isActive: false },
      });

      res.json({
        success: true,
        message: 'Service deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get service holidays
   * GET /api/admin/services/:id/holidays
   */
  static async getServiceHolidays(req, res, next) {
    try {
      const { id } = req.params;

      const holidays = await prisma.serviceHoliday.findMany({
        where: { serviceId: id },
        orderBy: { date: 'asc' },
      });

      res.json({
        success: true,
        holidays,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add service holiday
   * POST /api/admin/services/:id/holidays
   */
  static async addServiceHoliday(req, res, next) {
    try {
      const { id } = req.params;
      const { date, reason, isRecurring = false } = req.body;

      if (!date) {
        return res.status(400).json({
          success: false,
          error: 'Date is required',
        });
      }

      const holiday = await prisma.serviceHoliday.create({
        data: {
          serviceId: id,
          date: new Date(date),
          reason: reason || null,
          isRecurring: isRecurring === true || isRecurring === 'true',
        },
      });

      res.status(201).json({
        success: true,
        holiday,
      });
    } catch (error) {
      if (error.code === 'P2002') {
        return res.status(400).json({
          success: false,
          error: 'Holiday already exists for this date',
        });
      }
      next(error);
    }
  }

  /**
   * Delete service holiday
   * DELETE /api/admin/services/:id/holidays/:holidayId
   */
  static async deleteServiceHoliday(req, res, next) {
    try {
      const { id, holidayId } = req.params;

      await prisma.serviceHoliday.delete({
        where: { id: holidayId },
      });

      res.json({
        success: true,
        message: 'Holiday deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all bookings (admin)
   */
  static async getBookings(req, res, next) {
    try {
      const { status, paymentStatus, limit = 10, offset = 0 } = req.query;

      const where = {
        ...(status && { status }),
        ...(paymentStatus && { paymentStatus }),
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
                    serviceType: true,
                  },
                },
              },
            },
          },
          take: parseInt(limit),
          skip: parseInt(offset),
          orderBy: { createdAt: 'desc' },
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
   * Get booking by ID (admin)
   */
  static async getBookingById(req, res, next) {
    try {
      const { id } = req.params;

      const booking = await prisma.booking.findUnique({
        where: { id },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              nameAr: true,
              phone: true,
              email: true,
              location: true,
              locationAr: true,
            },
          },
          venue: {
            include: {
              provider: {
                select: {
                  id: true,
                  name: true,
                  phone: true,
                },
              },
            },
          },
          services: {
            include: {
              service: {
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
                      phone: true,
                    },
                  },
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

      if (!booking) {
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
   * Update booking status
   */
  static async updateBookingStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      // Get booking before update to check deposit status
      const oldBooking = await prisma.booking.findUnique({
        where: { id },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
        },
      });

      if (!oldBooking) {
        throw new NotFoundError('Booking not found');
      }

      const booking = await prisma.booking.update({
        where: { id },
        data: { status },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
        },
      });

      // If booking is confirmed and deposit is paid but remaining is not paid, send notification
      if (status === 'CONFIRMED' && oldBooking.depositPaid && !oldBooking.remainingPaid && oldBooking.remainingAmount > 0) {
        try {
          await prisma.notification.create({
            data: {
              userId: booking.customerId,
              title: 'طلب دفع باقي المبلغ',
              message: `تم تأكيد حجزك رقم ${booking.bookingNumber}. يرجى دفع باقي المبلغ البالغ ${oldBooking.remainingAmount.toFixed(2)} د.ك`,
              type: 'INFO',
              category: 'PAYMENT',
              link: `/booking/${booking.id}`,
              metadata: {
                bookingId: booking.id,
                bookingNumber: booking.bookingNumber,
                remainingAmount: oldBooking.remainingAmount,
              },
            },
          });
        } catch (notificationError) {
          console.error('Error creating notification:', notificationError);
          // Don't fail the request if notification fails
        }
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
   * Update booking payment status
   */
  static async updateBookingPaymentStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { paymentStatus } = req.body;

      const booking = await prisma.booking.update({
        where: { id },
        data: { paymentStatus },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
        },
      });

      res.json({
        success: true,
        booking,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all categories (admin)
   */
  static async getCategories(req, res, next) {
    try {
      const { search, limit = 10, offset = 0 } = req.query;

      const where = {
        ...(search && {
          OR: [
            { name: { contains: search } },
            { nameAr: { contains: search } },
            { description: { contains: search } },
          ],
        }),
      };

      const [categories, total] = await Promise.all([
        prisma.category.findMany({
          where,
          include: {
            _count: {
              select: {
                services: true,
              },
            },
          },
          take: parseInt(limit),
          skip: parseInt(offset),
          orderBy: { nameAr: 'asc' },
        }),
        prisma.category.count({ where }),
      ]);

      res.json({
        success: true,
        categories,
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all reviews (admin)
   */
  static async getReviews(req, res, next) {
    try {
      const { limit = 10, offset = 0 } = req.query;

      const [reviews, total] = await Promise.all([
        prisma.review.findMany({
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
        prisma.review.count(),
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
   * Delete review
   */
  static async deleteReview(req, res, next) {
    try {
      const { id } = req.params;

      await prisma.review.delete({
        where: { id },
      });

      res.json({
        success: true,
        message: 'Review deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all payments (admin)
   */
  static async getPayments(req, res, next) {
    try {
      const { status, limit = 10, offset = 0 } = req.query;

      const where = {
        ...(status && { status }),
      };

      const [payments, total] = await Promise.all([
        prisma.payment.findMany({
          where,
          include: {
            booking: {
              include: {
                customer: {
                  select: {
                    id: true,
                    name: true,
                    phone: true,
                  },
                },
              },
            },
          },
          take: parseInt(limit),
          skip: parseInt(offset),
          orderBy: { createdAt: 'desc' },
        }),
        prisma.payment.count({ where }),
      ]);

      res.json({
        success: true,
        payments,
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update payment status
   */
  static async updatePaymentStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const payment = await prisma.payment.update({
        where: { id },
        data: { status },
        include: {
          booking: {
            select: {
              id: true,
              bookingNumber: true,
            },
          },
        },
      });

      res.json({
        success: true,
        payment,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get venue bookings calendar - shows all bookings with time slots
   * GET /api/admin/venues/:id/bookings-calendar?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
   */
  static async getVenueBookingsCalendar(req, res, next) {
    try {
      const { id } = req.params;
      const { startDate, endDate } = req.query;

      const venue = await prisma.venue.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          nameAr: true,
          workingHoursStart: true,
          workingHoursEnd: true,
        },
      });

      if (!venue) {
        throw new NotFoundError('Venue');
      }

      const start = startDate ? new Date(startDate) : new Date();
      const end = endDate ? new Date(endDate) : new Date();
      end.setMonth(end.getMonth() + 1); // Default: next month

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
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              nameAr: true,
              phone: true,
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
                },
              },
            },
          },
        },
        orderBy: {
          date: 'asc',
        },
      });

      // Get holidays
      const holidays = await prisma.venueHoliday.findMany({
        where: {
          venueId: id,
          date: {
            gte: start,
            lte: end,
          },
        },
      });

      // Group bookings by date
      const bookingsByDate = {};
      bookings.forEach(booking => {
        const dateKey = booking.date.toISOString().split('T')[0];
        if (!bookingsByDate[dateKey]) {
          bookingsByDate[dateKey] = [];
        }
        bookingsByDate[dateKey].push(booking);
      });

      // Generate available time slots for each day
      const workStart = venue.workingHoursStart || '09:00';
      const workEnd = venue.workingHoursEnd || '22:00';
      const [startHour] = workStart.split(':').map(Number);
      const [endHour] = workEnd.split(':').map(Number);

      const calendar = [];
      const currentDate = new Date(start);
      while (currentDate <= end) {
        const dateKey = currentDate.toISOString().split('T')[0];
        const dayBookings = bookingsByDate[dateKey] || [];
        const isHoliday = holidays.some(h => {
          const holidayDate = h.date.toISOString().split('T')[0];
          return holidayDate === dateKey;
        });

        // Generate time slots
        const slots = [];
        for (let hour = startHour; hour < endHour; hour++) {
          const slotStart = `${String(hour).padStart(2, '0')}:00`;
          const slotEnd = `${String(hour + 1).padStart(2, '0')}:00`;
          
          // Check if slot is booked
          const isBooked = dayBookings.some(booking => {
            if (!booking.startTime || !booking.endTime) return false;
            const bookingStart = booking.startTime.split(':').map(Number);
            const bookingEnd = booking.endTime.split(':').map(Number);
            return !(
              (hour + 1 <= bookingStart[0]) ||
              (hour >= bookingEnd[0])
            );
          });

          slots.push({
            start: slotStart,
            end: slotEnd,
            available: !isBooked && !isHoliday,
            booking: dayBookings.find(b => {
              if (!b.startTime || !b.endTime) return false;
              const bStart = b.startTime.split(':').map(Number);
              const bEnd = b.endTime.split(':').map(Number);
              return !((hour + 1 <= bStart[0]) || (hour >= bEnd[0]));
            }) || null,
          });
        }

        calendar.push({
          date: dateKey,
          isHoliday,
          holidayReason: holidays.find(h => h.date.toISOString().split('T')[0] === dateKey)?.reason || null,
          bookings: dayBookings,
          slots,
          availableSlots: slots.filter(s => s.available).length,
          totalSlots: slots.length,
        });

        currentDate.setDate(currentDate.getDate() + 1);
      }

      res.json({
        success: true,
        venue: {
          id: venue.id,
          name: venue.name,
          nameAr: venue.nameAr,
          workingHours: {
            start: workStart,
            end: workEnd,
          },
        },
        calendar,
        holidays: holidays.map(h => ({
          id: h.id,
          date: h.date.toISOString().split('T')[0],
          reason: h.reason,
          isRecurring: h.isRecurring,
        })),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update booking - modify time slots, date, etc.
   * PATCH /api/admin/bookings/:id
   */
  static async updateBooking(req, res, next) {
    try {
      const { id } = req.params;
      const {
        date,
        startTime,
        endTime,
        totalAmount,
        discount,
        notes,
      } = req.body;

      const booking = await prisma.booking.findUnique({
        where: { id },
        include: {
          venue: true,
        },
      });

      if (!booking) {
        throw new NotFoundError('Booking');
      }

      // Validate time slots if provided
      if (date && startTime && endTime && booking.venueId) {
        const bookingDate = new Date(date);
        const startOfDay = new Date(bookingDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(bookingDate);
        endOfDay.setHours(23, 59, 59, 999);

        // Check for conflicts with other bookings
        const conflictingBookings = await prisma.booking.findMany({
          where: {
            venueId: booking.venueId,
            id: { not: id },
            date: {
              gte: startOfDay,
              lte: endOfDay,
            },
            status: {
              not: 'CANCELLED',
            },
            OR: [
              {
                AND: [
                  { startTime: { lte: startTime } },
                  { endTime: { gt: startTime } },
                ],
              },
              {
                AND: [
                  { startTime: { lt: endTime } },
                  { endTime: { gte: endTime } },
                ],
              },
              {
                AND: [
                  { startTime: { gte: startTime } },
                  { endTime: { lte: endTime } },
                ],
              },
            ],
          },
        });

        if (conflictingBookings.length > 0) {
          throw new ValidationError('Time slot conflicts with existing booking');
        }
      }

      const updateData = {};
      if (date) updateData.date = new Date(date);
      if (startTime !== undefined) updateData.startTime = startTime;
      if (endTime !== undefined) updateData.endTime = endTime;
      if (totalAmount !== undefined) updateData.totalAmount = totalAmount;
      if (discount !== undefined) updateData.discount = discount;
      if (notes !== undefined) updateData.notes = notes;

      // Recalculate final amount if needed
      if (totalAmount !== undefined || discount !== undefined) {
        const finalAmount = (updateData.totalAmount || booking.totalAmount) - (updateData.discount || booking.discount);
        updateData.finalAmount = finalAmount;
      }

      const updatedBooking = await prisma.booking.update({
        where: { id },
        data: updateData,
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              nameAr: true,
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
                  price: true,
                },
              },
            },
          },
        },
      });

      res.json({
        success: true,
        booking: updatedBooking,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cancel booking
   * PATCH /api/admin/bookings/:id/cancel
   */
  static async cancelBooking(req, res, next) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const booking = await prisma.booking.findUnique({
        where: { id },
      });

      if (!booking) {
        throw new NotFoundError('Booking');
      }

      const updatedBooking = await prisma.booking.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          notes: reason ? `${booking.notes || ''}\n[Admin Cancellation]: ${reason}`.trim() : booking.notes,
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              nameAr: true,
              phone: true,
            },
          },
          venue: {
            select: {
              id: true,
              name: true,
              nameAr: true,
            },
          },
        },
      });

      res.json({
        success: true,
        booking: updatedBooking,
        message: 'Booking cancelled successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get venue holidays
   * GET /api/admin/venues/:id/holidays
   */
  static async getVenueHolidays(req, res, next) {
    try {
      const { id } = req.params;
      const { startDate, endDate } = req.query;

      const where = {
        venueId: id,
      };

      if (startDate || endDate) {
        where.date = {};
        if (startDate) where.date.gte = new Date(startDate);
        if (endDate) where.date.lte = new Date(endDate);
      }

      const holidays = await prisma.venueHoliday.findMany({
        where,
        orderBy: {
          date: 'asc',
        },
      });

      res.json({
        success: true,
        holidays,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add venue holiday
   * POST /api/admin/venues/:id/holidays
   */
  static async addVenueHoliday(req, res, next) {
    try {
      const { id } = req.params;
      const { date, reason, isRecurring } = req.body;

      if (!date) {
        throw new ValidationError('Date is required');
      }

      const venue = await prisma.venue.findUnique({
        where: { id },
      });

      if (!venue) {
        throw new NotFoundError('Venue');
      }

      const holiday = await prisma.venueHoliday.create({
        data: {
          venueId: id,
          date: new Date(date),
          reason: reason || null,
          isRecurring: isRecurring || false,
        },
      });

      res.status(201).json({
        success: true,
        holiday,
        message: 'Holiday added successfully',
      });
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ValidationError('Holiday already exists for this date');
      }
      next(error);
    }
  }

  /**
   * Delete venue holiday
   * DELETE /api/admin/venues/:id/holidays/:holidayId
   */
  static async deleteVenueHoliday(req, res, next) {
    try {
      const { id, holidayId } = req.params;

      const holiday = await prisma.venueHoliday.findUnique({
        where: { id: holidayId },
      });

      if (!holiday || holiday.venueId !== id) {
        throw new NotFoundError('Holiday');
      }

      await prisma.venueHoliday.delete({
        where: { id: holidayId },
      });

      res.json({
        success: true,
        message: 'Holiday deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update venue working hours
   * PATCH /api/admin/venues/:id/working-hours
   */
  static async updateVenueWorkingHours(req, res, next) {
    try {
      const { id } = req.params;
      const { workingHoursStart, workingHoursEnd } = req.body;

      if (!workingHoursStart || !workingHoursEnd) {
        throw new ValidationError('Working hours start and end are required');
      }

      // Validate time format (HH:MM)
      const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(workingHoursStart) || !timeRegex.test(workingHoursEnd)) {
        throw new ValidationError('Invalid time format. Use HH:MM format');
      }

      const [startHour] = workingHoursStart.split(':').map(Number);
      const [endHour] = workingHoursEnd.split(':').map(Number);

      if (startHour >= endHour) {
        throw new ValidationError('Start time must be before end time');
      }

      const venue = await prisma.venue.update({
        where: { id },
        data: {
          workingHoursStart,
          workingHoursEnd,
        },
      });

      res.json({
        success: true,
        venue,
        message: 'Working hours updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update venue pricing
   * PATCH /api/admin/venues/:id/pricing
   */
  static async updateVenuePricing(req, res, next) {
    try {
      const { id } = req.params;
      const { price, pricePerHour, commission } = req.body;

      if (price !== undefined && price < 0) {
        throw new ValidationError('Price must be non-negative');
      }
      if (pricePerHour !== undefined && pricePerHour < 0) {
        throw new ValidationError('Price per hour must be non-negative');
      }
      if (commission !== undefined && (commission < 0 || commission > 100)) {
        throw new ValidationError('Commission must be between 0 and 100');
      }

      const updateData = {};
      if (price !== undefined) updateData.price = price;
      if (pricePerHour !== undefined) updateData.pricePerHour = pricePerHour;
      if (commission !== undefined) updateData.commission = commission;

      const venue = await prisma.venue.update({
        where: { id },
        data: updateData,
      });

      res.json({
        success: true,
        venue,
        message: 'Pricing updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update service pricing
   * PATCH /api/admin/services/:id/pricing
   */
  static async updateServicePricing(req, res, next) {
    try {
      const { id } = req.params;
      const { price } = req.body;

      if (price === undefined) {
        throw new ValidationError('Price is required');
      }

      if (price < 0) {
        throw new ValidationError('Price must be non-negative');
      }

      const service = await prisma.service.update({
        where: { id },
        data: { price },
      });

      res.json({
        success: true,
        service,
        message: 'Service pricing updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AdminController;

