# Avatar Upload Setup

## Environment Variables

Add to your `.env` file:

```env
# Base URL for file uploads (use your production domain)
BASE_URL=https://back.dr-law.site
# OR for local development:
# BASE_URL=http://localhost:5000
```

## How It Works

1. **File Upload**: When a user uploads an avatar, it's saved to `uploads/users/avatars/` directory
2. **URL Generation**: The backend generates a full URL like `https://back.dr-law.site/uploads/users/avatars/userId_timestamp.jpg`
3. **Database Storage**: The full URL is stored in the database (not base64)
4. **Frontend Display**: The frontend displays images from URLs

## File Structure

```
backend/
├── uploads/
│   └── users/
│       └── avatars/
│           └── {userId}_{timestamp}.{ext}
```

## API Endpoint

- **PATCH** `/api/mobile/profile`
- **Content-Type**: `multipart/form-data`
- **Field name**: `avatar` (file)

## Migration from Base64

Old avatars stored as base64 will:
- Show fallback icon if truncated/invalid
- Be replaced when user uploads a new image
- New uploads will be stored as file URLs

## Testing

1. Upload a new profile image
2. Check console logs for:
   - `File uploaded successfully` with full URL
   - `Profile updated with file upload` with avatarUrl
3. Verify the avatar displays correctly in:
   - Profile page (`/user-profile`)
   - Header (MainHeader component)















