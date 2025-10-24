import { getSupabaseAdminClient } from "@/lib/serverUtils";
import { validatePassword } from "@/lib/utils/password-validation";

export async function updateUserPassword(userId: string, newPassword: string) {
    const validation = validatePassword(newPassword);
    if (!validation.isValid) {
        throw new Error(validation.errors[0]);
    }

    const supabaseAdmin = await getSupabaseAdminClient();
    const { error } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { password: newPassword }
    );

    if (error) {
        throw error;
    }

    return { success: true };
}