"use client"

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';
import { Loader2, User, Mail, Phone, MapPin, Users, Globe } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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
    const [loading, setLoading] = useState(true);
    const [profileData, setProfileData] = useState<ProfileData | null>(null);

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

            {profileData.profile_completed ? (
                <Card className="border-green-500/50 bg-green-50/50 dark:bg-green-950/10">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <Badge className="bg-green-600 text-white">✓ Profile Complete</Badge>
                            <p className="text-sm text-muted-foreground">
                                Your profile details have been saved. Visit the Account page to check or update your profile.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <Card className="border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/10">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <Badge className="bg-yellow-600 text-white">⚠️ Profile Incomplete</Badge>
                            <p className="text-sm text-muted-foreground">
                                Please complete your profile on the Account page to access all features.
                            </p>
                        </div>
                        <div className="mt-4">
                            <Button asChild>
                                <a href="/broker/account">Complete Profile</a>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}