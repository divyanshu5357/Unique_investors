import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/serverUtils';
import crypto from 'crypto';

/**
 * POST /api/cloudinary/delete
 * Deletes an image from Cloudinary
 * Uses Cloudinary REST API with authentication
 */
export async function POST(request: NextRequest) {
    try {
        // Check authentication
        const authData = await getAuthenticatedUser();
        if (!authData) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { publicId } = body;

        if (!publicId) {
            return NextResponse.json(
                { error: 'Public ID is required' },
                { status: 400 }
            );
        }

        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
        const apiKey = process.env.CLOUDINARY_API_KEY;
        const apiSecret = process.env.CLOUDINARY_API_SECRET;

        if (!cloudName || !apiKey || !apiSecret) {
            console.error('Cloudinary credentials not configured');
            return NextResponse.json(
                { error: 'Cloudinary not properly configured' },
                { status: 500 }
            );
        }

        // Create authentication for Cloudinary API
        const timestamp = Math.floor(Date.now() / 1000);
        const toSign = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
        const signature = crypto.createHash('sha1').update(toSign).digest('hex');

        // Call Cloudinary API to delete
        const formData = new FormData();
        formData.append('public_id', publicId);
        formData.append('timestamp', timestamp.toString());
        formData.append('api_key', apiKey);
        formData.append('signature', signature);

        const deleteUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`;

        const deleteResponse = await fetch(deleteUrl, {
            method: 'POST',
            body: formData,
        });

        if (!deleteResponse.ok) {
            const errorData = await deleteResponse.json();
            console.error('Cloudinary delete error:', errorData);
            return NextResponse.json(
                { error: 'Failed to delete image from Cloudinary' },
                { status: 400 }
            );
        }

        const result = await deleteResponse.json();

        return NextResponse.json({
            success: true,
            message: 'Image deleted successfully',
            result
        });
    } catch (error) {
        console.error('Error deleting from Cloudinary:', error);
        return NextResponse.json(
            { error: 'Failed to delete image' },
            { status: 500 }
        );
    }
}
