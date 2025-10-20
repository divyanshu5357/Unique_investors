
"use client"

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

const profileSchema = z.object({
  fullName: z.string().min(1, "Full name is required."),
  email: z.string().email(),
});

const passwordSchema = z.object({
    password: z.string().min(6, "Password must be at least 6 characters."),
});

export function ProfileForm() {
    const supabase = createClient();
    const { toast } = useToast();
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const profileForm = useForm({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            fullName: '',
            email: '',
        }
    });

    const passwordForm = useForm({
        resolver: zodResolver(passwordSchema),
        defaultValues: {
            password: '',
        }
    });

    useEffect(() => {
        const fetchProfile = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                setUser(session.user);
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('full_name')
                    .eq('id', session.user.id)
                    .single();
                
                if (profile) {
                    profileForm.reset({
                        fullName: profile.full_name,
                        email: session.user.email,
                    });
                }
            }
            setLoading(false);
        };
        fetchProfile();
    }, [supabase, profileForm]);

    const onProfileSubmit = async (values: z.infer<typeof profileSchema>) => {
        if (!user) return;
        const { error } = await supabase
            .from('profiles')
            .update({ full_name: values.fullName })
            .eq('id', user.id);

        if (error) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } else {
            toast({ title: "Success", description: "Profile updated successfully." });
        }
    };
    
    const onPasswordSubmit = async (values: z.infer<typeof passwordSchema>) => {
        const { error } = await supabase.auth.updateUser({ password: values.password });

        if (error) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } else {
            toast({ title: "Success", description: "Password updated. You will be logged out." });
            setTimeout(async () => {
                await supabase.auth.signOut();
                router.push('/login');
            }, 2000);
        }
    };

    if (loading) {
        return <div>Loading profile...</div>
    }

    return (
        <div className="grid gap-6">
            <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                     <FormField
                        control={profileForm.control}
                        name="fullName"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Full Name</FormLabel>
                                <FormControl>
                                    <Input {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={profileForm.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                    <Input {...field} disabled />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <div className="flex justify-end">
                        <Button type="submit" disabled={profileForm.formState.isSubmitting}>
                            {profileForm.formState.isSubmitting ? "Saving..." : "Save Changes"}
                        </Button>
                    </div>
                </form>
            </Form>
            
            <Card>
                <CardHeader>
                    <CardTitle>Password</CardTitle>
                    <CardDescription>
                        Change your password here. After saving, you'll be logged out.
                    </CardDescription>
                </CardHeader>
                <Form {...passwordForm}>
                    <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}>
                        <CardContent>
                             <FormField
                                control={passwordForm.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>New Password</FormLabel>
                                        <FormControl>
                                            <Input type="password" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" disabled={passwordForm.formState.isSubmitting}>
                                {passwordForm.formState.isSubmitting ? "Saving..." : "Save Password"}
                            </Button>
                        </CardFooter>
                    </form>
                </Form>
            </Card>
        </div>
    );
}
