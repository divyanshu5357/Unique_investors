# Cloudinary Integration - Quick Reference

## Quick Start

### 1. Add Environment Variables
```bash
# .env.local
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_preset
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### 2. Use CloudinaryImageUpload Component
```tsx
import { CloudinaryImageUpload } from '@/components/ui/cloudinary-image-upload';

export function MyComponent() {
    const [imageUrl, setImageUrl] = useState<string | null>(null);

    return (
        <CloudinaryImageUpload
            label="Upload Image"
            value={imageUrl}
            onChange={setImageUrl}
            folder="unique_investors/gallery"
            required
        />
    );
}
```

### 3. Use Upload Hook
```tsx
import { useCloudinaryUpload } from '@/hooks/useCloudinaryUpload';

export function MyComponent() {
    const { upload, isUploading, error } = useCloudinaryUpload({
        folder: 'unique_investors/testimonials',
        onSuccess: (result) => console.log('Uploaded:', result.secure_url),
    });

    const handleFileSelect = async (file: File) => {
        const result = await upload(file);
        if (result) {
            // Save result.secure_url to database
        }
    };

    return (
        <div>
            <input type="file" onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])} />
            {isUploading && <p>Uploading...</p>}
            {error && <p className="text-red-500">{error}</p>}
        </div>
    );
}
```

### 4. Programmatic Upload
```tsx
import { uploadToCloudinary, validateImageFile } from '@/lib/cloudinary';

export async function handleImageUpload(file: File) {
    // Validate first
    const validation = validateImageFile(file);
    if (!validation.isValid) {
        console.error(validation.error);
        return;
    }

    try {
        const result = await uploadToCloudinary(file, 'unique_investors/gallery');
        console.log('Uploaded URL:', result.secure_url);
        return result.secure_url;
    } catch (error) {
        console.error('Upload failed:', error);
    }
}
```

## File Size Validation

```tsx
import { validateImageFile } from '@/lib/cloudinary';

// Validates file before upload
const validation = validateImageFile(file);

// Returns:
// {
//   isValid: true,
//   error?: string // Only if invalid
// }

// Validation Rules:
// - Max Size: 2.5 MB
// - Allowed Types: JPEG, PNG, GIF, WebP
```

## Folder Structure

Recommended folder organization in Cloudinary:

```
unique_investors/
├── gallery/          # Property gallery images
├── testimonials/     # Customer testimonial images
├── verifications/    # Broker ID/verification documents
├── transactions/     # Payment proof images
├── profile/          # User profile pictures
└── temporary/        # Temp uploads (auto-delete after 24h)
```

## Generate Optimized URLs

```tsx
import { getOptimizedImageUrl } from '@/lib/cloudinary';

// Thumbnail (200x200, WebP, high quality)
const thumb = getOptimizedImageUrl(publicId, {
    width: 200,
    height: 200,
    format: 'webp',
    quality: 'high'
});

// Hero image (1200px width, auto quality)
const hero = getOptimizedImageUrl(publicId, {
    width: 1200,
    quality: 'auto',
    format: 'auto'
});

// Mobile image (500px width)
const mobile = getOptimizedImageUrl(publicId, {
    width: 500,
    quality: 'auto'
});
```

## Delete Image

```tsx
import { deleteFromCloudinary } from '@/lib/cloudinary';

async function handleDeleteImage(publicId: string) {
    try {
        await deleteFromCloudinary(publicId);
        console.log('Image deleted');
    } catch (error) {
        console.error('Delete failed:', error);
    }
}
```

## Component Props

### CloudinaryImageUpload

```tsx
interface CloudinaryImageUploadProps {
    label: string;                           // Label text
    value?: string;                          // Cloudinary URL
    onChange: (url: string | null) => void;  // URL change callback
    onImageData?: (data: {                   // Optional metadata
        url: string;
        width?: number;
        height?: number;
    }) => void;
    error?: string;                          // Error message to display
    className?: string;                      // CSS classes
    required?: boolean;                      // Mark as required
    folder?: string;                         // Cloudinary folder path
    accept?: string;                         // File input accept attribute
}
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Upload fails with 401/403 | Check CLOUDINARY_API_KEY and API_SECRET are correct |
| "Unsigned preset not found" | Create unsigned upload preset in Cloudinary dashboard |
| File size error | File exceeds 2.5MB - check actual file size |
| Images not loading | Verify Cloudinary URL format and CORS settings |
| Delete fails | Ensure user is authenticated and has permissions |

## Database Storage

Store only the Cloudinary URL in your database:

```sql
-- Good ✓
CREATE TABLE testimonials (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    image_url TEXT, -- Store only URL
    created_at TIMESTAMP
);

-- Don't store base64 data anymore ✗
-- image_data LONGTEXT,
-- image_type TEXT,
-- image_size INT,
```

## Migration from Base64

If you have existing base64 images:

```tsx
// Convert old base64 to Cloudinary
async function migrateImageToCdoudinary(base64Data: string, mimeType: string) {
    // Convert base64 to blob
    const bytes = atob(base64Data.split(',')[1]);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) {
        arr[i] = bytes.charCodeAt(i);
    }
    const blob = new Blob([arr], { type: mimeType });
    const file = new File([blob], 'image.jpg', { type: mimeType });

    // Upload to Cloudinary
    return await uploadToCloudinary(file, 'unique_investors/archive');
}
```

## API Endpoints

### Upload (Client-side)
- **URL**: Direct to Cloudinary API
- **Method**: POST
- **Auth**: Upload preset (unsigned)

### Delete (Backend)
- **URL**: `/api/cloudinary/delete`
- **Method**: POST
- **Body**: `{ publicId: string }`
- **Auth**: Required (user must be authenticated)

## Performance Tips

1. ✅ Use WebP format for better compression
2. ✅ Resize images on the fly using URL parameters
3. ✅ Use CDN URLs for faster delivery
4. ✅ Implement lazy loading for images
5. ✅ Monitor Cloudinary bandwidth usage
6. ✅ Set appropriate folder permissions

## Support

For more details, see:
- [CLOUDINARY_SETUP.md](./CLOUDINARY_SETUP.md) - Setup guide
- [CLOUDINARY_MIGRATION.md](./CLOUDINARY_MIGRATION.md) - Component migration guide

