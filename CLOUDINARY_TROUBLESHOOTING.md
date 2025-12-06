# Cloudinary Integration - Troubleshooting Guide

## Common Issues and Solutions

### 🔴 Environment Variables

#### Problem: "Cloudinary cloud name not configured"
```
Error: Cloudinary cloud name not configured
```

**Causes**:
- Missing `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` in `.env.local`
- Environment variable not reloaded after adding

**Solutions**:
1. ✅ Add to `.env.local`:
   ```bash
   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
   ```

2. ✅ Restart development server:
   ```bash
   # Stop current server (Ctrl+C)
   npm run dev  # or yarn dev
   ```

3. ✅ Verify variable:
   ```tsx
   console.log(process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME);
   // Should print: your_cloud_name
   ```

---

#### Problem: "Upload preset not found"
```
Error: upload preset not found
Status: 400
```

**Causes**:
- `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` is incorrect
- Preset doesn't exist in Cloudinary
- Preset is set to "Signed" instead of "Unsigned"

**Solutions**:
1. ✅ Verify preset exists:
   - Go to Cloudinary Dashboard > Settings > Upload
   - Check "Upload presets" section
   - Confirm preset name

2. ✅ Check preset is "Unsigned":
   - Edit preset in Cloudinary
   - Ensure "Signing Mode" is set to "Unsigned"
   - Save changes

3. ✅ Update `.env.local`:
   ```bash
   NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_preset_name
   ```

4. ✅ Restart dev server

---

#### Problem: "Unauthorized" on delete
```
Error: Failed to delete image
Status: 401
```

**Causes**:
- Missing `CLOUDINARY_API_KEY` or `CLOUDINARY_API_SECRET`
- Incorrect API credentials
- User not authenticated

**Solutions**:
1. ✅ Verify API credentials:
   - Go to Cloudinary > Settings > API Keys
   - Copy API Key and API Secret

2. ✅ Add to `.env.local`:
   ```bash
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```

3. ✅ Restart server

4. ✅ Ensure user is authenticated when calling delete

---

### 📦 File Upload Issues

#### Problem: "File size exceeds maximum allowed size"
```
Error: File size (2.7MB) exceeds maximum allowed size of 2.5MB
```

**Causes**:
- User selected file > 2.5MB
- File size calculation incorrect

**Solutions**:
1. ✅ Check actual file size:
   - Right-click file > Properties
   - Check Size field

2. ✅ Reduce file size:
   - Compress image using tool like TinyPNG
   - Crop image to smaller dimensions
   - Convert to WebP format (better compression)

3. ✅ For development, temporarily increase limit:
   ```tsx
   // src/lib/cloudinary.ts - Change this:
   const MAX_FILE_SIZE = 2.5 * 1024 * 1024; // 2.5 MB
   
   // To this:
   const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB for testing
   ```

---

#### Problem: "Invalid file format"
```
Error: Invalid file format. Allowed formats: JPEG, PNG, GIF, WebP. Got: image/svg+xml
```

**Causes**:
- User uploaded SVG, BMP, TIFF, or other unsupported format
- File has wrong extension

**Solutions**:
1. ✅ Convert to supported format:
   - Use online converter (CloudConvert, OnlineConvert)
   - Or use image editor (Photoshop, GIMP, Preview)

2. ✅ Supported formats only:
   - ✅ JPEG (.jpg, .jpeg)
   - ✅ PNG (.png)
   - ✅ GIF (.gif)
   - ✅ WebP (.webp)

3. ✅ Check file extension matches content:
   - Don't rename .png file to .jpg
   - Use correct extension for file type

---

#### Problem: Upload hangs/never completes
```
Progress stuck at 50%, upload doesn't finish
```

**Causes**:
- Network connection interrupted
- Browser tab inactive
- Server processing slow

**Solutions**:
1. ✅ Check network:
   - Open DevTools > Network tab
   - Look for failed requests
   - Check internet connection

2. ✅ Try in different browser:
   - Chrome, Firefox, Safari, Edge
   - Clear browser cache first

3. ✅ Try smaller file:
   - If it works, original file might be too large
   - Compress and try again

4. ✅ Check browser console:
   - DevTools > Console tab
   - Look for error messages
   - Share error for debugging

---

### 🖼️ Image Display Issues

#### Problem: "Image not loading after upload"
```
Blank image or 404 error on display
```

**Causes**:
- Incorrect Cloudinary URL
- Cloud Name mismatch
- Deleted from Cloudinary
- CORS issues

**Solutions**:
1. ✅ Verify URL format:
   ```
   ✅ Correct: https://res.cloudinary.com/cloud_name/image/upload/...
   ❌ Wrong: https://cloudinary.com/image/...
   ```

2. ✅ Check cloud name:
   - Dashboard shows your cloud name at top
   - Ensure URL uses correct name

3. ✅ Verify image in Cloudinary:
   - Go to Cloudinary > Media Library
   - Search for image
   - Check if it's there

4. ✅ Check CORS settings:
   - Usually default in Cloudinary
   - If issue persists, add Origin in CORS settings

---

#### Problem: "Thumbnail/optimized URL not working"
```
Optimized URL returns different image or error
```

**Causes**:
- Wrong public ID
- Transformation syntax error
- Image dimensions don't support transformation

**Solutions**:
1. ✅ Verify public ID:
   ```tsx
   // Check in Cloudinary Media Library
   // Public ID format: folder/name
   // Example: unique_investors/gallery/123-abc
   ```

2. ✅ Check transformation syntax:
   ```tsx
   // ✅ Correct
   getOptimizedImageUrl(publicId, { width: 200, height: 200 })
   
   // ❌ Wrong
   getOptimizedImageUrl(publicId, { width: "200px" }) // Use numbers
   ```

3. ✅ Test in Cloudinary URL builder:
   - Dashboard > Media Library
   - Select image
   - Use URL preview to test transformations

---

### 🔐 Security & Authentication Issues

#### Problem: "Unauthorized" when uploading from component
```
Error: Unauthorized
Status: 401
```

**Causes**:
- User not logged in
- Session expired
- Wrong authentication check

**Solutions**:
1. ✅ Ensure user is logged in:
   - Check authentication state
   - Verify JWT token is valid

2. ✅ For public uploads, use unsigned preset:
   - Check preset is set to "Unsigned"
   - Remove auth requirement from component

3. ✅ For admin uploads:
   - Verify user has admin role
   - Check Supabase RLS policies

---

#### Problem: "Signature verification failed"
```
Error on delete: Signature verification failed
```

**Causes**:
- API secret incorrect
- Public ID malformed
- Timestamp mismatch

**Solutions**:
1. ✅ Verify API secret:
   - Go to Settings > API Keys
   - Copy API Secret exactly
   - No extra spaces

2. ✅ Verify public ID format:
   ```tsx
   // ✅ Correct
   deleteFromCloudinary('unique_investors/gallery/123-abc')
   
   // ❌ Wrong
   deleteFromCloudinary('https://res.cloudinary.com/...')
   ```

3. ✅ Check server clock:
   - System time must be accurate
   - Sync time if needed

---

### 🎨 Component Issues

#### Problem: CloudinaryImageUpload component not found
```
Cannot find module '@/components/ui/cloudinary-image-upload'
```

**Solution**:
✅ Check file exists:
```
src/components/ui/cloudinary-image-upload.tsx
```

If not, create it from the provided code.

---

#### Problem: useCloudinaryUpload hook not working
```
Cannot find module '@/hooks/useCloudinaryUpload'
```

**Solution**:
✅ Check file exists:
```
src/hooks/useCloudinaryUpload.ts
```

If not, create it from the provided code.

---

#### Problem: TypeScript errors in component
```
Type 'string | null' is not assignable to type 'string | undefined'
```

**Solution**:
✅ Convert null to undefined:
```tsx
// ❌ Wrong
<CloudinaryImageUpload value={imageUrl} ... />
// if imageUrl is null

// ✅ Correct
<CloudinaryImageUpload value={imageUrl || undefined} ... />
```

---

### 📱 Browser-Specific Issues

#### Problem: Upload works in Chrome but not Firefox
```
Upload fails only in Firefox
```

**Causes**:
- Browser cache issue
- Different CORS behavior
- Extension interference

**Solutions**:
1. ✅ Clear Firefox cache:
   - Ctrl+Shift+Delete (or Cmd+Shift+Delete on Mac)
   - Select "All time"
   - Clear "Cache"

2. ✅ Try private/incognito mode:
   - Disable extensions temporarily
   - Test upload

3. ✅ Update Firefox to latest version

---

#### Problem: Mobile uploads not working
```
Upload fails on phone but works on desktop
```

**Causes**:
- Network connectivity issue
- Mobile browser cache
- Limited memory

**Solutions**:
1. ✅ Check network:
   - Try WiFi instead of mobile data
   - Or vice versa

2. ✅ Clear mobile browser cache:
   - Settings > Privacy > Clear Cache

3. ✅ Close other apps:
   - Free up device memory
   - Close browser tabs

4. ✅ Try smaller image:
   - Mobile browsers handle large files differently

---

### 🔍 Debugging Tips

#### Enable detailed logging:
```tsx
// In uploadToCloudinary function
console.log('Uploading file:', file.name, file.size);
console.log('Folder:', folder);
console.log('Cloud Name:', process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME);
```

#### Check Network tab:
1. Open DevTools (F12)
2. Go to Network tab
3. Try upload
4. Look for request to `api.cloudinary.com`
5. Check Response for error details

#### Check Cloudinary Logs:
1. Dashboard > Logs
2. Filter by date
3. Look for uploads/deletions
4. Check error messages

---

## Getting Help

### Before asking for help, check:

1. ✅ All environment variables set in `.env.local`
2. ✅ Server restarted after adding variables
3. ✅ File size < 2.5MB
4. ✅ File format is JPEG/PNG/GIF/WebP
5. ✅ Network connection working
6. ✅ User is authenticated (if required)
7. ✅ No console errors in DevTools

### Provide when asking for help:

- Error message (exact text)
- Browser and version
- File details (name, size, format)
- Network log from DevTools
- Console error messages
- Steps to reproduce

---

## Performance Optimization

### If uploads are slow:

1. ✅ Compress images before upload
2. ✅ Use WebP format (better compression)
3. ✅ Check internet speed
4. ✅ Try uploading smaller image first
5. ✅ Use CDN in different region

### If images load slowly:

1. ✅ Use optimized URLs with proper dimensions
2. ✅ Implement lazy loading
3. ✅ Use WebP format
4. ✅ Check Cloudinary bandwidth usage

---

## Cloudinary Dashboard Navigation

### Find Upload Logs:
Dashboard > Logs > Filter by Upload

### View Uploaded Images:
Dashboard > Media Library > Search

### Check Bandwidth:
Dashboard > Usage > Bandwidth

### Manage Upload Presets:
Settings > Upload > Upload presets

### View API Usage:
Settings > Usage > Requests

---

## Rollback if Issues Occur

If you have serious issues and need to rollback:

1. ✅ Keep backup of old ImageUpload component
2. ✅ Keep old upload logic in separate branch
3. ✅ Can gradually migrate component-by-component
4. ✅ Never force all at once

---

## Common Success Indicators

✅ You'll know it's working when:

- [ ] File upload dialog appears
- [ ] Drag-drop highlighting works
- [ ] Progress bar shows during upload
- [ ] Image preview appears after upload
- [ ] URL is saved to Supabase
- [ ] Image displays on page refresh
- [ ] Image appears in Cloudinary Media Library
- [ ] No errors in browser console
- [ ] No errors in server logs

---

Still stuck? Check the other documentation files:
- `CLOUDINARY_SETUP.md` - Setup guide
- `CLOUDINARY_MIGRATION.md` - Migration steps
- `CLOUDINARY_QUICK_REFERENCE.md` - Quick lookup
- `CloudinaryExamples.tsx` - Usage examples

