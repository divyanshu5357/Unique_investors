/**
 * Cloudinary Image Upload Utility
 * Handles all image uploads to Cloudinary with validation and error handling
 */

const MAX_FILE_SIZE = 2.5 * 1024 * 1024; // 2.5 MB
const ALLOWED_FORMATS = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export interface CloudinaryUploadResult {
    url: string;
    secure_url: string;
    public_id: string;
    width: number;
    height: number;
    bytes: number;
    format: string;
}

export interface UploadValidationError {
    type: 'file_size' | 'file_type' | 'network' | 'unknown';
    message: string;
}

/**
 * Validates file before upload
 * @param file - File to validate
 * @returns Object with isValid boolean and error message if invalid
 */
export function validateImageFile(file: File): { isValid: boolean; error?: string } {
    // Check file type
    if (!ALLOWED_FORMATS.includes(file.type)) {
        return {
            isValid: false,
            error: `Invalid file format. Allowed formats: JPEG, PNG, GIF, WebP. Got: ${file.type}`
        };
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
        return {
            isValid: false,
            error: `File size (${sizeMB}MB) exceeds maximum allowed size of 2.5MB`
        };
    }

    return { isValid: true };
}

/**
 * Uploads image to Cloudinary
 * @param file - File to upload
 * @param folder - Cloudinary folder path (e.g., 'unique_investors/gallery')
 * @param options - Additional upload options
 * @returns Promise with upload result containing the image URL
 */
export async function uploadToCloudinary(
    file: File,
    folder: string = 'unique_investors',
    options?: {
        onProgress?: (progress: number) => void;
        tags?: string[];
        resourceType?: string;
    }
): Promise<CloudinaryUploadResult> {
    // Validate file first
    const validation = validateImageFile(file);
    if (!validation.isValid) {
        throw new Error(validation.error || 'File validation failed');
    }

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    if (!cloudName) {
        throw new Error('Cloudinary cloud name not configured');
    }

    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'default');
    formData.append('folder', folder);
    
    if (options?.tags) {
        formData.append('tags', options.tags.join(','));
    }

    // Add public_id for organization
    const timestamp = Date.now();
    const publicId = `${folder}/${timestamp}-${Math.random().toString(36).substring(7)}`;
    formData.append('public_id', publicId);

    try {
        const response = await fetch(uploadUrl, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Cloudinary upload error:', errorData);
            
            if (response.status === 400) {
                throw new Error('Invalid upload request. Please check your file.');
            } else if (response.status === 413) {
                throw new Error('File is too large. Maximum size is 2.5MB.');
            } else if (response.status === 401 || response.status === 403) {
                throw new Error('Upload authentication failed. Please try again.');
            }
            
            throw new Error(errorData.error?.message || 'Upload failed');
        }

        const data = await response.json();

        return {
            url: data.url,
            secure_url: data.secure_url,
            public_id: data.public_id,
            width: data.width,
            height: data.height,
            bytes: data.bytes,
            format: data.format,
        };
    } catch (error) {
        if (error instanceof Error) {
            throw error;
        }
        throw new Error('Failed to upload image to Cloudinary');
    }
}

/**
 * Batch upload multiple images to Cloudinary
 * @param files - Array of files to upload
 * @param folder - Cloudinary folder path
 * @param options - Upload options
 * @returns Promise with array of upload results
 */
export async function uploadMultipleToCloudinary(
    files: File[],
    folder: string = 'unique_investors',
    options?: {
        onProgress?: (index: number, total: number) => void;
        tags?: string[];
    }
): Promise<CloudinaryUploadResult[]> {
    const results: CloudinaryUploadResult[] = [];

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Validate each file
        const validation = validateImageFile(file);
        if (!validation.isValid) {
            console.warn(`Skipping file ${file.name}: ${validation.error}`);
            continue;
        }

        try {
            const result = await uploadToCloudinary(file, folder, {
                tags: options?.tags,
            });
            results.push(result);
            
            if (options?.onProgress) {
                options.onProgress(i + 1, files.length);
            }
        } catch (error) {
            console.error(`Failed to upload ${file.name}:`, error);
            throw error;
        }
    }

    return results;
}

/**
 * Generate optimized Cloudinary image URL with transformations
 * @param publicId - Cloudinary public ID
 * @param options - Transform options
 * @returns Optimized image URL
 */
export function getOptimizedImageUrl(
    publicId: string,
    options?: {
        width?: number;
        height?: number;
        quality?: 'auto' | 'low' | 'medium' | 'high';
        format?: 'auto' | 'webp' | 'jpg' | 'png';
    }
): string {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    if (!cloudName) {
        throw new Error('Cloudinary cloud name not configured');
    }

    const transforms: string[] = [];

    if (options?.width || options?.height) {
        const w = options.width ? `w_${options.width}` : '';
        const h = options.height ? `h_${options.height}` : '';
        const crop = 'c_limit'; // Limit to aspect ratio
        transforms.push([w, h, crop].filter(Boolean).join(','));
    }

    if (options?.quality) {
        transforms.push(`q_${options.quality}`);
    }

    if (options?.format) {
        transforms.push(`f_${options.format}`);
    }

    const transformString = transforms.length > 0 ? `${transforms.join('/')}/` : '';
    return `https://res.cloudinary.com/${cloudName}/image/upload/${transformString}${publicId}`;
}

/**
 * Delete image from Cloudinary (requires backend API with admin credentials)
 * @param publicId - Cloudinary public ID
 * @returns Promise that resolves when deletion is complete
 */
export async function deleteFromCloudinary(publicId: string): Promise<void> {
    try {
        const response = await fetch('/api/cloudinary/delete', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ publicId }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to delete image');
        }
    } catch (error) {
        console.error('Error deleting from Cloudinary:', error);
        throw error;
    }
}
