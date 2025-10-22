import { createClient } from "@/lib/supabase/client";
import { validatePassword } from "@/lib/utils/password-validation";

export async function updateUserPassword(userId: string, newPassword: string) {
    const validation = validatePassword(newPassword);
    if (!validation.isValid) {
        throw new Error(validation.errors[0]);
    }

    const supabase = createClient();
    const { error } = await supabase.auth.admin.updateUserById(
        userId,
        { password: newPassword }
    );

    if (error) {
        throw error;
    }

    return { success: true };
}