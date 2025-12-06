# Cloudinary Image Upload Integration

Complete Cloudinary integration for your Next.js + Supabase application with automatic validation, progress tracking, and error handling.

## 📋 Overview

This integration provides:

- ✅ **Direct uploads to Cloudinary** from the client-side
- ✅ **Automatic file validation** (2.5MB max, image formats only)
- ✅ **Real-time progress tracking** with visual feedback
- ✅ **Drag & drop support** for better UX
- ✅ **Image preview** before confirmation
- ✅ **Reusable components** and hooks
- ✅ **Error handling** with user-friendly messages
- ✅ **Batch upload support** for multiple files
- ✅ **TypeScript support** for type safety
- ✅ **Consistent validation** across all upload points

## 📦 What's Included

### Files Created

1. **Core Utility** (`src/lib/cloudinary.ts`)
   - `uploadToCloudinary()` - Upload single file
   - `uploadMultipleToCloudinary()` - Upload multiple files
   - `validateImageFile()` - Validate file before upload
   - `getOptimizedImageUrl()` - Generate optimized URLs
   - `deleteFromCloudinary()` - Delete images

2. **React Component** (`src/components/ui/cloudinary-image-upload.tsx`)
   - Reusable upload component with drag-drop
   - Progress indicator
   - Image preview
   - Error display

3. **React Hooks** (`src/hooks/useCloudinaryUpload.ts`)
   - `useCloudinaryUpload()` - Single file upload hook
   - `useMultipleCloudinaryUploads()` - Batch upload hook

4. **Backend API** (`src/app/api/cloudinary/delete/route.ts`)
   - Secure image deletion endpoint
   - Requires authentication

5. **Examples** (`src/components/examples/CloudinaryExamples.tsx`)
   - 5 practical usage examples
   - Form integration
   - Batch uploads

6. **Documentation**
   - `CLOUDINARY_SETUP.md` - Initial setup guide
   - `CLOUDINARY_MIGRATION.md` - Component migration steps
   - `CLOUDINARY_QUICK_REFERENCE.md` - Quick reference guide
   - `README.md` - This file

## 🚀 Quick Start

### 1. Set Environment Variables

Add to `.env.local`:

```bash
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_upload_preset
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

See `CLOUDINARY_SETUP.md` for detailed setup instructions.

### 2. Use the Component

```tsx
import { CloudinaryImageUpload } from '@/components/ui/cloudinary-image-upload';

export function MyForm() {
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

### 3. Save to Database

```tsx
// The imageUrl is ready to save directly to Supabase
await supabase
    .from('my_table')
    .update({ image_url: imageUrl });
```

## 🎯 Validation Rules

| Property | Value |
|----------|-------|
| Maximum File Size | 2.5 MB |
| Allowed Formats | JPEG, PNG, GIF, WebP |
| Client Validation | ✅ Yes (before upload) |
| Server Validation | ✅ Yes (during upload) |

### Error Messages

Users see helpful messages for:
- Files too large
- Invalid file formats
- Network errors
- Upload failures

## 📚 Usage Examples

### Simple Upload

```tsx
import { CloudinaryImageUpload } from '@/components/ui/cloudinary-image-upload';

const [url, setUrl] = useState<string | null>(null);

<CloudinaryImageUpload
    label="Profile Photo"
    value={url}
    onChange={setUrl}
    folder="unique_investors/profile"
    required
/>
```

### With Metadata

```tsx
<CloudinaryImageUpload
    label="Gallery Image"
    value={url}
    onChange={setUrl}
    onImageData={(data) => {
        console.log(`Image dimensions: ${data.width}x${data.height}`);
    }}
    folder="unique_investors/gallery"
/>
```

### Using Hook

```tsx
import { useCloudinaryUpload } from '@/hooks/useCloudinaryUpload';

const { upload, isUploading, progress, error } = useCloudinaryUpload({
    folder: 'unique_investors/testimonials',
    onSuccess: (result) => console.log(result.secure_url),
});

const handleUpload = async (file: File) => {
    const result = await upload(file);
};
```

### In React Hook Form

```tsx
import { useForm } from 'react-hook-form';
import { CloudinaryImageUpload } from '@/components/ui/cloudinary-image-upload';

const { control } = useForm();

<FormField
    control={control}
    name="image"
    render={({ field }) => (
        <CloudinaryImageUpload
            label="Upload"
            value={field.value}
            onChange={field.onChange}
            folder="unique_investors"
        />
    )}
/>
```

See `CloudinaryExamples.tsx` for more examples.

## 🔄 Migration from Base64

If you're currently storing base64 images, the migration path is:

1. Add Cloudinary environment variables
2. Replace `ImageUpload` with `CloudinaryImageUpload`
3. Update form schema to use `imageUrl` instead of `imageData`
4. Update database columns to store URLs
5. Migrate existing base64 data to Cloudinary (bulk migration script)

See `CLOUDINARY_MIGRATION.md` for detailed steps.

## 📂 Folder Organization

Recommended structure in Cloudinary:

```
unique_investors/
├── gallery/          # Property images
├── testimonials/     # Customer testimonials
├── verifications/    # Broker documents
├── transactions/     # Payment proofs
└── profile/          # User profiles
```

## 🖼️ Generate Optimized URLs

```tsx
import { getOptimizedImageUrl } from '@/lib/cloudinary';

// Thumbnail
const thumb = getOptimizedImageUrl(publicId, {
    width: 200,
    height: 200,
    format: 'webp'
});

// Hero image
const hero = getOptimizedImageUrl(publicId, {
    width: 1200,
    quality: 'auto'
});
```

## 🗑️ Delete Images

```tsx
import { deleteFromCloudinary } from '@/lib/cloudinary';

try {
    await deleteFromCloudinary(publicId);
    console.log('Deleted');
} catch (error) {
    console.error('Delete failed:', error);
}
```

## 🔐 Security

- **Client Upload**: Uses unsigned upload preset (API secret never exposed)
- **Delete Endpoint**: Requires user authentication
- **Server Validation**: Double-checks file size and type
- **CORS**: Cloudinary handles CORS automatically

## ⚡ Performance

- **CDN Delivery**: Images served via Cloudinary CDN
- **Auto Optimization**: Images automatically optimized
- **Caching**: Browser caching + CDN caching
- **Lazy Loading**: Implement in your components

## 📊 Monitoring

Track uploads in Cloudinary Dashboard:
- Upload statistics
- Bandwidth usage
- Error logs
- API quota

## 🐛 Troubleshooting

### Upload fails with 401/403
```
✓ Check CLOUDINARY_API_KEY is correct
✓ Verify upload preset exists and is "unsigned"
✓ Check API credentials are in .env.local
```

### File size validation fails
```
✓ Maximum is 2.5MB
✓ Check actual file size (not compressed)
✓ Try a different image file
```

### Images don't load
```
✓ Verify Cloudinary URL format
✓ Check image is successfully uploaded in dashboard
✓ Verify folder permissions
```

### Delete endpoint fails
```
✓ Ensure user is authenticated
✓ Check CLOUDINARY_API_SECRET is set
✓ Verify publicId is correct format
```

## 📖 Component Props

### CloudinaryImageUpload

```tsx
interface CloudinaryImageUploadProps {
    label: string;                              // Label text
    value?: string;                             // Current URL
    onChange: (url: string | null) => void;     // URL change handler
    onImageData?: (data: {                      // Optional metadata
        url: string;
        width?: number;
        height?: number;
    }) => void;
    error?: string;                             // Error message
    className?: string;                         // CSS classes
    required?: boolean;                         // Required field
    folder?: string;                            // Upload folder
    accept?: string;                            // File types
}
```

### useCloudinaryUpload Hook

```tsx
interface UseCloudinaryUploadOptions {
    folder?: string;                            // Upload folder
    maxSize?: number;                           // Max file size (MB)
    onSuccess?: (result) => void;               // Success callback
    onError?: (error) => void;                  // Error callback
}

// Returns
{
    isUploading: boolean;                       // Upload in progress
    progress: number;                           // 0-100
    error: string | null;                       // Error message
    preview: string | null;                     // Preview URL
    upload: (file: File) => Promise<Result>;    // Upload function
    reset: () => void;                          // Clear state
    clearError: () => void;                     // Clear error
}
```

## 💡 Best Practices

1. ✅ Always validate files before upload
2. ✅ Show upload progress to users
3. ✅ Handle errors gracefully
4. ✅ Store only URLs in database, not base64
5. ✅ Use appropriate folder structure
6. ✅ Implement lazy loading for images
7. ✅ Monitor bandwidth usage
8. ✅ Clean up unused images periodically

## 🔗 Resources

- [Cloudinary Documentation](https://cloudinary.com/documentation)
- [Upload API Reference](https://cloudinary.com/documentation/image_upload_api_reference)
- [URL-based Transformations](https://cloudinary.com/documentation/image_transformation_reference)
- [Optimization Tips](https://cloudinary.com/documentation/optimization_tips)

## 📝 File Size Reference

Max 2.5MB allows:
- High-quality photos: ✅
- Compressed PNGs: ✅
- Lossless WebP: ✅
- High-res screenshots: ✅
- Heavily compressed images: ✅

## 🎓 Learn More

- Read `CLOUDINARY_SETUP.md` for initial setup
- Read `CLOUDINARY_MIGRATION.md` for updating components
- Check `CLOUDINARY_QUICK_REFERENCE.md` for quick lookups
- View `CloudinaryExamples.tsx` for practical examples

## ✅ Checklist

- [ ] Add Cloudinary credentials to `.env.local`
- [ ] Create upload preset in Cloudinary dashboard
- [ ] Test upload component with sample image
- [ ] Verify images appear in Cloudinary dashboard
- [ ] Update one component to use new system
- [ ] Test file size validation (upload > 2.5MB)
- [ ] Test file type validation
- [ ] Test drag-drop functionality
- [ ] Test error handling
- [ ] Deploy to production

