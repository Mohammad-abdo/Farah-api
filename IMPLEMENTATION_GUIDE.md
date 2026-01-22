# Multi-Service Booking Implementation Guide

## 🚀 Quick Start

### Step 1: Database Migration

```bash
cd backend
npx prisma migrate dev --name add_multi_service_booking
npx prisma generate
```

### Step 2: Create Default Categories

After migration, create default categories for Food Providers and Photographers:

```sql
-- Run this in your database or via Prisma Studio
INSERT INTO categories (id, name, nameAr, createdAt, updatedAt) VALUES
  (UUID(), 'Food Providers', 'مقدمي الطعام', NOW(), NOW()),
  (UUID(), 'Photographers', 'المصورين', NOW(), NOW());
```

### Step 3: Update Backend Controllers

See detailed controller updates below.

## 📝 Controller Updates

### 1. Service Controller Updates

**File**: `backend/src/controllers/MobileController.js`

Add new method for getting services by type:

```javascript
static async getServices(req, res, next) {
  try {
    const { 
      categoryId, 
      serviceType, 
      worksExternal,
      search,
      limit = 20, 
      offset = 0 
    } = req.query;

    const where = {
      isActive: true,
      ...(categoryId && { categoryId }),
      ...(serviceType && { serviceType }),
      ...(worksExternal !== undefined && { worksExternal: worksExternal === 'true' }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { nameAr: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

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
        orderBy: [
          { rating: 'desc' },
          { reviewCount: 'desc' },
        ],
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
```

### 2. Booking Controller Updates

**File**: `backend/src/controllers/BookingsController.js`

Update the `create` method:

```javascript
static async create(req, res, next) {
  try {
    const {
      venueId,
      services = [], // Array of service booking objects
      date,
      startTime,
      endTime,
      location,
      locationAddress,
      locationLatitude,
      locationLongitude,
      totalAmount,
      discount = 0,
      cardId,
      notes,
    } = req.body;

    // Validation
    if (!date) {
      throw new ValidationError('Date is required');
    }

    // Determine booking type
    let bookingType = 'MIXED';
    if (venueId && services.length === 0) {
      bookingType = 'VENUE_ONLY';
    } else if (!venueId && services.length > 0) {
      bookingType = 'SERVICES_ONLY';
    }

    // Validate services if provided
    if (services.length > 0) {
      for (const serviceBooking of services) {
        const service = await prisma.service.findUnique({
          where: { id: serviceBooking.serviceId },
        });

        if (!service) {
          throw new ValidationError(`Service ${serviceBooking.serviceId} not found`);
        }

        // Check if service requires venue
        if (service.requiresVenue && !venueId) {
          throw new ValidationError(`Service ${service.name} requires a venue`);
        }

        // Validate location type
        if (serviceBooking.locationType === 'venue' && !venueId) {
          throw new ValidationError('Cannot book service at venue without selecting a venue');
        }

        // Check availability (implement availability checking logic)
        // ... availability check code ...
      }
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

    // Generate booking number
    const bookingNumber = `BK-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Calculate final amount
    const finalAmount = totalAmount - discount;

    // Determine payment method
    let paymentMethod = 'CREDIT_CARD';
    if (!cardId) {
      paymentMethod = null;
    }

    // Create booking with services
    const booking = await prisma.booking.create({
      data: {
        bookingNumber,
        customerId: req.user.id,
        venueId: venueId || null,
        bookingType,
        date: new Date(date),
        startTime: startTime || null,
        endTime: endTime || null,
        location: location || null,
        locationAddress: locationAddress || null,
        locationLatitude: locationLatitude || null,
        locationLongitude: locationLongitude || null,
        status: 'PENDING',
        totalAmount,
        discount,
        finalAmount,
        paymentMethod: paymentMethod,
        paymentStatus: cardId ? 'PAID' : 'PENDING',
        notes,
        services: {
          create: services.map((serviceBooking) => ({
            serviceId: serviceBooking.serviceId,
            price: serviceBooking.price || 0,
            date: serviceBooking.date ? new Date(serviceBooking.date) : null,
            startTime: serviceBooking.startTime || null,
            endTime: serviceBooking.endTime || null,
            duration: serviceBooking.duration || null,
            locationType: serviceBooking.locationType || null,
            locationAddress: serviceBooking.locationAddress || null,
            locationLatitude: serviceBooking.locationLatitude || null,
            locationLongitude: serviceBooking.locationLongitude || null,
            notes: serviceBooking.notes || null,
          })),
        },
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        venue: venueId ? true : false,
        services: {
          include: {
            service: {
              include: {
                category: true,
              },
            },
          },
        },
      },
    });

    // Create payment record if card is used
    if (cardId) {
      await prisma.payment.create({
        data: {
          bookingId: booking.id,
          amount: finalAmount,
          method: 'CREDIT_CARD',
          status: 'PAID',
          cardId: cardId,
        },
      });
    }

    // Increment clients count for venue if exists
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
      message: 'Booking created successfully',
      booking,
    });
  } catch (error) {
    next(error);
  }
}
```

## 🔌 API Endpoints Summary

### Mobile Endpoints

```
GET    /api/mobile/services
  Query: categoryId, serviceType, worksExternal, search, limit, offset

GET    /api/mobile/services/:id
  Get service details

POST   /api/mobile/bookings
  Create booking (supports venue-only, services-only, or mixed)
```

### Admin Endpoints

```
GET    /api/admin/services
  Query: serviceType, categoryId, isActive, etc.

POST   /api/admin/services
  Create service (Food Provider, Photographer, etc.)

PATCH  /api/admin/services/:id
  Update service

DELETE /api/admin/services/:id
  Delete/Deactivate service
```

## 🎨 Frontend Booking Flow

### New Booking Flow Structure

1. **Service Selection Page**
   - Option: "Book Venue" or "Book Services"
   - If "Book Services": Show service type selector (Food Provider, Photographer, etc.)

2. **For Each Service**:
   - Select service
   - Select date/time
   - Select location type:
     - Venue (if venue selected)
     - Home
     - Hotel
     - Outdoor
     - Other (with address input)
   - Enter address if external
   - Add notes (optional)

3. **Booking Summary**
   - Show all services with their locations
   - Calculate total
   - Confirm booking

## 📊 Example Booking Payload

```json
{
  "venueId": "venue-uuid-optional",
  "services": [
    {
      "serviceId": "food-provider-uuid",
      "date": "2024-03-15",
      "startTime": "12:00",
      "endTime": "16:00",
      "duration": 4,
      "locationType": "venue",
      "price": 500
    },
    {
      "serviceId": "photographer-uuid",
      "date": "2024-03-15",
      "startTime": "10:00",
      "endTime": "20:00",
      "duration": 10,
      "locationType": "home",
      "locationAddress": "123 Main St, City",
      "locationLatitude": 30.0444,
      "locationLongitude": 31.2357,
      "price": 800
    }
  ],
  "date": "2024-03-15",
  "startTime": "10:00",
  "endTime": "20:00",
  "totalAmount": 1300,
  "discount": 0,
  "cardId": "card-uuid-optional",
  "notes": "Wedding event"
}
```

## ✅ Testing Checklist

- [ ] Create Food Provider service
- [ ] Create Photographer service
- [ ] Book venue only
- [ ] Book services only (no venue)
- [ ] Book venue + services
- [ ] Book service at external location
- [ ] Book service at venue location
- [ ] Validate service requires venue
- [ ] Check availability
- [ ] Admin dashboard service management
- [ ] Booking details show all services

















