"use client"

import React, { useState, useEffect } from 'react';
import { Logo } from "@/components/Logo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function ResetPasswordPage() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [resetSuccess, setResetSuccess] = useState(false);
    const [validToken, setValidToken] = useState(false);
    const { toast } = useToast();
    const router = useRouter();

    useEffect(() => {
        // Check if user came from a valid reset link
        const checkSession = async () => {
            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();
            
            if (session) {
                setValidToken(true);
            } else {
                toast({
                    title: "Invalid or Expired Link",
                    description: "Please request a new password reset link.",
                    variant: "destructive",
                });
                setTimeout(() => {
                    router.push('/forgot-password');
                }, 2000);
            }
        };
        
        checkSession();
    }, [router, toast]);

    const validatePassword = (pwd: string): string | null => {
        if (pwd.length < 8) {
            return "Password must be at least 8 characters long";
        }
        if (!/[A-Z]/.test(pwd)) {
            return "Password must contain at least one uppercase letter";
        }
        if (!/[a-z]/.test(pwd)) {
            return "Password must contain at least one lowercase letter";
        }
        if (!/[0-9]/.test(pwd)) {
            return "Password must contain at least one number";
        }
        return null;
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsLoading(true);

        // Validate passwords match
        if (password !== confirmPassword) {
            toast({
                title: "Passwords Don't Match",
                description: "Please make sure both passwords are identical.",
                variant: "destructive",
            });
            setIsLoading(false);
            return;
        }

        // Validate password strength
        const passwordError = validatePassword(password);
        if (passwordError) {
            toast({
                title: "Weak Password",
                description: passwordError,
                variant: "destructive",
            });
            setIsLoading(false);
            return;
        }

        const supabase = createClient();
        
        // Update the user's password
        const { error } = await supabase.auth.updateUser({
            password: password,
        });

        if (error) {
            toast({
                title: "Error",
                description: error.message || "Failed to update password. Please try again.",
                variant: "destructive",
            });
            setIsLoading(false);
            return;
        }

        setResetSuccess(true);
        toast({
            title: "Password Updated!",
            description: "Your password has been successfully changed.",
        });

        // Redirect to login after 3 seconds
        setTimeout(() => {
            router.push('/login');
        }, 3000);
        
        setIsLoading(false);
    };

    if (!validToken) {
        return (
            <div className="min-h-screen bg-muted flex flex-col justify-center items-center p-4">
                <Card className="w-full max-w-md">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                        <p className="text-center mt-4 text-muted-foreground">Verifying reset link...</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (resetSuccess) {
        return (
            <div className="min-h-screen bg-muted flex flex-col justify-center items-center p-4">
                <div className="absolute top-8 left-8">
                    <Link href="/">
                        <Logo />
                    </Link>
                </div>
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                            <CheckCircle2 className="h-8 w-8 text-green-600" />
                        </div>
                        <CardTitle className="text-2xl font-headline">Password Reset Successful!</CardTitle>
                        <CardDescription className="text-base">
                            Your password has been updated successfully.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="rounded-lg bg-muted p-4 text-sm text-center">
                            <p className="text-muted-foreground">
                                Redirecting to login page in a few seconds...
                            </p>
                        </div>
                        
                        <Link href="/login">
                            <Button className="w-full">
                                Go to Login Now
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-muted flex flex-col justify-center items-center p-4">
            <div className="absolute top-8 left-8">
                <Link href="/">
                    <Logo />
                </Link>
            </div>
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-headline">Reset Your Password</CardTitle>
                    <CardDescription>
                        Enter your new password below
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form className="space-y-4" onSubmit={handleSubmit}>
                        <div className="space-y-2">
                            <Label htmlFor="password">New Password</Label>
                            <div className="relative">
                                <Input 
                                    id="password" 
                                    type={showPassword ? "text" : "password"}
                                    required 
                                    className="pr-10"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={isLoading}
                                    placeholder="Enter new password"
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

                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirm New Password</Label>
                            <div className="relative">
                                <Input 
                                    id="confirmPassword" 
                                    type={showConfirmPassword ? "text" : "password"}
                                    required 
                                    className="pr-10"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    disabled={isLoading}
                                    placeholder="Confirm new password"
                                />
                                <Button 
                                    type="button" 
                                    variant="ghost" 
                                    size="icon" 
                                    className="absolute inset-y-0 right-0 h-full px-3 text-muted-foreground hover:text-foreground"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showConfirmPassword ? <EyeOff /> : <Eye />}
                                </Button>
                            </div>
                        </div>

                        <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
                            <p className="font-semibold mb-1">Password Requirements:</p>
                            <ul className="list-disc list-inside space-y-0.5">
                                <li>At least 8 characters long</li>
                                <li>One uppercase letter</li>
                                <li>One lowercase letter</li>
                                <li>One number</li>
                            </ul>
                        </div>
                        
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? 'Updating Password...' : 'Update Password'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
