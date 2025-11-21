
"use client"

import React, { useState } from 'react';
import { Logo } from "@/components/Logo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';
import { LenisProvider } from "@/components/providers/LenisProvider";

export default function LoginPage() {
    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsLoading(true);

        const supabase = createClient();
        
        const { data: { user }, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error || !user) {
            toast({
                title: "Login Failed",
                description: error?.message || "Invalid email or password.",
                variant: "destructive",
            });
            setIsLoading(false);
            return;
        }

        let { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        // If profile doesn't exist, show a helpful message
        if (profileError || !profile) {
            toast({
                title: "Profile Setup Required",
                description: "Please contact support to set up your profile for this account.",
                variant: "destructive",
            });
            await supabase.auth.signOut();
            setIsLoading(false);
            return;
        }

        toast({
            title: "Login Successful",
            description: "Redirecting to your dashboard...",
        });

        if (profile.role === 'admin') {
            window.location.href = '/admin/dashboard';
        } else if (profile.role === 'broker') {
            window.location.href = '/broker/dashboard';
        } else {
             // Default redirect for any other role (e.g., investor)
            window.location.href = '/';
        }
    };
    return (
        <LenisProvider>
            <div className="min-h-screen login-bg flex flex-col justify-center items-center p-4">
            {/* Animated gradient blobs */}
            <div className="blob w-[300px] h-[300px] top-[-80px] left-[-40px] opacity-30" />
            <div className="blob w-[280px] h-[280px] bottom-[-60px] right-[-20px] opacity-40" />
            <div className="absolute top-8 left-8">
                <Link href="/">
                    <Logo />
                </Link>
            </div>
            <Card className="w-full max-w-sm glass-panel relative animate-fade-up">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-headline">Login</CardTitle>
                    <CardDescription>
                        Enter your credentials to access your account.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form className="space-y-4" onSubmit={handleLogin}>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input 
                                id="email" 
                                type="email" 
                                placeholder="m@example.com" 
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password">Password</Label>
                                <Link 
                                    href="/forgot-password" 
                                    className="text-sm text-primary hover:underline"
                                >
                                    Forgot password?
                                </Link>
                            </div>
                            <div className="relative">
                                <Input 
                                    id="password" 
                                    type={showPassword ? "text" : "password"}
                                    required 
                                    className="pr-10"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <Button 
                                    type="button" 
                                    variant="ghost" 
                                    size="icon" 
                                    className="absolute inset-y-0 right-0 h-full px-3 text-muted-foreground hover:text-foreground"
                                    onClick={() => setShowPassword(!showPassword)}
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword ? <EyeOff /> : <Eye />}
                                </Button>
                            </div>
                        </div>
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? 'Logging in...' : 'Login'}
                        </Button>
                    </form>
                     <div className="text-center text-sm text-muted-foreground mt-6 space-y-2">
                        <p>
                            Need an account?{" "}
                            <Link 
                                href="/contact?message=I'm interested in joining your company as an associate and would like to learn more about the opportunity." 
                                className="font-semibold text-primary hover:underline"
                            >
                                Contact us
                            </Link>
                        </p>
                        <p>
                            Or{" "}
                            <Link href="/" className="font-semibold text-primary hover:underline">
                                Go to Home
                            </Link>
                        </p>
                    </div>
                </CardContent>
            </Card>
            </div>
        </LenisProvider>
    );
}
