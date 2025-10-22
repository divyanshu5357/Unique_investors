import { createClient } from '@/lib/supabase/client';
import { validatePassword } from '@/lib/utils/password-validation';

export async function updateBrokerPassword(brokerId: string, newPassword: string) {
    // Validate password using our validation utility
    const validation = validatePassword(newPassword);
    if (!validation.isValid) {
        throw new Error(validation.errors[0]);
    }

    const supabase = createClient();
    
    const { error } = await supabase.auth.admin.updateUserById(
        brokerId,
        { password: newPassword }
    );

    if (error) {
        throw error;
    }

    return { success: true };
}