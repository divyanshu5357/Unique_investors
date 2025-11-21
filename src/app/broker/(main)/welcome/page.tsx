"use client"

import React, { useState, useEffect, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';
import { Loader2, User, Mail, Phone, MapPin, Users, Globe } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const welcomeSchema = z.object({
    mobileNumber: z.string().min(10, "Mobile number must be at least 10 digits.").regex(/^[0-9+\-\s()]+$/, "Please enter a valid mobile number."),
    address: z.string().min(10, "Address must be at least 10 characters."),
});

type WelcomeFormValues = z.infer<typeof welcomeSchema>;

interface ProfileData {
    id: string;
    name: string;
    email: string;
    mobile_number: string | null;
    address: string | null;
    profile_completed: boolean;
    sponsorid: string | null;
    uplineName?: string | null;
    created_at: string | null;
    full_name: string | null;
    joinedat: string | null;
}

export default function WelcomeLetterPage() {
    const supabase = createClient();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [loading, setLoading] = useState(true);
    const [profileData, setProfileData] = useState<ProfileData | null>(null);

    const form = useForm<WelcomeFormValues>({
        resolver: zodResolver(welcomeSchema),
        defaultValues: {
            mobileNumber: '',
            address: '',
        }
    });

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                toast({
                    title: "Error",
                    description: "Please login to continue.",
                    variant: "destructive"
                });
                return;
            }

            // Removed debug log: session user id

            // Fetch profile with upline information
            const { data: profile, error } = await supabase
                .from('profiles')
                .select(`
                    id,
                    name,
                    full_name,
                    email,
                    mobile_number,
                    address,
                    profile_completed,
                    sponsorid,
                    created_at,
                    joinedat
                `)
                .eq('id', session.user.id)
                .single();
            
            // Removed debug log: fetched profile

            if (error) {
                console.error("Error fetching profile:", error);
                toast({
                    title: "Error",
                    description: "Failed to load profile data.",
                    variant: "destructive"
                });
                return;
            }

            if (profile) {
                let uplineName = null;
                if (profile.sponsorid) {
                    const { data: uplineData } = await supabase
                        .from('profiles')
                        .select('name, full_name')
                        .eq('id', profile.sponsorid)
                        .single();
                    
                    uplineName = uplineData?.full_name || uplineData?.name || null;
                }

                const profileData: ProfileData = {
                    ...profile,
                    uplineName,
                    email: profile.email || session.user.email || '',
                };

                setProfileData(profileData);
            }

            // Pre-fill form if data exists
            if (profile.mobile_number || profile.address) {
                form.reset({
                    mobileNumber: profile.mobile_number || '',
                    address: profile.address || '',
                });
            }
        } catch (error) {
            console.error("Error:", error);
            toast({
                title: "Error",
                description: "An unexpected error occurred.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = (values: WelcomeFormValues) => {
        if (!profileData) return;

        startTransition(async () => {
            try {
                const { error } = await supabase
                    .from('profiles')
                    .update({
                        mobile_number: values.mobileNumber,
                        address: values.address,
                        profile_completed: true,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', profileData.id);

                if (error) {
                    toast({
                        title: "Error",
                        description: error.message,
                        variant: "destructive"
                    });
                } else {
                    toast({
                        title: "Success",
                        description: "Your profile has been updated successfully!",
                    });
                    // Refresh profile data
                    await fetchProfile();
                }
            } catch (error) {
                toast({
                    title: "Error",
                    description: (error as Error).message,
                    variant: "destructive"
                });
            }
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!profileData) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <p className="text-muted-foreground">Failed to load profile data.</p>
            </div>
        );
    }

    // Removed debug log: profile data snapshot

    const today = new Date().toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Welcome Letter Header */}
            <Card className="border-2 border-primary/20 shadow-lg">
                <CardHeader className="space-y-4 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary text-primary-foreground p-3 rounded-lg text-2xl font-bold">
                            U
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-primary">Unique Investor</h1>
                            <p className="text-sm text-muted-foreground italic">Where Dreams Come True</p>
                        </div>
                    </div>
                    <div className="border-t pt-4">
                        <h2 className="text-xl font-semibold mb-2">Welcome Letter</h2>
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                            📅 Date: {today}
                        </p>
                    </div>
                </CardHeader>

                <CardContent className="space-y-6">
                    <div className="bg-muted/50 p-6 rounded-lg space-y-4">
                        <p className="text-base leading-relaxed">
                            A warm welcome and lots of good wishes on becoming part of our growing team. 
                            Congratulations on being part of the team! The whole company welcomes you, and we look 
                            forward to a successful journey with you! Welcome aboard! We are all happy and excited about 
                            your inputs and contribution to our company.
                        </p>
                    </div>

                    {/* Profile Information Card */}
                    <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-primary">
                                <Users className="h-5 w-5" />
                                Sponsor Name: {profileData.uplineName || 'N/A'}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex items-center gap-3">
                                    <User className="h-5 w-5 text-muted-foreground" />
                                    <div>
                                        <p className="text-xs text-muted-foreground">Name</p>
                                        <p className="font-semibold">{profileData?.full_name || profileData?.name || 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Badge variant="outline">User ID</Badge>
                                    <div>
                                        <p className="text-xs text-muted-foreground">User ID</p>
                                        <p className="font-semibold">{profileData?.id || 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Mail className="h-5 w-5 text-muted-foreground" />
                                    <div>
                                        <p className="text-xs text-muted-foreground">User Name (Email)</p>
                                        <p className="font-semibold break-all">{profileData?.email || 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Badge className="bg-blue-100 text-blue-800 border-blue-300">Designation</Badge>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Designation</p>
                                        <p className="font-semibold">ASSOCIATE MEMBER</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Badge className="bg-gray-100 text-gray-800 border-gray-300">Joining Date</Badge>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Joining Date</p>
                                        <p className="font-semibold">{profileData.joinedat ? new Date(profileData.joinedat).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-3 border-t">
                                <p className="text-xs text-muted-foreground italic flex items-start gap-2">
                                    <span className="text-primary">ℹ️</span>
                                    This is the information you shall have to use for all your correspondence with the company.
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="bg-muted/50 p-6 rounded-lg">
                        <p className="text-base leading-relaxed mb-4">
                            Assuring you of the best services always and wishing you continued success in your journey with 
                            UNIQUE INVESTOR. We look forward to a long-term association and prosperous future, together.
                        </p>
                        <div className="text-center pt-4 border-t">
                            <p className="font-semibold text-lg">Best Regards,</p>
                            <p className="text-primary font-bold text-xl mt-1">Unique Investor</p>
                        </div>
                    </div>

                    <div className="mt-6 text-sm text-muted-foreground space-y-2 border-t pt-6">
                        <p className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            Head Office: Shop no. 2, Shree Shahmal pahalwan Complex, near Brahmma mandir, opposite Gaur City 14th Avenue, greater Noida west 201301
                        </p>
                        <p className="flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            Tel: 8810317477
                        </p>
                        <p className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            uniqueinvestor@yahoo.com
                        </p>
                        <p className="flex items-center gap-2">
                            <Globe className="h-4 w-4" />
                            www.uniqueinvestor.in
                        </p>
                        <p className="text-xs italic mt-4">
                            This is a computer-generated document and it does not require a signature. This document shall not be invalidated solely on the ground that it is not signed.
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Update Profile Form - Only if not completed */}
            {!profileData.profile_completed && (
                <Card className="border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/10">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <span className="text-yellow-600 dark:text-yellow-400">⚠️</span>
                            Complete Your Profile
                        </CardTitle>
                        <CardDescription>
                            Please update your mobile number and address. <strong>Note:</strong> You can only update these details once, so please ensure accuracy.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="mobileNumber"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Mobile Number *</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="e.g. +91 9876543210"
                                                    {...field}
                                                    disabled={!!profileData.mobile_number}
                                                />
                                            </FormControl>
                                            <FormDescription>
                                                {profileData.mobile_number 
                                                    ? "Mobile number is locked and cannot be changed."
                                                    : "Enter your mobile number (can only be set once)."
                                                }
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="address"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Address *</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    placeholder="Enter your complete address"
                                                    rows={4}
                                                    {...field}
                                                    disabled={!!profileData.address}
                                                />
                                            </FormControl>
                                            <FormDescription>
                                                {profileData.address 
                                                    ? "Address is locked and cannot be changed."
                                                    : "Enter your complete address (can only be set once)."
                                                }
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {(!profileData.mobile_number || !profileData.address) && (
                                    <div className="flex justify-end pt-4">
                                        <Button 
                                            type="submit" 
                                            disabled={isPending || (!!profileData.mobile_number && !!profileData.address)}
                                            size="lg"
                                        >
                                            {isPending ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Saving...
                                                </>
                                            ) : (
                                                "Save Profile Details"
                                            )}
                                        </Button>
                                    </div>
                                )}
                            </form>
                        </Form>
                    </CardContent>
                </Card>
            )}

            {profileData.profile_completed && (
                <Card className="border-green-500/50 bg-green-50/50 dark:bg-green-950/10">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <Badge className="bg-green-600 text-white">✓ Profile Complete</Badge>
                            <p className="text-sm text-muted-foreground">
                                Your profile details have been saved. Name and Email are fixed. Mobile and Address cannot be changed.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
