
"use client"

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

const profileSchema = z.object({
  fullName: z.string().min(1, "Full name is required."),
  email: z.string().email(),
});

const contactSchema = z.object({
    mobileNumber: z.string().min(10, "Mobile number must be at least 10 digits.").regex(/^[0-9+\-\s()]+$/, "Please enter a valid mobile number."),
    address: z.string().min(10, "Address must be at least 10 characters."),
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

    const contactForm = useForm({
        resolver: zodResolver(contactSchema),
        defaultValues: {
            mobileNumber: '',
            address: '',
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
                    .select('full_name, mobile_number, address, has_changed_name, role')
                    .eq('id', session.user.id)
                    .single();
                    
                if (profile?.has_changed_name) {
                    // Update user metadata to reflect name change status
                    await supabase.auth.updateUser({
                        data: { has_changed_name: true }
                    });
                }
                
                if (profile) {
                    setUser({
                        ...session.user,
                        role: profile.role
                    });
                    profileForm.reset({
                        fullName: profile.full_name,
                        email: session.user.email,
                    });

                    if (profile.mobile_number || profile.address) {
                        contactForm.reset({
                            mobileNumber: profile.mobile_number || '',
                            address: profile.address || '',
                        });
                    }
                }
            }
            setLoading(false);
        };
        fetchProfile();
    }, [supabase, profileForm, contactForm]);

    const onProfileSubmit = async (values: z.infer<typeof profileSchema>) => {
        if (!user) return;
        
        // First check if this is their first name change
        const { data: currentProfile } = await supabase
            .from('profiles')
            .select('has_changed_name')
            .eq('id', user.id)
            .single();

        if (currentProfile?.has_changed_name) {
            toast({ 
                title: "Error", 
                description: "You can only change your name once.", 
                variant: "destructive" 
            });
            return;
        }

        const { error } = await supabase
            .from('profiles')
            .update({ 
                full_name: values.fullName,
                has_changed_name: true 
            })
            .eq('id', user.id);

        if (error) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } else {
            // Immediately update local user metadata so UI locks the field without reload
            await supabase.auth.updateUser({ data: { has_changed_name: true } });
            setUser((prev: any) => prev ? { ...prev, user_metadata: { ...(prev.user_metadata||{}), has_changed_name: true } } : prev);
            toast({ title: "Success", description: "Profile updated successfully. You cannot change your name again." });
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
                                    <Input {...field} disabled={user?.user_metadata?.has_changed_name} />
                                </FormControl>
                                {user?.user_metadata?.has_changed_name && (
                                    <p className="text-sm text-muted-foreground">You have already changed your name once. Further changes are not allowed.</p>
                                )}
                                {!user?.user_metadata?.has_changed_name && (
                                    <p className="text-sm text-muted-foreground">You can change your name only once. Choose carefully.</p>
                                )}
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
                    <CardTitle>Contact Information</CardTitle>
                    <CardDescription>
                        Your contact details - these can only be set once.
                    </CardDescription>
                </CardHeader>
                <Form {...contactForm}>
                    <form onSubmit={contactForm.handleSubmit(async (values) => {
                        if (!user) return;
                        const { error } = await supabase
                            .from('profiles')
                            .update({
                                mobile_number: values.mobileNumber,
                                address: values.address,
                                profile_completed: true
                            })
                            .eq('id', user.id);

                        if (error) {
                            toast({ title: "Error", description: error.message, variant: "destructive" });
                        } else {
                            toast({ title: "Success", description: "Contact information saved successfully." });
                        }
                    })}>
                        <CardContent className="space-y-4">
                             <FormField
                                control={contactForm.control}
                                name="mobileNumber"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Mobile Number</FormLabel>
                                        <FormControl>
                                            <Input {...field} disabled={field.value !== ''} />
                                        </FormControl>
                                        {field.value && <p className="text-sm text-muted-foreground">Mobile number cannot be changed once set.</p>}
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={contactForm.control}
                                name="address"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Address</FormLabel>
                                        <FormControl>
                                            <Textarea {...field} disabled={field.value !== ''} rows={4} />
                                        </FormControl>
                                        {field.value && <p className="text-sm text-muted-foreground">Address cannot be changed once set.</p>}
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" disabled={contactForm.formState.isSubmitting || (!!contactForm.watch('mobileNumber') && !!contactForm.watch('address'))}>
                                {contactForm.formState.isSubmitting ? "Saving..." : "Save Contact Details"}
                            </Button>
                        </CardFooter>
                    </form>
                </Form>
            </Card>
            
            {user?.role !== 'broker' && (
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
            )}
        </div>
    );
}
