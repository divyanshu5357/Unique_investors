# Cloudinary Integration - Component Migration Guide

This guide shows how to update each component to use Cloudinary instead of base64 or local storage.

## 1. Testimonials Page Migration

**File**: `src/app/admin/(main)/testimonials/page.tsx`

### Changes:

1. Replace `ImageUpload` import:
```tsx
// OLD
import { ImageUpload } from '@/components/ui/image-upload';

// NEW
import { CloudinaryImageUpload } from '@/components/ui/cloudinary-image-upload';
```

2. Update schema to store URL instead of base64:
```tsx
// OLD
const testimonialSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    message: z.string().min(10, 'Message must be at least 10 characters'),
    rating: z.number().min(1).max(5),
    imageData: z.string().optional(),
    imageType: z.string().optional(),
    imageSize: z.number().optional(),
});

// NEW
const testimonialSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    message: z.string().min(10, 'Message must be at least 10 characters'),
    rating: z.number().min(1).max(5),
    imageUrl: z.string().optional(), // Cloudinary URL
});
```

3. Update form field:
```tsx
// OLD
<FormField
    control={form.control}
    name="imageData"
    render={({ field }) => (
        <FormItem>
            <ImageUpload
                label="Upload Testimonial Image"
                accept="image/*"
                maxSize={5}
                value={field.value ? {
                    data: field.value,
                    type: form.watch('imageType'),
                    size: form.watch('imageSize')
                } : null}
                onChange={(imageData) => {
                    if (imageData) {
                        form.setValue('imageData', imageData.data);
                        form.setValue('imageType', imageData.type);
                        form.setValue('imageSize', imageData.size);
                    }
                }}
            />
        </FormItem>
    )}
/>

// NEW
<FormField
    control={form.control}
    name="imageUrl"
    render={({ field }) => (
        <FormItem>
            <CloudinaryImageUpload
                label="Upload Testimonial Image"
                value={field.value}
                onChange={field.onChange}
                folder="unique_investors/testimonials"
            />
        </FormItem>
    )}
/>
```

4. Update submission payload:
```tsx
// OLD
const payload = {
    name: values.name,
    message: values.message,
    rating: values.rating,
    imageData: values.imageData,
    imageType: values.imageType,
    imageSize: values.imageSize,
};

// NEW
const payload = {
    name: values.name,
    message: values.message,
    rating: values.rating,
    imageUrl: values.imageUrl, // Cloudinary URL
};
```

---

## 2. Broker Verification Page Migration

**File**: `src/app/broker/(main)/verification/page.tsx`

### Changes:

1. Replace import:
```tsx
// OLD
import { ImageUpload } from '@/components/ui/image-upload';

// NEW
import { CloudinaryImageUpload } from '@/components/ui/cloudinary-image-upload';
```

2. Update schema:
```tsx
// OLD
const brokerVerificationSubmissionSchema = z.object({
    // ...
    idImageData: z.string(),
    idImageType: z.string(),
    idImageSize: z.number(),
});

// NEW
const brokerVerificationSubmissionSchema = z.object({
    // ...
    idImageUrl: z.string().url('Invalid image URL'),
});
```

3. Update form field:
```tsx
// OLD
<FormField
    control={form.control}
    name="idImageData"
    render={({ field }) => (
        <FormItem>
            <ImageUpload
                label="Upload ID Document"
                accept="image/*"
                maxSize={5}
                value={field.value ? {
                    data: field.value,
                    type: form.watch('idImageType'),
                    size: form.watch('idImageSize')
                } : null}
                onChange={(imageData) => {
                    if (imageData) {
                        form.setValue('idImageData', imageData.data);
                        form.setValue('idImageType', imageData.type);
                        form.setValue('idImageSize', imageData.size);
                    }
                }}
            />
        </FormItem>
    )}
/>

// NEW
<FormField
    control={form.control}
    name="idImageUrl"
    render={({ field }) => (
        <FormItem>
            <CloudinaryImageUpload
                label="Upload ID Document"
                value={field.value}
                onChange={field.onChange}
                folder="unique_investors/verifications"
                required
            />
        </FormItem>
    )}
/>
```

---

## 3. Property Gallery Page Migration

**File**: `src/app/admin/(main)/gallery/page.tsx`

### Changes:

1. Update image URL handling:
```tsx
// OLD - Uses local Supabase upload
const uploadToSupabase = async (file: File): Promise<string> => {
    const formDataWithFile = new FormData();
    formDataWithFile.append('file', file);
    formDataWithFile.append('bucket', 'property_gallery');

    const response = await fetch('/api/upload', {
        method: 'POST',
        body: formDataWithFile,
    });
    const data = await response.json();
    return data.url;
};

// NEW - Uses Cloudinary
import { uploadToCloudinary } from '@/lib/cloudinary';

const uploadImage = async (file: File): Promise<string> => {
    const result = await uploadToCloudinary(file, 'unique_investors/gallery');
    return result.secure_url;
};
```

2. Update file validation:
```tsx
// OLD
if (file.size > 5 * 1024 * 1024) {
    toast({ title: 'Error', description: 'Image size should be less than 5MB' });
}

// NEW
import { validateImageFile } from '@/lib/cloudinary';

const validation = validateImageFile(file);
if (!validation.isValid) {
    toast({ title: 'Error', description: validation.error });
}
```

---

## 4. Transaction/Payment Proof Upload

**File**: `src/app/admin/(main)/transactions/page.tsx`

### Changes:

1. Replace inline upload with Cloudinary:
```tsx
// OLD
const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, { upsert: true });

// NEW
import { uploadToCloudinary } from '@/lib/cloudinary';

const result = await uploadToCloudinary(file, 'unique_investors/transactions');
const publicUrl = result.secure_url;
```

2. Update error handling:
```tsx
// OLD
if (uploadError) {
    toast({ title: 'Upload Failed', description: uploadError.message });
}

// NEW
try {
    const result = await uploadToCloudinary(file, 'unique_investors/transactions');
    field.onChange(result.secure_url);
    toast({ title: 'Image Uploaded', description: 'Proof image attached.' });
} catch (error) {
    toast({ 
        title: 'Upload Error', 
        description: error instanceof Error ? error.message : 'Upload failed'
    });
}
```

---

## 5. Supabase Schema Updates

Update database columns to store Cloudinary URLs:

```sql
-- For testimonials
ALTER TABLE testimonials 
DROP COLUMN IF EXISTS image_data,
DROP COLUMN IF EXISTS image_type,
DROP COLUMN IF EXISTS image_size,
ADD COLUMN image_url TEXT;

-- For broker verifications
ALTER TABLE broker_verifications
DROP COLUMN IF EXISTS id_image_data,
DROP COLUMN IF EXISTS id_image_type,
DROP COLUMN IF EXISTS id_image_size,
ADD COLUMN id_image_url TEXT;

-- For property gallery
ALTER TABLE property_gallery
MODIFY COLUMN image_url TEXT; -- Ensure it's TEXT type

-- For transactions (payment proof)
ALTER TABLE transactions
ADD COLUMN proof_image_url TEXT;

-- Add indexes
CREATE INDEX idx_testimonials_image_url ON testimonials(image_url);
CREATE INDEX idx_broker_verifications_image_url ON broker_verifications(id_image_url);
CREATE INDEX idx_transactions_proof_image ON transactions(proof_image_url);
```

---

## 6. Backend Actions Update

Update `src/lib/actions.ts` functions to handle Cloudinary URLs:

```tsx
// OLD
export async function createTestimonial(testimonialData: any) {
    const { data: testimonial, error } = await supabaseAdmin
        .from('testimonials')
        .insert({
            ...testimonialData,
            image_data: testimonialData.imageData,
            image_type: testimonialData.imageType,
            image_size: testimonialData.imageSize,
        })
        .select()
        .single();
}

// NEW
export async function createTestimonial(testimonialData: any) {
    const { data: testimonial, error } = await supabaseAdmin
        .from('testimonials')
        .insert({
            name: testimonialData.name,
            message: testimonialData.message,
            rating: testimonialData.rating,
            image_url: testimonialData.imageUrl, // Cloudinary URL
            created_at: new Date().toISOString()
        })
        .select()
        .single();
}
```

---

## Environment Variables

Add to `.env.local`:

```bash
# Cloudinary
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_upload_preset
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

---

## Testing Checklist

- [ ] Upload testimonial image - verify URL is saved to Supabase
- [ ] Upload broker verification document - verify format is correct
- [ ] Upload gallery image - verify it displays in gallery
- [ ] Test file size validation - reject files > 2.5MB
- [ ] Test file type validation - reject non-image files
- [ ] Test drag-drop upload
- [ ] Verify progress bar shows during upload
- [ ] Test image deletion (if applicable)
- [ ] Verify images load from Cloudinary CDN

---

## Benefits

✅ **Faster Uploads**: CDN delivery from Cloudinary
✅ **Automatic Optimization**: Cloudinary optimizes images on the fly
✅ **Scalable**: No database storage bloat
✅ **Responsive Images**: Easy to generate thumbnails via URL parameters
✅ **Consistent Validation**: 2-3MB max enforced client-side
✅ **Better UX**: Progress tracking and preview

