const getPrisma = require('../utils/prisma');
const { NotFoundError, ValidationError, ForbiddenError } = require('../utils/errors');

const prisma = getPrisma();

class BookingsController {
  /**
   * Get all bookings
   */
  static async getAll(req, res, next) {
    try {
      const { userId, status, limit = 10, offset = 0 } = req.query;

      // Map frontend status to backend enum
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
        ...(userId && { customerId: userId }),
        ...(mappedStatus && { status: mappedStatus }),
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
                    price: true,
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
   */
  static async getById(req, res, next) {
    try {
      const { id } = req.params;

      const booking = await prisma.booking.findUnique({
        where: { id },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
              location: true,
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
                  category: true,
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

      // Check if user has access (customer or admin)
      if (req.user.role !== 'ADMIN' && booking.customerId !== req.user.id) {
        throw new ForbiddenError('You do not have access to this booking');
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
   * Create booking
   */
  static async create(req, res, next) {
    try {
      const {
        venueId,
        date,
        eventDate, // Alternative field name for date
        startTime,
        endTime,
        location,
        locationAddress,
        locationLatitude,
        locationLongitude,
        services = [],
        serviceIds, // Alternative field name for services (array of IDs)
        totalAmount,
        discount = 0,
        cardId,
        notes,
        guestCount, // Optional field
        paymentMethod, // Optional field (will be handled separately)
      } = req.body;

      // Normalize date field - accept both 'date' and 'eventDate'
      const bookingDate = date || eventDate;
      
      // Convert eventDate string to ISO format if needed
      let normalizedDate = bookingDate;
      if (bookingDate) {
        if (typeof bookingDate === 'string') {
          // If it's just a date string (YYYY-MM-DD), convert to ISO
          if (!bookingDate.includes('T') && !bookingDate.includes('Z')) {
            // Add time if not present (default to midnight UTC)
            normalizedDate = new Date(bookingDate + 'T00:00:00.000Z').toISOString();
          } else {
            normalizedDate = bookingDate;
          }
        } else if (bookingDate instanceof Date) {
          normalizedDate = bookingDate.toISOString();
        }
      }
      
      // Validation - Required fields
      if (!bookingDate) {
        throw new ValidationError('Date is required (use "date" or "eventDate" field)');
      }
      
      // Validate normalizedDate is valid
      if (normalizedDate && isNaN(new Date(normalizedDate).getTime())) {
        throw new ValidationError('Invalid date format');
      }
      
      // Normalize services - accept both 'services' array and 'serviceIds' array
      let normalizedServices = Array.isArray(services) ? services : [];
      
      if (serviceIds && Array.isArray(serviceIds) && serviceIds.length > 0) {
        // Convert serviceIds array to services array format
        const serviceIdsArray = serviceIds.map(id => ({
          serviceId: id,
          id: id,
        }));
        
        // If normalizedServices is empty, use serviceIds
        if (normalizedServices.length === 0) {
          normalizedServices = serviceIdsArray;
        } else {
          // Merge both, avoiding duplicates
          const existingIds = new Set(normalizedServices.map(s => 
            typeof s === 'string' ? s : (s.serviceId || s.id)
          ));
          serviceIds.forEach(id => {
            if (!existingIds.has(id)) {
              normalizedServices.push({
                serviceId: id,
                id: id,
              });
            }
          });
        }
      }

      // Log request for debugging (after normalization)
      console.log('📝 Creating booking:', {
        userId: req.user.id,
        venueId,
        servicesCount: normalizedServices?.length || 0,
        serviceIdsCount: serviceIds?.length || 0,
        hasCardId: !!cardId,
        cardIdValue: cardId,
        totalAmount,
        date: bookingDate,
        eventDate,
        normalizedDate,
        startTime,
        endTime,
        location,
        locationAddress,
      });

      // Validate venue if provided and get its services
      let venue = null;
      let venueServices = [];
      if (venueId && venueId !== 'null' && venueId !== '') {
        venue = await prisma.venue.findUnique({
          where: { id: venueId },
          include: {
            services: {
              include: {
                service: true,
              },
            },
          },
        });

        if (!venue) {
          throw new NotFoundError('Venue');
        }

        if (!venue.isActive) {
          throw new ValidationError('Venue is not active');
        }

        // Get all active services associated with this venue
        venueServices = venue.services
          .filter(vs => vs.service && vs.service.isActive)
          .map(vs => ({
            serviceId: vs.service.id,
            id: vs.service.id,
            price: vs.service.price,
            name: vs.service.name,
            nameAr: vs.service.nameAr,
          }));
        
        console.log('📋 Venue services found:', venueServices.length);
      }

      // Determine booking type - explicitly check for null/undefined/empty
      // venueId can be null, undefined, or empty string - all mean no venue
      const hasVenue = venueId && venueId !== 'null' && venueId !== '';
      
      // Use provided services first, only add venue services if no services provided
      // This prevents automatically adding all venue services when user sends specific services
      let finalServices = [];
      
      // If user provided services, use them (don't auto-add venue services)
      if (normalizedServices && Array.isArray(normalizedServices) && normalizedServices.length > 0) {
        finalServices = normalizedServices.map(s => 
          typeof s === 'string' 
            ? { serviceId: s, id: s, price: 0 }
            : { ...s, serviceId: s.serviceId || s.id, id: s.serviceId || s.id }
        );
      } 
      // Only auto-add venue services if NO services were provided by user
      else if (hasVenue && venueServices.length > 0) {
        // User booked venue only, add all venue services automatically
        finalServices = [...venueServices];
        console.log('📋 Auto-adding venue services (no services provided by user):', venueServices.length);
      }
      
      const hasServices = finalServices.length > 0;
      
      let bookingType = 'MIXED';
      if (hasVenue && !hasServices) {
        bookingType = 'VENUE_ONLY';
      } else if (!hasVenue && hasServices) {
        bookingType = 'SERVICES_ONLY';
      } else if (hasVenue && hasServices) {
        bookingType = 'MIXED';
      } else {
        // Neither venue nor services - this should be caught by validation
        throw new ValidationError('Booking must include either a venue or at least one service');
      }
      
      console.log('📦 Final services for booking:', finalServices.length, finalServices.map(s => s.serviceId || s.id));

      // Calculate total amount if not provided (venue price + services prices)
      // Note: This must be after finalServices is created
      let calculatedTotalAmount = totalAmount;
      if (!calculatedTotalAmount || calculatedTotalAmount <= 0 || isNaN(calculatedTotalAmount)) {
        let venuePrice = 0;
        if (venue) {
          venuePrice = venue.price || 0;
        }
        
        let servicesPrice = 0;
        if (finalServices && finalServices.length > 0) {
          servicesPrice = finalServices.reduce((sum, s) => {
            return sum + (s.price || 0);
          }, 0);
        }
        
        calculatedTotalAmount = venuePrice + servicesPrice;
        console.log('💰 Calculated total amount:', {
          venuePrice,
          servicesPrice,
          total: calculatedTotalAmount,
        });
      } else {
        calculatedTotalAmount = parseFloat(totalAmount) || 0;
      }

      // Validate services
      if (finalServices && finalServices.length > 0) {
        for (const serviceBooking of finalServices) {
          const serviceId = typeof serviceBooking === 'string' 
            ? serviceBooking 
            : (serviceBooking.serviceId || serviceBooking.id);
          
          if (!serviceId) {
            throw new ValidationError('Service ID is required for each service');
          }

          const service = await prisma.service.findUnique({
            where: { id: serviceId },
          });

          if (!service) {
            throw new NotFoundError('Service');
          }

          if (!service.isActive) {
            throw new ValidationError(`Service ${service.name} is not active`);
          }

          // Check if service requires venue
          const hasVenue = venueId && venueId !== 'null' && venueId !== '';
          if (service.requiresVenue && !hasVenue) {
            throw new ValidationError(`Service ${service.name} requires a venue to be selected`);
          }

          // Validate location type for service
          const locationType = typeof serviceBooking === 'object' 
            ? serviceBooking.locationType 
            : null;
          
          if (locationType === 'venue' && !hasVenue) {
            throw new ValidationError('Cannot book service at venue without selecting a venue');
          }

          // Check if service supports external booking
          if (locationType && locationType !== 'venue' && !service.worksExternal) {
            throw new ValidationError(`Service ${service.name} does not support external bookings`);
          }

          // Check if service supports venue booking
          if (locationType === 'venue' && !service.worksInVenues) {
            throw new ValidationError(`Service ${service.name} does not work in venues`);
          }
        }
      }

      // Validate card if provided (skip validation for placeholder values)
      let validCardId = null;
      if (cardId && cardId !== 'card-id-here' && cardId !== 'null' && cardId !== '') {
        const card = await prisma.creditCard.findFirst({
          where: {
            id: cardId,
            userId: req.user.id,
            isActive: true,
          },
        });

        if (!card) {
          throw new ValidationError('Invalid credit card');
        }
        validCardId = cardId;
      }

      // Generate booking number
      const bookingNumber = `BK-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      // Calculate final amount
      const finalAmount = calculatedTotalAmount - discount;

      // Calculate deposit (30% of final amount)
      const depositAmount = Math.round((finalAmount * 0.3) * 100) / 100;
      const remainingAmount = Math.round((finalAmount - depositAmount) * 100) / 100;

      // Determine payment method from card or request body
      let finalPaymentMethod = null; // Default: no payment method
      if (validCardId) {
        finalPaymentMethod = 'CREDIT_CARD'; // Set payment method only if valid card is provided
      } else if (paymentMethod && paymentMethod !== 'null' && paymentMethod !== '') {
        // Use paymentMethod from request body if provided (e.g., 'cash', 'CREDIT_CARD', etc.)
        // Map common values to enum values
        const paymentMethodMap = {
          'cash': 'CASH',
          'credit_card': 'CREDIT_CARD',
          'creditcard': 'CREDIT_CARD',
          'card': 'CREDIT_CARD',
        };
        finalPaymentMethod = paymentMethodMap[paymentMethod.toLowerCase()] || paymentMethod.toUpperCase();
      }

      // Create booking with enhanced service support
      // Explicitly set venueId to null if not provided (not undefined)
      const finalVenueId = (venueId && venueId !== 'null' && venueId !== '') ? venueId : null;
      
      const booking = await prisma.booking.create({
        data: {
          bookingNumber,
          customerId: req.user.id,
          venueId: finalVenueId, // Explicitly null for service-only bookings
          bookingType,
          date: new Date(normalizedDate),
          eventDate: eventDate || bookingDate || null, // Store original eventDate if provided
          startTime: startTime || null,
          endTime: endTime || null,
          location: location || null,
          locationAddress: locationAddress || null,
          locationLatitude: locationLatitude || null,
          locationLongitude: locationLongitude || null,
          status: 'PENDING',
          totalAmount: calculatedTotalAmount,
          discount,
          finalAmount,
          depositAmount,
          depositPaid: validCardId ? true : false, // Deposit is paid if card is used
          remainingAmount,
          remainingPaid: false, // Remaining amount not paid yet
          paymentMethod: finalPaymentMethod,
          paymentStatus: validCardId ? 'PENDING' : 'PENDING', // Will be PAID only when both deposit and remaining are paid
          notes: notes || (guestCount ? `Guest count: ${guestCount}` : null),
          services: services && services.length > 0 ? {
            create: services.map((serviceBooking) => {
              // Handle both string IDs and full service objects
              const serviceId = typeof serviceBooking === 'string' 
                ? serviceBooking 
                : (serviceBooking.serviceId || serviceBooking.id);
              
              const serviceData = typeof serviceBooking === 'object' ? serviceBooking : {};

              // Use booking date if service date is not provided
              const serviceDate = serviceData.date 
                ? new Date(serviceData.date) 
                : new Date(normalizedDate);

              // Use booking times if service times are not provided
              const serviceStartTime = serviceData.startTime || startTime || null;
              const serviceEndTime = serviceData.endTime || endTime || null;

              // Use booking location if service location is not provided and venue exists
              const serviceLocationType = serviceData.locationType 
                || (finalVenueId ? 'venue' : null)
                || null;

              // Use booking location address if service location address is not provided
              const serviceLocationAddress = serviceData.locationAddress 
                || (serviceLocationType !== 'venue' ? locationAddress : null)
                || null;

              // Use booking coordinates if service coordinates are not provided
              const serviceLocationLatitude = serviceData.locationLatitude 
                || (serviceLocationType !== 'venue' ? locationLatitude : null)
                || null;

              const serviceLocationLongitude = serviceData.locationLongitude 
                || (serviceLocationType !== 'venue' ? locationLongitude : null)
                || null;

              return {
                serviceId,
                price: serviceData.price || 0,
                date: serviceDate,
                startTime: serviceStartTime,
                endTime: serviceEndTime,
                duration: serviceData.duration || null,
                locationType: serviceLocationType,
                locationAddress: serviceLocationAddress,
                locationLatitude: serviceLocationLatitude,
                locationLongitude: serviceLocationLongitude,
                notes: serviceData.notes || notes || null,
              };
            }),
          } : undefined,
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
          venue: true,
          services: {
            include: {
              service: true,
            },
          },
        },
      });

      // Create payment record for deposit if card is used
      if (validCardId) {
        await prisma.payment.create({
          data: {
            bookingId: booking.id,
            amount: depositAmount, // Only deposit amount
            method: 'CREDIT_CARD',
            status: 'PAID',
            cardId: validCardId,
          },
        });
      }

      // Increment clients count for the venue if venueId exists
      if (venueId) {
        await prisma.venue.update({
          where: { id: venueId },
          data: {
            clients: {
              increment: 1,
            },
          },
        });
      }

      res.status(201).json({
        success: true,
        booking,
      });
    } catch (error) {
      // Log error details for debugging
      console.error('❌ Error creating booking:', {
        message: error.message,
        code: error.code,
        name: error.name,
        stack: error.stack,
        userId: req.user?.id,
        requestBody: {
          venueId: req.body.venueId,
          servicesCount: req.body.services?.length || 0,
          totalAmount: req.body.totalAmount,
          date: req.body.date,
        },
      });
      
      // Log full error for debugging
      console.error('Full error object:', error);
      
      next(error);
    }
  }

  /**
   * Update booking status
   */
  static async updateStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const booking = await prisma.booking.findUnique({
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

      if (!booking) {
        throw new NotFoundError('Booking');
      }

      // Check if user has access
      if (req.user.role !== 'ADMIN' && booking.customerId !== req.user.id) {
        throw new ForbiddenError('You do not have access to this booking');
      }

      const updatedBooking = await prisma.booking.update({
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
          venue: {
            select: {
              id: true,
              name: true,
              nameAr: true,
            },
          },
        },
      });

      // If booking is confirmed and deposit is paid but remaining is not paid, send notification
      if (status === 'CONFIRMED' && booking.depositPaid && !booking.remainingPaid && booking.remainingAmount > 0) {
        try {
          await prisma.notification.create({
            data: {
              userId: booking.customerId,
              title: 'طلب دفع باقي المبلغ',
              message: `تم تأكيد حجزك رقم ${booking.bookingNumber}. يرجى دفع باقي المبلغ البالغ ${booking.remainingAmount.toFixed(2)} د.ك`,
              type: 'INFO',
              category: 'PAYMENT',
              link: `/booking/${booking.id}`,
              metadata: {
                bookingId: booking.id,
                bookingNumber: booking.bookingNumber,
                remainingAmount: booking.remainingAmount,
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
        booking: updatedBooking,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Pay deposit amount
   */
  static async payDeposit(req, res, next) {
    try {
      const { id } = req.params;
      const { cardId } = req.body;

      const booking = await prisma.booking.findUnique({
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

      if (!booking) {
        throw new NotFoundError('Booking');
      }

      // Check if user has access
      if (req.user.role !== 'ADMIN' && booking.customerId !== req.user.id) {
        throw new ForbiddenError('You do not have access to this booking');
      }

      // Validate that deposit is not already paid
      if (booking.depositPaid) {
        throw new ValidationError('Deposit is already paid');
      }

      // Validate deposit amount
      if (!booking.depositAmount || booking.depositAmount <= 0) {
        throw new ValidationError('No deposit amount to pay');
      }

      // Validate card if provided
      if (cardId) {
        const card = await prisma.creditCard.findFirst({
          where: {
            id: cardId,
            userId: req.user.id,
            isActive: true,
          },
        });

        if (!card) {
          throw new ValidationError('Invalid credit card');
        }
      }

      // Update booking to mark deposit as paid
      const updatedBooking = await prisma.booking.update({
        where: { id },
        data: {
          depositPaid: true,
          paymentMethod: cardId ? 'CREDIT_CARD' : booking.paymentMethod,
        },
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
        },
      });

      // Create payment record for deposit amount
      if (cardId) {
        await prisma.payment.create({
          data: {
            bookingId: booking.id,
            amount: booking.depositAmount,
            method: 'CREDIT_CARD',
            status: 'PAID',
            cardId: cardId,
          },
        });
      }

      res.json({
        success: true,
        booking: updatedBooking,
        message: 'Deposit paid successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Pay remaining amount
   */
  static async payRemaining(req, res, next) {
    try {
      const { id } = req.params;
      const { cardId } = req.body;

      const booking = await prisma.booking.findUnique({
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

      if (!booking) {
        throw new NotFoundError('Booking');
      }

      // Check if user has access
      if (req.user.role !== 'ADMIN' && booking.customerId !== req.user.id) {
        throw new ForbiddenError('You do not have access to this booking');
      }

      // Validate that deposit is paid
      if (!booking.depositPaid) {
        throw new ValidationError('Deposit must be paid before paying remaining amount');
      }

      // Validate that remaining is not already paid
      if (booking.remainingPaid) {
        throw new ValidationError('Remaining amount is already paid');
      }

      // Validate remaining amount
      if (!booking.remainingAmount || booking.remainingAmount <= 0) {
        throw new ValidationError('No remaining amount to pay');
      }

      // Validate card if provided
      if (cardId) {
        const card = await prisma.creditCard.findFirst({
          where: {
            id: cardId,
            userId: req.user.id,
            isActive: true,
          },
        });

        if (!card) {
          throw new ValidationError('Invalid credit card');
        }
      }

      // Update booking to mark remaining as paid
      const updatedBooking = await prisma.booking.update({
        where: { id },
        data: {
          remainingPaid: true,
          paymentStatus: 'PAID', // Both deposit and remaining are now paid
        },
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
        },
      });

      // Create payment record for remaining amount
      if (cardId) {
        await prisma.payment.create({
          data: {
            bookingId: booking.id,
            amount: booking.remainingAmount,
            method: 'CREDIT_CARD',
            status: 'PAID',
            cardId: cardId,
          },
        });
      }

      res.json({
        success: true,
        booking: updatedBooking,
        message: 'Remaining amount paid successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cancel booking
   */
  static async cancel(req, res, next) {
    try {
      const { id } = req.params;

      const booking = await prisma.booking.findUnique({
        where: { id },
      });

      if (!booking) {
        throw new NotFoundError('Booking');
      }

      // Check if user has access
      if (req.user.role !== 'ADMIN' && booking.customerId !== req.user.id) {
        throw new ForbiddenError('You do not have access to this booking');
      }

      const updatedBooking = await prisma.booking.update({
        where: { id },
        data: { status: 'CANCELLED' },
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
        booking: updatedBooking,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = BookingsController;

