"use client"

import React, { useState } from 'react';
import { Logo } from "@/components/Logo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { ArrowLeft, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [emailSent, setEmailSent] = useState(false);
    const { toast } = useToast();

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsLoading(true);

        const supabase = createClient();
        
        // Send password reset email
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
        });

        if (error) {
            toast({
                title: "Error",
                description: error.message || "Failed to send reset email. Please try again.",
                variant: "destructive",
            });
            setIsLoading(false);
            return;
        }

        setEmailSent(true);
        toast({
            title: "Email Sent!",
            description: "Check your email for password reset instructions.",
        });
        setIsLoading(false);
    };

    if (emailSent) {
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
                            <Mail className="h-8 w-8 text-green-600" />
                        </div>
                        <CardTitle className="text-2xl font-headline">Check Your Email</CardTitle>
                        <CardDescription className="text-base">
                            We've sent password reset instructions to <strong>{email}</strong>
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
                            <p className="mb-2">📧 <strong>Next steps:</strong></p>
                            <ol className="list-decimal list-inside space-y-1 ml-2">
                                <li>Check your email inbox</li>
                                <li>Click the reset link in the email</li>
                                <li>Create a new password</li>
                                <li>Login with your new password</li>
                            </ol>
                        </div>
                        
                        <p className="text-sm text-muted-foreground text-center">
                            Didn't receive the email? Check your spam folder or{" "}
                            <button 
                                onClick={() => setEmailSent(false)}
                                className="font-semibold text-primary hover:underline"
                            >
                                try again
                            </button>
                        </p>

                        <div className="pt-4 border-t">
                            <Link href="/login">
                                <Button variant="outline" className="w-full">
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    Back to Login
                                </Button>
                            </Link>
                        </div>
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
                    <CardTitle className="text-2xl font-headline">Forgot Password?</CardTitle>
                    <CardDescription>
                        No worries! Enter your email and we'll send you reset instructions.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form className="space-y-4" onSubmit={handleSubmit}>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email Address</Label>
                            <Input 
                                id="email" 
                                type="email" 
                                placeholder="your.email@example.com" 
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={isLoading}
                            />
                        </div>
                        
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? 'Sending...' : 'Send Reset Link'}
                        </Button>

                        <div className="text-center">
                            <Link href="/login">
                                <Button variant="link" className="text-sm">
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    Back to Login
                                </Button>
                            </Link>
                        </div>
                    </form>

                    <div className="mt-6 text-xs text-center text-muted-foreground">
                        <p>
                            Don't have an account?{" "}
                            <Link 
                                href="/contact?message=I'm interested in joining your company as an associate" 
                                className="font-semibold text-primary hover:underline"
                            >
                                Contact us
                            </Link>
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
