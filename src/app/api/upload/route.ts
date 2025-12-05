import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient, getAuthenticatedUser } from '@/lib/serverUtils';

export async function POST(request: NextRequest) {
    try {
        // Check authentication
        const authData = await getAuthenticatedUser('admin');
        if (!authData) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const formData = await request.formData();
        const file = formData.get('file') as File;
        const bucket = formData.get('bucket') as string || 'property_gallery';

        if (!file) {
            return NextResponse.json(
                { error: 'No file provided' },
                { status: 400 }
            );
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
            return NextResponse.json(
                { error: 'File must be an image' },
                { status: 400 }
            );
        }

        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
            return NextResponse.json(
                { error: 'File size must be less than 5MB' },
                { status: 400 }
            );
        }

        const supabaseAdmin = getSupabaseAdminClient();
        const fileBuffer = await file.arrayBuffer();
        
        // Generate unique filename
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(7);
        const extension = file.name.split('.').pop();
        const fileName = `${timestamp}-${random}.${extension}`;

        // Upload to Supabase storage
        const { data, error } = await supabaseAdmin.storage
            .from(bucket)
            .upload(fileName, fileBuffer, {
                contentType: file.type,
                upsert: false
            });

        if (error) {
            console.error('Storage error:', error);
            return NextResponse.json(
                { error: 'Failed to upload file' },
                { status: 500 }
            );
        }

        // Get public URL
        const { data: { publicUrl } } = supabaseAdmin.storage
            .from(bucket)
            .getPublicUrl(fileName);

        return NextResponse.json({
            url: publicUrl,
            fileName: fileName
        });
    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json(
            { error: 'Failed to upload file' },
            { status: 500 }
        );
    }
}
