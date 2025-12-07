'use server';

import z from 'zod';
import { revalidatePath } from 'next/cache';
import { getAuthenticatedUser, authorizeAdmin, getSupabaseAdminClient } from '@/lib/serverUtils';
import { logger } from '@/lib/utils/logger';
import {
  brokerVerificationSubmissionSchema,
  processVerificationSchema,
  brokerReferralSubmissionSchema,
  processReferralSchema,
} from '@/lib/schema';
import type { BrokerVerificationRecord, BrokerReferralRecord } from '@/lib/types';

// ========== BROKER VERIFICATION ACTIONS ==========

export async function submitBrokerVerification(values: z.infer<typeof brokerVerificationSubmissionSchema>) {
    const { user } = await getAuthenticatedUser('broker');
    const supabaseAdmin = getSupabaseAdminClient();
    
    // Check if broker already has a pending or approved verification
    const { data: existingVerification, error: checkError } = await supabaseAdmin
        .from('broker_verifications')
        .select('id')
        .eq('broker_id', user.id)
        .in('status', ['pending', 'approved'])
        .single();
    
    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
        throw new Error(`Error checking existing verification: ${checkError.message}`);
    }

    if (existingVerification) {
        throw new Error("You already have a pending or approved verification request.");
    }

    // Get broker profile info
    const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('full_name, email')
        .eq('id', user.id)
        .single();

    if (!profile) {
        throw new Error("Broker profile not found");
    }

    // Update broker profile with verification details
    const updateData = {
        full_name: values.fullName,
        email: values.email,
        mobile_number: values.mobileNumber,
        address: values.address,
        profile_completed: true,
    };
    
    logger.dev('Attempting to update profile with:', updateData);
    
    const { data: updatedProfile, error: updateError } = await supabaseAdmin
        .from('profiles')
        .update(updateData)
        .eq('id', user.id)
        .select();

    if (updateError) {
        logger.error('Error updating profile:', updateError);
        throw new Error(`Failed to update profile: ${updateError.message}`);
    }
    
    logger.dev('Profile updated successfully:', updatedProfile);
    
    const { error: insertError } = await supabaseAdmin
        .from('broker_verifications')
        .insert({
            broker_id: user.id,
            broker_name: values.fullName,
            broker_email: values.email,
            full_name: values.fullName,
            id_type: values.idType,
            id_number: values.idNumber,
            id_image_data: values.idImageData,
            id_image_type: values.idImageType,
            id_image_size: values.idImageSize,
            status: 'pending',
        });

    if (insertError) {
        throw new Error(`Failed to submit verification: ${insertError.message}`);
    }

    revalidatePath('/broker/verification');
    revalidatePath('/broker/dashboard');
    revalidatePath('/broker/account');
    revalidatePath('/admin/verifications');
}

export async function getBrokerVerificationStatus(brokerId?: string): Promise<BrokerVerificationRecord | null> {
    let user;
    try {
        const result = await getAuthenticatedUser('broker');
        user = result.user;
    } catch {
        const result = await getAuthenticatedUser('admin');
        user = result.user;
    }
    
    const targetBrokerId = brokerId || user.id;
    
    // If not admin and trying to access another broker's data, deny
    const supabaseAdmin = getSupabaseAdminClient();
    const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
        
    if (profile?.role !== 'admin' && targetBrokerId !== user.id) {
        throw new Error("Unauthorized to access this data");
    }

    const { data: verifications, error } = await supabaseAdmin
        .from('broker_verifications')
        .select('*')
        .eq('broker_id', targetBrokerId)
        .order('created_at', { ascending: false })
        .limit(1);

    if (error) {
        throw new Error(`Failed to get verification status: ${error.message}`);
    }

    if (!verifications || verifications.length === 0) return null;
    
    const verification = verifications[0];
    
    return {
        id: verification.id,
        brokerId: verification.broker_id,
        brokerName: verification.broker_name,
        brokerEmail: verification.broker_email,
        fullName: verification.full_name,
        idType: verification.id_type,
        idNumber: verification.id_number,
        idImageData: verification.id_image_data || '', 
        idImageType: verification.id_image_type || 'image/jpeg',
        idImageSize: verification.id_image_size || 0,
        status: verification.status,
        rejectionReason: verification.rejection_reason || null,
        createdAt: verification.created_at,
        processedAt: verification.processed_at,
        processedBy: verification.processed_by || null,
    };
}

export async function getAllBrokerVerifications(): Promise<BrokerVerificationRecord[]> {
    await authorizeAdmin();
    const supabaseAdmin = getSupabaseAdminClient();
    
    const { data: verifications, error } = await supabaseAdmin
        .from('broker_verifications')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        throw new Error(`Failed to get verifications: ${error.message}`);
    }

    return verifications.map((verification: any) => ({
        id: verification.id,
        brokerId: verification.broker_id,
        brokerName: verification.broker_name,
        brokerEmail: verification.broker_email,
        fullName: verification.full_name,
        idType: verification.id_type,
        idNumber: verification.id_number,
        idImageData: verification.id_image_data || '', 
        idImageType: verification.id_image_type || 'image/jpeg',
        idImageSize: verification.id_image_size || 0,
        status: verification.status,
        rejectionReason: verification.rejection_reason || null,
        createdAt: verification.created_at,
        processedAt: verification.processed_at,
        processedBy: verification.processed_by || null,
    }));
}

export async function processVerificationRequest(values: z.infer<typeof processVerificationSchema>) {
    const { user } = await getAuthenticatedUser('admin');
    const supabaseAdmin = getSupabaseAdminClient();
    const { verificationId, action, rejectionReason } = values;

    // Check if verification exists and is pending
    const { data: verification, error: fetchError } = await supabaseAdmin
        .from('broker_verifications')
        .select('*')
        .eq('id', verificationId)
        .single();
    
    if (fetchError) {
        throw new Error(`Verification request not found: ${fetchError.message}`);
    }

    if (verification.status !== 'pending') {
        throw new Error("This verification request has already been processed");
    }

    const updateData: any = {
        status: action === 'approve' ? 'approved' : 'rejected',
        processed_at: new Date().toISOString(),
    };

    if (action === 'reject') {
        if (!rejectionReason) {
            throw new Error("Rejection reason is required");
        }
        updateData.rejection_reason = rejectionReason;
    }

    const { error: updateError } = await supabaseAdmin
        .from('broker_verifications')
        .update(updateData)
        .eq('id', verificationId);

    if (updateError) {
        throw new Error(`Failed to update verification: ${updateError.message}`);
    }

    revalidatePath('/admin/verifications');
    revalidatePath('/broker/verification');
    revalidatePath('/broker/dashboard');
}

// ========== BROKER REFERRAL ACTIONS ==========

export async function submitBrokerReferral(formData: {
    referredName: string;
    referredEmail: string;
    referredPhone: string;
    note?: string;
}) {
    const user = await getAuthenticatedUser();
    
    // Validate form data
    const validatedData = brokerReferralSubmissionSchema.parse(formData);
    
    try {
        // Check if email is already registered
        const supabaseAdmin = getSupabaseAdminClient();
        const { data: existingUser } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('email', validatedData.referredEmail)
            .single();
            
        if (existingUser) {
            throw new Error('This email is already registered in the system');
        }
        
        // Check if there's already a pending referral for this email
        const { data: existingReferral, error: referralCheckError } = await supabaseAdmin
            .from('broker_referrals')
            .select('id')
            .eq('referred_email', validatedData.referredEmail)
            .eq('status', 'pending')
            .single();
            
        if (referralCheckError && referralCheckError.code !== 'PGRST116') {
            throw new Error(`Error checking existing referral: ${referralCheckError.message}`);
        }
            
        if (existingReferral) {
            throw new Error('A pending referral for this email already exists');
        }
        
        // Get referrer details
        const { data: referrerProfile } = await supabaseAdmin
            .from('profiles')
            .select('full_name, email')
            .eq('id', user.user.id)
            .single();
            
        if (!referrerProfile) {
            throw new Error('Referrer profile not found');
        }
        
        // Create referral record
        const { error: insertError } = await supabaseAdmin
            .from('broker_referrals')
            .insert({
                referrer_id: user.user.id,
                referrer_name: referrerProfile.full_name || 'Unknown',
                referrer_email: referrerProfile.email || '',
                referred_name: validatedData.referredName,
                referred_email: validatedData.referredEmail,
                referred_phone: validatedData.referredPhone,
                note: validatedData.note || null,
                status: 'pending',
            });

        if (insertError) {
            throw new Error(`Failed to create referral: ${insertError.message}`);
        }
        
        revalidatePath('/broker/referral');
        
        return { 
            success: true, 
            message: 'Referral submitted successfully! Admin will review and approve.' 
        };
        
    } catch (error) {
        logger.error('Error submitting referral:', error);
        if (error instanceof z.ZodError) {
            throw new Error(`Validation error: ${error.errors.map(e => e.message).join(', ')}`);
        }
        throw new Error(error instanceof Error ? error.message : 'Failed to submit referral');
    }
}

export async function getBrokerReferrals(brokerId?: string) {
    const user = await getAuthenticatedUser();
    const supabaseAdmin = getSupabaseAdminClient();
    
    try {
        let query = supabaseAdmin.from('broker_referrals').select('*');
        
        if (brokerId) {
            query = query.eq('referrer_id', brokerId);
        }
        
        const { data: referrals, error } = await query
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) {
            throw new Error(`Failed to fetch referrals: ${error.message}`);
        }

        // Map database fields to frontend expected format
        const mappedReferrals = (referrals || []).map((referral: any) => ({
            id: referral.id,
            referrerId: referral.referrer_id || '',
            referrerName: referral.referrer_name || '',
            referrerEmail: referral.referrer_email || '',
            referredName: referral.referred_name || '',
            referredEmail: referral.referred_email || '',
            referredPhone: referral.referred_phone || '',
            note: referral.note || null,
            status: referral.status || 'pending',
            createdAt: referral.created_at || '',
            processedAt: referral.processed_at || null,
            processedBy: referral.processed_by || null,
            rejectionReason: referral.rejection_reason || null,
            newBrokerId: referral.new_broker_id || null,
        })) as BrokerReferralRecord[];

        return mappedReferrals;
        
    } catch (error) {
        logger.error('Error fetching referrals:', error);
        // Return empty array instead of throwing error to prevent UI crashes
        return [];
    }
}

export async function processReferralRequest(formData: {
    referralId: string;
    action: 'approve' | 'reject';
    rejectionReason?: string;
    username?: string;
    password?: string;
    role?: 'broker';
    referredName?: string;
    referredEmail?: string;
    referredPhone?: string;
    referrerId?: string;
    referrerName?: string;
}) {
    await authorizeAdmin();
    
    const validatedData = processReferralSchema.parse(formData);
    
    try {
        const supabaseAdmin = getSupabaseAdminClient();
        
        const { data: referralData, error: fetchError } = await supabaseAdmin
            .from('broker_referrals')
            .select('*')
            .eq('id', validatedData.referralId)
            .single();
        
        if (fetchError) {
            throw new Error(`Referral not found: ${fetchError.message}`);
        }
        
        if (referralData.status !== 'pending') {
            throw new Error('Referral has already been processed');
        }
        
        if (validatedData.action === 'approve') {
            if (!validatedData.username || !validatedData.password) {
                throw new Error('Username and password are required for approval');
            }
            
            // Validate required fields from referral data
            if (!referralData.referred_name || !referralData.referred_email) {
                throw new Error('Referral data is incomplete - missing name or email');
            }
            
            // Create auth user
            const { data: newUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
                email: referralData.referred_email,
                password: validatedData.password,
                email_confirm: true,
                user_metadata: {
                    full_name: referralData.referred_name,
                    role: 'broker',
                    phone: referralData.referred_phone || '',
                }
            });
            
            if (authError || !newUser) {
                throw new Error(`Failed to create user account: ${authError?.message}`);
            }
            
            // Create profile
            const { error: profileError } = await supabaseAdmin
                .from('profiles')
                .insert({
                    id: newUser.user.id,
                    name: referralData.referred_name, // for legacy/NOT NULL constraint
                    full_name: referralData.referred_name,
                    email: referralData.referred_email,
                    role: 'broker',
                    phone: referralData.referred_phone || '',
                    sponsorid: referralData.referrer_id, // Set the referrer as sponsor
                });
                
            if (profileError) {
                // Cleanup: delete the auth user if profile creation fails
                await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
                throw new Error(`Failed to create user profile: ${profileError.message}`);
            }
            
            // Create wallet for new broker
            const { error: walletError } = await supabaseAdmin
                .from('wallets')
                .insert({
                    owner_id: newUser.user.id,
                    direct_sale_balance: 0,
                    downline_sale_balance: 0,
                    total_balance: 0,
                });
                
            if (walletError) {
                // Cleanup: delete the auth user and profile if wallet creation fails
                await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
                throw new Error(`Failed to create wallet: ${walletError.message}`);
            }
            
            // Update referral with approval details
            const { error: updateError } = await supabaseAdmin
                .from('broker_referrals')
                .update({
                    status: 'approved',
                    processed_at: new Date().toISOString(),
                    username: validatedData.username,
                    password: validatedData.password,
                })
                .eq('id', validatedData.referralId);

            if (updateError) {
                throw new Error(`Failed to update referral: ${updateError.message}`);
            }
            
            revalidatePath('/admin/referrals');
            return { 
                success: true, 
                message: `Referral approved! New broker account created for ${referralData.referred_name}` 
            };
            
        } else {
            // Reject referral
            const { error: rejectError } = await supabaseAdmin
                .from('broker_referrals')
                .update({
                    status: 'rejected',
                    processed_at: new Date().toISOString(),
                    rejection_reason: validatedData.rejectionReason || 'No reason provided',
                })
                .eq('id', validatedData.referralId);

            if (rejectError) {
                throw new Error(`Failed to reject referral: ${rejectError.message}`);
            }
            
            revalidatePath('/admin/referrals');
            return { 
                success: true, 
                message: 'Referral rejected successfully' 
            };
        }
        
    } catch (error) {
        logger.error('Error processing referral:', error);
        if (error instanceof z.ZodError) {
            throw new Error(`Validation error: ${error.errors.map(e => e.message).join(', ')}`);
        }
        throw new Error(error instanceof Error ? error.message : 'Failed to process referral');
    }
}
