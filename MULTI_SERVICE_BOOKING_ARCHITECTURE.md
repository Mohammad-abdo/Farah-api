# Multi-Service Booking System Architecture

## 📋 Overview

This document outlines the architecture for extending the booking system to support multiple service types (Venues, Food Providers, Photographers, and future services) with flexible booking options.

## 🗄️ Database Schema Design

### Core Concept: Service Polymorphism

Instead of creating separate tables for each service type, we use a **unified Service model** with a `serviceType` field. This approach:
- ✅ Reduces code duplication
- ✅ Makes adding new service types easy
- ✅ Maintains consistent booking logic
- ✅ Simplifies queries and relationships

### Schema Changes

#### 1. Add ServiceType Enum

```prisma
enum ServiceType {
  VENUE
  FOOD_PROVIDER
  PHOTOGRAPHER
  CAR
  DECORATION
  DJ
  FLORIST
  OTHER
}
```

#### 2. Enhance Service Model

```prisma
model Service {
  id              String      @id @default(uuid())
  serviceType     ServiceType @default(OTHER)
  name            String
  nameAr          String
  description     String?     @db.Text
  descriptionAr  String?     @db.Text
  price           Float
  pricePerHour    Float?      // For hourly services
  commission      Float       @default(5.0)
  categoryId      String
  providerId      String
  images          Json        // Array of image URLs
  
  // Location & Availability
  location        String?     // Base location
  address         String?     // Full address
  latitude        Float?
  longitude       Float?
  
  // Service Capabilities
  worksInVenues   Boolean     @default(true)   // Can work inside venues
  worksExternal   Boolean     @default(true)   // Can work at external locations
  requiresVenue   Boolean     @default(false)  // Must be booked with venue
  
  // Availability
  workingHoursStart String?   // e.g., "09:00"
  workingHoursEnd   String?   // e.g., "22:00"
  
  // Ratings & Status
  rating          Float       @default(0)
  reviewCount     Int         @default(0)
  isActive        Boolean     @default(true)
  
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  // Relations
  category        Category        @relation(fields: [categoryId], references: [id])
  provider        User           @relation("ServiceProvider", fields: [providerId], references: [id])
  bookings        BookingService[]
  reviews         Review[]
  venues          VenueService[]
  holidays        ServiceHoliday[] // Blocked dates

  @@index([serviceType])
  @@index([categoryId])
  @@index([providerId])
  @@map("services")
}
```

#### 3. Add ServiceHoliday Model (for blocking dates)

```prisma
model ServiceHoliday {
  id          String   @id @default(uuid())
  serviceId   String
  date        DateTime
  reason      String?  @db.Text
  isRecurring Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  service     Service  @relation(fields: [serviceId], references: [id], onDelete: Cascade)

  @@unique([serviceId, date])
  @@map("service_holidays")
}
```

#### 4. Enhance BookingService Model

```prisma
model BookingService {
  id              String   @id @default(uuid())
  bookingId       String
  serviceId       String
  price           Float
  
  // Service-specific booking details
  date            DateTime?  // Override booking date if different
  startTime       String?    // e.g., "14:00"
  endTime         String?    // e.g., "18:00"
  duration        Int?       // Duration in hours
  
  // Location for this specific service
  locationType    String?    // 'venue', 'home', 'hotel', 'outdoor', 'other'
  locationAddress String?     @db.Text
  locationLatitude Float?
  locationLongitude Float?
  
  // Notes specific to this service
  notes           String?     @db.Text
  
  createdAt       DateTime    @default(now())

  // Relations
  booking         Booking     @relation(fields: [bookingId], references: [id], onDelete: Cascade)
  service         Service     @relation(fields: [serviceId], references: [id])

  @@unique([bookingId, serviceId])
  @@map("booking_services")
}
```

#### 5. Update Booking Model

```prisma
model Booking {
  // ... existing fields ...
  
  // Make venueId truly optional (already is, but ensure logic supports it)
  venueId       String?
  
  // Add booking type
  bookingType   BookingType  @default(MIXED) // VENUE_ONLY, SERVICES_ONLY, MIXED
  
  // ... rest of fields remain the same ...
}
```

Add enum:
```prisma
enum BookingType {
  VENUE_ONLY      // Only venue booked
  SERVICES_ONLY   // Only services, no venue
  MIXED           // Venue + services
}
```

## 🔄 Booking Flow Logic

### Step-by-Step Booking Process

#### Scenario 1: Venue Only
1. User selects venue
2. Selects date/time
3. Selects location type (if applicable)
4. Confirms booking
5. **Booking Type**: `VENUE_ONLY`

#### Scenario 2: Services Only (No Venue)
1. User selects "Book Services" (no venue)
2. Selects service type (Food Provider, Photographer, etc.)
3. For each service:
   - Selects service
   - Selects date/time
   - Selects location type (Home/Hotel/Outdoor/Other)
   - Enters address if external
4. Confirms booking
5. **Booking Type**: `SERVICES_ONLY`

#### Scenario 3: Venue + Services
1. User selects venue
2. Selects date/time for venue
3. Adds services:
   - Each service can have different date/time
   - Each service can have different location
   - Services can be at venue or external
4. Confirms booking
5. **Booking Type**: `MIXED`

### Location Type Options

```typescript
enum LocationType {
  VENUE      // At the booked venue
  HOME       // Customer's home
  HOTEL      // Hotel location
  OUTDOOR    // Outdoor location
  OTHER      // Custom address
}
```

## 📡 API Endpoints

### Service Management

```
GET    /api/mobile/services
  Query params:
    - categoryId: Filter by category
    - serviceType: Filter by type (FOOD_PROVIDER, PHOTOGRAPHER, etc.)
    - worksExternal: Filter services that work externally
    - search: Search term
    - limit, offset: Pagination

GET    /api/mobile/services/:id
  Get service details with availability

GET    /api/mobile/services/:id/availability
  Check availability for specific date/time
  Body: { date, startTime, endTime }
```

### Booking Endpoints

```
POST   /api/mobile/bookings
  Body:
    {
      venueId?: string,           // Optional
      services: [
        {
          serviceId: string,
          date?: string,           // Optional, uses booking date if not provided
          startTime?: string,
          endTime?: string,
          duration?: number,
          locationType: 'venue' | 'home' | 'hotel' | 'outdoor' | 'other',
          locationAddress?: string,
          locationLatitude?: number,
          locationLongitude?: number,
          notes?: string
        }
      ],
      date: string,
      startTime?: string,          // For venue or default
      endTime?: string,             // For venue or default
      location?: string,            // For venue
      locationAddress?: string,     // For venue
      totalAmount: number,
      discount?: number,
      cardId?: string,
      notes?: string
    }
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

GET    /api/admin/services/:id/bookings
  Get all bookings for a service
```

## 🎨 Dashboard UI Structure

### Admin Dashboard Sections

#### 1. Services Management
- **Services List Page**
  - Filter by: Service Type, Category, Status
  - Columns: Name, Type, Category, Price, Status, Actions
  - Actions: Edit, Delete, View Bookings

- **Create/Edit Service Form**
  - Basic Info: Name (EN/AR), Description, Category
  - Service Type: Dropdown (Venue, Food Provider, Photographer, etc.)
  - Pricing: Base Price, Price Per Hour (optional)
  - Location: Base Location, Address, Coordinates
  - Capabilities:
    - ☑ Works in Venues
    - ☑ Works at External Locations
    - ☑ Requires Venue (mutually exclusive with external)
  - Availability: Working Hours, Holidays
  - Images: Multiple image upload
  - Status: Active/Inactive

#### 2. Categories Management
- **Categories List**
  - Add "Food Providers" category
  - Add "Photographers" category
  - Manage existing categories

#### 3. Bookings Management
- **Enhanced Booking Details View**
  - Show booking type (Venue Only / Services Only / Mixed)
  - Venue section (if exists)
  - Services section:
    - Each service with:
      - Service name & type
      - Date & time
      - Location type & address
      - Price
  - Total amount breakdown

## 🔧 Implementation Steps

### Phase 1: Database Migration
1. Add `ServiceType` enum
2. Add fields to `Service` model
3. Add `ServiceHoliday` model
4. Enhance `BookingService` model
5. Add `BookingType` enum
6. Run migration

### Phase 2: Backend Updates
1. Update `ServiceController` to handle service types
2. Update `BookingsController` to support new booking flow
3. Add availability checking logic
4. Update admin controllers

### Phase 3: Frontend Updates
1. Update booking flow to support service-only bookings
2. Add location selection per service
3. Update admin dashboard for service management
4. Update booking confirmation to show all details

### Phase 4: Testing & Refinement
1. Test all booking scenarios
2. Test admin workflows
3. Performance optimization
4. Documentation

## 🎯 Key Design Decisions

1. **Unified Service Model**: Single table for all service types reduces complexity
2. **Flexible Location**: Each service in a booking can have its own location
3. **Optional Venue**: Venue is truly optional, bookings can be service-only
4. **Service-Specific Dates**: Services can have different dates/times than the main booking
5. **Extensible**: Easy to add new service types via enum

## 📝 Notes

- Food Providers and Photographers are treated as regular services with `serviceType` set appropriately
- The existing `Venue` model remains separate for backward compatibility
- Services can be linked to venues via `VenueService` for recommendations
- All services support the same booking flow with location flexibility

















