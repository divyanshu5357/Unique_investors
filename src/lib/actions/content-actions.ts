'use server';

import { revalidatePath } from 'next/cache';
import { getAuthenticatedUser, authorizeAdmin, getSupabaseAdminClient } from '@/lib/serverUtils';
import { logger } from '@/lib/utils/logger';

// ========== TESTIMONIALS & CONTENT MANAGEMENT ==========

export async function getTestimonials() {
    try {
        const supabaseAdmin = getSupabaseAdminClient();
        
        const { data: testimonials, error } = await supabaseAdmin
            .from('testimonials')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            throw new Error(`Failed to fetch testimonials: ${error.message}`);
        }

        return testimonials || [];
    } catch (error) {
        logger.error('Error in getTestimonials:', error);
        throw new Error(`Failed to get testimonials: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export async function createTestimonial(testimonialData: any) {
    try {
        await authorizeAdmin();
        const supabaseAdmin = getSupabaseAdminClient();
        
        const { data: testimonial, error } = await supabaseAdmin
            .from('testimonials')
            .insert({
                ...testimonialData,
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to create testimonial: ${error.message}`);
        }

        revalidatePath('/admin/testimonials');
        return testimonial;
    } catch (error) {
        logger.error('Error in createTestimonial:', error);
        throw new Error(`Failed to create testimonial: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export async function updateTestimonial(id: string, updates: any) {
    try {
        await authorizeAdmin();
        const supabaseAdmin = getSupabaseAdminClient();
        
        const { data: testimonial, error } = await supabaseAdmin
            .from('testimonials')
            .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to update testimonial: ${error.message}`);
        }

        revalidatePath('/admin/testimonials');
        return testimonial;
    } catch (error) {
        logger.error('Error in updateTestimonial:', error);
        throw new Error(`Failed to update testimonial: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export async function deleteTestimonial(id: string) {
    try {
        await authorizeAdmin();
        const supabaseAdmin = getSupabaseAdminClient();
        
        const { error } = await supabaseAdmin
            .from('testimonials')
            .delete()
            .eq('id', id);

        if (error) {
            throw new Error(`Failed to delete testimonial: ${error.message}`);
        }

        revalidatePath('/admin/testimonials');
        return { success: true };
    } catch (error) {
        logger.error('Error in deleteTestimonial:', error);
        throw new Error(`Failed to delete testimonial: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export async function submitTestimonial(testimonialData: any) {
    try {
        const supabaseAdmin = getSupabaseAdminClient();
        
        const { data: testimonial, error } = await supabaseAdmin
            .from('testimonials')
            .insert({
                ...testimonialData,
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to submit testimonial: ${error.message}`);
        }

        return testimonial;
    } catch (error) {
        logger.error('Error in submitTestimonial:', error);
        throw new Error(`Failed to submit testimonial: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

// ========== CONTACT FORM MANAGEMENT ==========

export async function submitContactForm(formData: any) {
    try {
        const supabaseAdmin = getSupabaseAdminClient();
        
        const { data: contact, error } = await supabaseAdmin
            .from('contacts')
            .insert({
                ...formData,
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to submit contact form: ${error.message}`);
        }

        // Send WhatsApp notification
        try {
            const whatsappMessage = `New Contact Form Submission:\n\nName: ${formData.firstName} ${formData.lastName}\nEmail: ${formData.email}\nPhone: ${formData.phone || 'Not provided'}\n\nMessage:\n${formData.message}`;
            
            // Format message for WhatsApp URL (encode for URL)
            const encodedMessage = encodeURIComponent(whatsappMessage);
            const whatsappNumber = '918810317477'; // +91 88103 17477 without +
            const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;
            
            logger.info(`WhatsApp notification available at: ${whatsappUrl}`);
        } catch (whatsappError) {
            // Log WhatsApp error but don't throw - contact form should still succeed
            logger.error('Error preparing WhatsApp notification:', whatsappError);
        }

        return contact;
    } catch (error) {
        logger.error('Error in submitContactForm:', error);
        throw new Error(`Failed to submit contact form: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

// ========== GALLERY MANAGEMENT ==========

export async function getAdminGalleryImages() {
    try {
        const supabaseAdmin = getSupabaseAdminClient();
        const authData = await getAuthenticatedUser('admin');
        
        if (!authData) {
            throw new Error('Unauthorized');
        }

        // Fetch all gallery images ordered by order_index
        const { data, error } = await supabaseAdmin
            .from('property_gallery')
            .select('*')
            .order('order_index', { ascending: true })
            .order('created_at', { ascending: false });

        if (error) throw error;

        return data || [];
    } catch (error) {
        logger.error('Error in getAdminGalleryImages:', error);
        throw new Error(`Failed to fetch gallery images: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export async function addGalleryImage(imageData: {
    project_name: string;
    title: string;
    description?: string;
    image_url: string;
    order_index?: number;
}) {
    try {
        const supabaseAdmin = getSupabaseAdminClient();
        const authData = await getAuthenticatedUser('admin');
        
        if (!authData) {
            throw new Error('Unauthorized');
        }

        // Insert new gallery image
        const { data, error } = await supabaseAdmin
            .from('property_gallery')
            .insert({
                project_name: imageData.project_name,
                title: imageData.title,
                description: imageData.description || null,
                image_url: imageData.image_url,
                order_index: imageData.order_index || 0,
                is_active: true,
                created_by: authData.user.id,
            })
            .select()
            .single();

        if (error) throw error;

        revalidatePath('/admin/gallery');
        revalidatePath('/explore');

        return data;
    } catch (error) {
        logger.error('Error in addGalleryImage:', error);
        throw new Error(`Failed to add gallery image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export async function updateGalleryImage(id: string, imageData: Partial<{
    project_name: string;
    title: string;
    description: string;
    image_url: string;
    order_index: number;
    is_active: boolean;
}>) {
    try {
        const supabaseAdmin = getSupabaseAdminClient();
        const authData = await getAuthenticatedUser('admin');
        
        if (!authData) {
            throw new Error('Unauthorized');
        }

        // Update gallery image
        const { data, error } = await supabaseAdmin
            .from('property_gallery')
            .update({
                ...imageData,
                updated_by: authData.user.id,
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        revalidatePath('/admin/gallery');
        revalidatePath('/explore');

        return data;
    } catch (error) {
        logger.error('Error in updateGalleryImage:', error);
        throw new Error(`Failed to update gallery image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export async function deleteGalleryImage(id: string) {
    try {
        const supabaseAdmin = getSupabaseAdminClient();
        const authData = await getAuthenticatedUser('admin');
        
        if (!authData) {
            throw new Error('Unauthorized');
        }

        // Delete gallery image
        const { error } = await supabaseAdmin
            .from('property_gallery')
            .delete()
            .eq('id', id);

        if (error) throw error;

        revalidatePath('/admin/gallery');
        revalidatePath('/explore');

        return { success: true };
    } catch (error) {
        logger.error('Error in deleteGalleryImage:', error);
        throw new Error(`Failed to delete gallery image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
