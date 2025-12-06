# Cloudinary Integration Guide

## Environment Variables Required

Add these to your `.env.local` file:

```bash
# Cloudinary Configuration
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_upload_preset
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## Setup Steps

### 1. Create Cloudinary Account
- Go to https://cloudinary.com/
- Sign up for a free account
- Navigate to your Dashboard

### 2. Get Your Credentials
- **Cloud Name**: Found in your Dashboard (top center)
- **API Key & Secret**: Found in Settings > API Keys

### 3. Create Upload Preset
1. Go to Settings > Upload
2. Scroll to "Upload presets" section
3. Click "Add upload preset"
4. Enter Name (e.g., `default` or `unique_investors`)
5. Set Signing Mode to "Unsigned"
6. Set Mode to "Unsigned" (for client-side uploads)
7. Save the preset

**Important**: Use "Unsigned" for client-side uploads to avoid exposing your API secret.

### 4. Add Environment Variables
Update your `.env.local`:

```bash
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=<your-cloud-name>
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=<your-preset-name>
CLOUDINARY_API_KEY=<your-api-key>
CLOUDINARY_API_SECRET=<your-api-secret>
```

### 5. Update Folder Structure (Optional)
In your Cloudinary dashboard, you can create folders:
- `unique_investors/gallery` - For property gallery images
- `unique_investors/testimonials` - For testimonial images
- `unique_investors/verifications` - For broker verification documents
- `unique_investors/transactions` - For payment proof images

## Using the Upload Components

### Simple Image Upload
```tsx
import { CloudinaryImageUpload } from '@/components/ui/cloudinary-image-upload';

export function MyComponent() {
    const [imageUrl, setImageUrl] = useState<string | null>(null);

    return (
        <CloudinaryImageUpload
            label="Upload Profile Picture"
            value={imageUrl}
            onChange={setImageUrl}
            folder="unique_investors/profile"
            required
        />
    );
}
```

### With Metadata Handling
```tsx
<CloudinaryImageUpload
    label="Gallery Image"
    value={imageUrl}
    onChange={setImageUrl}
    onImageData={(data) => {
        console.log('Image dimensions:', data.width, data.height);
        // Store in database
    }}
    folder="unique_investors/gallery"
/>
```

## Validation Rules

- **Maximum File Size**: 2.5 MB
- **Allowed Formats**: JPEG, PNG, GIF, WebP
- **Automatic Validation**: Validates on client-side before upload
- **Error Messages**: User-friendly error messages displayed in UI

## Features

✅ **Direct Upload to Cloudinary**: No server upload needed
✅ **File Size Validation**: Maximum 2.5MB enforced
✅ **File Type Validation**: Only image formats allowed
✅ **Drag & Drop Support**: Easy image upload
✅ **Progress Tracking**: Shows upload progress
✅ **Image Preview**: Shows preview before confirmation
✅ **Error Handling**: Clear error messages
✅ **Responsive Design**: Works on all devices

## Image URLs in Database

All image URLs stored in Supabase will be Cloudinary URLs:

Example: `https://res.cloudinary.com/<cloud-name>/image/upload/...`

### Using Optimized URLs

```tsx
import { getOptimizedImageUrl } from '@/lib/cloudinary';

// Generate thumbnail
const thumbnail = getOptimizedImageUrl(publicId, {
    width: 200,
    height: 200,
    quality: 'auto',
    format: 'webp'
});
```

## Troubleshooting

### Upload fails with "Unauthorized"
- Check that `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` is correct
- Verify preset is set to "Unsigned" in Cloudinary dashboard

### File size error
- File exceeds 2.5MB limit
- Check actual file size before upload

### Image not loading after upload
- Verify the Cloudinary URL is correct
- Check that CORS is enabled in Cloudinary settings (usually default)

### Delete functionality not working
- Ensure `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET` are correctly set
- Verify user is authenticated when calling delete
