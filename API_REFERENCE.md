# Multi-Service Booking API Reference

## 📡 Service Endpoints

### Get Services
```
GET /api/mobile/services
```

**Query Parameters:**
- `categoryId` (string, optional): Filter by category
- `serviceType` (string, optional): Filter by type (FOOD_PROVIDER, PHOTOGRAPHER, etc.)
- `worksExternal` (boolean, optional): Filter services that work externally
- `worksInVenues` (boolean, optional): Filter services that work in venues
- `search` (string, optional): Search in name/nameAr
- `limit` (number, default: 20): Pagination limit
- `offset` (number, default: 0): Pagination offset

**Response:**
```json
{
  "success": true,
  "services": [
    {
      "id": "uuid",
      "serviceType": "FOOD_PROVIDER",
      "name": "Catering Service",
      "nameAr": "خدمة التموين",
      "price": 500,
      "pricePerHour": null,
      "worksInVenues": true,
      "worksExternal": true,
      "requiresVenue": false,
      "category": { "id": "...", "name": "...", "nameAr": "..." },
      "provider": { "id": "...", "name": "..." }
    }
  ],
  "total": 10,
  "limit": 20,
  "offset": 0
}
```

### Get Service Details
```
GET /api/mobile/services/:id
```

**Response:**
```json
{
  "success": true,
  "service": {
    "id": "uuid",
    "serviceType": "PHOTOGRAPHER",
    "name": "Professional Photography",
    "nameAr": "التصوير الاحترافي",
    "description": "...",
    "price": 800,
    "pricePerHour": 100,
    "worksInVenues": true,
    "worksExternal": true,
    "requiresVenue": false,
    "workingHoursStart": "09:00",
    "workingHoursEnd": "22:00",
    "images": ["url1", "url2"],
    "rating": 4.5,
    "reviewCount": 25,
    "category": { ... },
    "provider": { ... }
  }
}
```

## 📅 Booking Endpoints

### Create Booking
```
POST /api/mobile/bookings
```

**Request Body:**
```json
{
  // Venue (optional)
  "venueId": "venue-uuid",
  
  // Services array (optional, but required if no venue)
  "services": [
    {
      "serviceId": "service-uuid",
      "price": 500,
      "date": "2024-03-15",           // Optional, uses booking date if not provided
      "startTime": "12:00",            // Optional
      "endTime": "16:00",              // Optional
      "duration": 4,                   // Optional, in hours
      "locationType": "venue",          // 'venue', 'home', 'hotel', 'outdoor', 'other'
      "locationAddress": "123 Main St", // Required if locationType is not 'venue'
      "locationLatitude": 30.0444,     // Optional, for map locations
      "locationLongitude": 31.2357,    // Optional, for map locations
      "notes": "Special requirements"  // Optional
    }
  ],
  
  // Main booking details
  "date": "2024-03-15",               // Required
  "startTime": "10:00",                // Optional, for venue or default
  "endTime": "20:00",                  // Optional, for venue or default
  
  // Location (for venue)
  "location": "artist",                // Optional: 'artist', 'another', 'map'
  "locationAddress": "...",             // Optional
  "locationLatitude": 30.0444,         // Optional
  "locationLongitude": 31.2357,         // Optional
  
  // Payment
  "totalAmount": 1300,                 // Required
  "discount": 0,                       // Optional, default: 0
  "cardId": "card-uuid",               // Optional
  
  // Notes
  "notes": "Wedding event"             // Optional
}
```

**Response:**
```json
{
  "success": true,
  "booking": {
    "id": "uuid",
    "bookingNumber": "BK-1234567890-ABC123",
    "bookingType": "MIXED",            // VENUE_ONLY, SERVICES_ONLY, or MIXED
    "date": "2024-03-15T00:00:00.000Z",
    "startTime": "10:00",
    "endTime": "20:00",
    "status": "PENDING",
    "totalAmount": 1300,
    "discount": 0,
    "finalAmount": 1300,
    "venue": { ... },                   // If venueId provided
    "services": [
      {
        "id": "uuid",
        "price": 500,
        "date": "2024-03-15T00:00:00.000Z",
        "startTime": "12:00",
        "endTime": "16:00",
        "locationType": "venue",
        "service": {
          "id": "uuid",
          "serviceType": "FOOD_PROVIDER",
          "name": "Catering Service",
          "nameAr": "خدمة التموين"
        }
      }
    ]
  }
}
```

## 🔧 Admin Endpoints

### Get All Services (Admin)
```
GET /api/admin/services
```

**Query Parameters:**
- `serviceType` (string, optional)
- `categoryId` (string, optional)
- `isActive` (boolean, optional)
- `providerId` (string, optional)
- `limit`, `offset` (pagination)

### Create Service (Admin)
```
POST /api/admin/services
```

**Request Body:**
```json
{
  "serviceType": "FOOD_PROVIDER",
  "name": "Catering Service",
  "nameAr": "خدمة التموين",
  "description": "...",
  "descriptionAr": "...",
  "price": 500,
  "pricePerHour": null,
  "categoryId": "category-uuid",
  "providerId": "provider-uuid",
  "images": ["url1", "url2"],
  "location": "City Center",
  "address": "123 Main St",
  "latitude": 30.0444,
  "longitude": 31.2357,
  "worksInVenues": true,
  "worksExternal": true,
  "requiresVenue": false,
  "workingHoursStart": "09:00",
  "workingHoursEnd": "22:00",
  "isActive": true
}
```

### Update Service (Admin)
```
PATCH /api/admin/services/:id
```

**Request Body:** (same as create, all fields optional)

### Delete/Deactivate Service (Admin)
```
DELETE /api/admin/services/:id
```

## 📊 Booking Type Examples

### Venue Only
```json
{
  "venueId": "venue-uuid",
  "date": "2024-03-15",
  "startTime": "10:00",
  "endTime": "20:00",
  "totalAmount": 1000
}
```
**Result:** `bookingType: "VENUE_ONLY"`

### Services Only
```json
{
  "services": [
    {
      "serviceId": "food-uuid",
      "locationType": "home",
      "locationAddress": "123 Main St",
      "price": 500
    }
  ],
  "date": "2024-03-15",
  "totalAmount": 500
}
```
**Result:** `bookingType: "SERVICES_ONLY"`

### Mixed (Venue + Services)
```json
{
  "venueId": "venue-uuid",
  "services": [
    {
      "serviceId": "food-uuid",
      "locationType": "venue",
      "price": 500
    }
  ],
  "date": "2024-03-15",
  "totalAmount": 1500
}
```
**Result:** `bookingType: "MIXED"`

## ⚠️ Validation Rules

1. **Date Required**: `date` is always required
2. **Venue or Services**: Either `venueId` or `services` array must be provided
3. **Service Requirements**: 
   - If service `requiresVenue = true`, `venueId` must be provided
   - If service `worksExternal = false`, cannot use external location types
   - If service `worksInVenues = false`, cannot use `locationType: "venue"`
4. **Location Types**:
   - `"venue"`: Requires `venueId` in booking
   - `"home"`, `"hotel"`, `"outdoor"`, `"other"`: Requires `locationAddress`
5. **Service Price**: Each service in `services` array should have a `price` field

## 🔍 Error Responses

```json
{
  "success": false,
  "error": "Service requires a venue to be selected"
}
```

Common errors:
- `"Date is required"`
- `"Service {id} not found"`
- `"Service {name} requires a venue"`
- `"Cannot book service at venue without selecting a venue"`
- `"Service {name} does not support external bookings"`
- `"Invalid credit card"`
















