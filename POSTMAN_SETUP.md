# Postman Collection Setup Guide

This guide explains how to import and use the Mobile API Postman collection for testing.

## Files Included

1. **Mobile_API.postman_collection.json** - Complete collection with all mobile endpoints
2. **Mobile_API.postman_environment.json** - Environment variables for local development

## Importing the Collection

### Step 1: Import Collection
1. Open Postman
2. Click **Import** button (top left)
3. Select **File** tab
4. Browse and select `Mobile_API.postman_collection.json`
5. Click **Import**

### Step 2: Import Environment (Optional but Recommended)
1. Click **Import** button again
2. Select **File** tab
3. Browse and select `Mobile_API.postman_environment.json`
4. Click **Import**
5. Select the imported environment from the environment dropdown (top right)

## Environment Variables

The collection uses the following variables:

| Variable | Default Value | Description |
|----------|---------------|-------------|
| `base_url` | `http://localhost:5000` | Base URL of the API server |
| `auth_token` | (empty) | JWT authentication token (auto-populated after login) |
| `user_id` | (empty) | Current user ID (optional) |
| `venue_id` | (empty) | Venue ID for testing (optional) |
| `service_id` | (empty) | Service ID for testing (optional) |
| `booking_id` | (empty) | Booking ID for testing (optional) |
| `category_id` | (empty) | Category ID for testing (optional) |

## Collection Structure

The collection is organized into three main folders:

### 1. Authentication
- **Send OTP** - Send OTP to phone number
- **Verify OTP** - Verify OTP and login/register (auto-saves token)
- **Register** - Register new user (auto-saves token)
- **Login** - Login with phone/password (auto-saves token)
- **Get Current User** - Get authenticated user profile

### 2. Public Endpoints
- **Home** - Get home page data (categories, venues, sliders)
- **Venues** - List venues, get details, available slots, booked dates
- **Services** - List services, get details, check availability
- **Categories** - Get all categories
- **Search** - Search venues and services
- **Settings & Content** - App settings, privacy, terms, about

### 3. Authenticated Endpoints
- **Bookings** - Manage bookings (list, create, cancel, pay remaining)
- **Wallet** - Get wallet balance and transactions
- **Profile** - Get, update, or delete user profile
- **Notifications** - Get notifications and mark as read
- **Coupons** - Get coupons and apply them
- **Credit Cards** - Manage credit cards (CRUD operations)
- **Favorites** - Manage favorite venues

## Quick Start Guide

### 1. Authentication Flow

1. **Send OTP**
   - Open `Authentication > Send OTP`
   - Update phone number in request body
   - Click **Send**

2. **Verify OTP**
   - Open `Authentication > Verify OTP`
   - Update phone and OTP in request body
   - Click **Send**
   - Token is automatically saved to `auth_token` variable

3. **Test Authenticated Endpoint**
   - Open any request in `Authenticated Endpoints` folder
   - The `Authorization: Bearer {{auth_token}}` header is already set
   - Click **Send**

### 2. Testing Public Endpoints

Public endpoints don't require authentication. Simply:
1. Open any request in `Public Endpoints` folder
2. Update path variables if needed (e.g., `:id` for venue details)
3. Adjust query parameters if needed
4. Click **Send**

### 3. Testing Authenticated Endpoints

After authentication:
1. Token is automatically saved by login/verify OTP endpoints
2. All authenticated requests use `{{auth_token}}` in Authorization header
3. Update path variables and request bodies as needed
4. Click **Send**

## Auto-Save Token Feature

The following endpoints automatically save the authentication token:
- **Verify OTP** - Saves token to `auth_token` variable
- **Register** - Saves token to `auth_token` variable
- **Login** - Saves token to `auth_token` variable

This means you only need to authenticate once, and all subsequent authenticated requests will work automatically.

## Updating Variables

### Method 1: Environment Editor
1. Click on environment name (top right)
2. Click **Edit** (pencil icon)
3. Update values
4. Click **Save**

### Method 2: Request Body
Some requests use path variables like `:id`. You can:
1. Double-click the path variable in the URL
2. Update the value directly
3. Or replace `:id` with actual ID in the URL

### Method 3: Collection Variables
1. Right-click collection name
2. Select **Edit**
3. Go to **Variables** tab
4. Update variable values

## Common Testing Scenarios

### Scenario 1: Complete Booking Flow
1. Authenticate (Send OTP → Verify OTP)
2. Get Home data to see available venues
3. Get Venue Details for a specific venue
4. Get Available Slots for that venue
5. Create Booking
6. Get User Bookings to verify
7. Get Booking Details

### Scenario 2: Profile Management
1. Authenticate
2. Get Profile
3. Update Profile (with optional avatar upload)
4. Get Profile again to verify changes

### Scenario 3: Favorites Management
1. Authenticate
2. Get All Venues
3. Add Venue to Favorites
4. Get Favorites to verify
5. Remove from Favorites

### Scenario 4: Coupon Application
1. Authenticate
2. Get All Coupons
3. Get Coupon by Code
4. Apply Coupon (with amount)

## Tips

1. **Use Collections Runner** - Test multiple requests in sequence
2. **Save Responses** - Right-click response → Save Response → Save as Example
3. **Documentation** - Each request includes description. Read before testing
4. **Pre-request Scripts** - Some requests have scripts to auto-populate variables
5. **Test Scripts** - OTP/Login requests have test scripts to save tokens

## Troubleshooting

### Token Not Saving
- Check that you've imported the environment
- Verify environment is selected (top right dropdown)
- Manually copy token from response and paste into `auth_token` variable

### 401 Unauthorized
- Verify `auth_token` is set in environment
- Check token hasn't expired (tokens typically expire after 24 hours)
- Re-authenticate to get a new token

### 404 Not Found
- Verify `base_url` is correct (default: `http://localhost:5000`)
- Check backend server is running
- Verify path variables (`:id`) are replaced with actual IDs

### Connection Refused
- Ensure backend server is running on port 5000
- Check if port is different and update `base_url`
- Verify CORS is configured properly on backend

## Additional Resources

- [MOBILE_API_ENDPOINTS.md](../MOBILE_API_ENDPOINTS.md) - Detailed endpoint documentation
- [API_ENDPOINTS.md](./API_ENDPOINTS.md) - Full API reference
- [MOBILE_ROUTES.md](../frontend/MOBILE_ROUTES.md) - Frontend route mapping

## Collection Version

- **Version**: 1.0.0
- **Created**: 2024-01-15
- **Compatible with**: Postman v10.0.0+



