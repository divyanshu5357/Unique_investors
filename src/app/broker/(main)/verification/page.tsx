"use client"

import React, { useState, useEffect, useTransition } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Upload, CheckCircle, XCircle, Clock, AlertCircle, FileText, Eye, User, Mail, Phone, MapPin, IdCard } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImageUpload } from '@/components/ui/image-upload';
import { 
    submitBrokerVerification, 
    getBrokerVerificationStatus
} from '@/lib/actions';
import type { BrokerVerificationRecord } from '@/lib/types';
import { brokerVerificationSubmissionSchema } from '@/lib/schema';
import { createClient } from '@/lib/supabase/client';

type VerificationFormValues = z.infer<typeof brokerVerificationSubmissionSchema>;

interface ProfileData {
    id: string;
    full_name: string | null;
    email: string | null;
    mobile_number: string | null;
    address: string | null;
}

export default function BrokerVerificationPage() {
    const [verification, setVerification] = useState<BrokerVerificationRecord | null>(null);
    const [profileData, setProfileData] = useState<ProfileData | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
    const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    const form = useForm<VerificationFormValues>({
        resolver: zodResolver(brokerVerificationSubmissionSchema),
        defaultValues: {
            fullName: '',
            email: '',
            mobileNumber: '',
            address: '',
            idType: undefined,
            idNumber: '',
            idImageData: '',
            idImageType: '',
            idImageSize: 0,
        },
    });

    const fetchProfileData = async () => {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('id, full_name, email, mobile_number, address')
                .eq('id', session.user.id)
                .single();
            
            if (profile) {
                setProfileData({
                    id: profile.id,
                    full_name: profile.full_name,
                    email: session.user.email || profile.email || null, // Use session email first
                    mobile_number: profile.mobile_number,
                    address: profile.address,
                });
            }
        }
    };

    const fetchVerificationStatus = async () => {
        setLoading(true);
        try {
            await fetchProfileData();
            const verificationData = await getBrokerVerificationStatus();
            setVerification(verificationData);
        } catch (error) {
            toast({
                title: 'Error fetching verification status',
                description: (error as Error).message,
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVerificationStatus();
    }, []);

    // Auto-fill form when dialog opens
    useEffect(() => {
        if (isSubmitDialogOpen && profileData) {
            form.setValue('fullName', profileData.full_name || '');
            form.setValue('email', profileData.email || '');
            form.setValue('mobileNumber', profileData.mobile_number || '');
            form.setValue('address', profileData.address || '');
        }
    }, [isSubmitDialogOpen, profileData, form]);

    const onVerificationSubmit = (values: VerificationFormValues) => {
        startTransition(async () => {
            try {
                await submitBrokerVerification(values);
                toast({ 
                    title: 'Success!', 
                    description: 'Verification request submitted successfully.' 
                });
                setIsSubmitDialogOpen(false);
                form.reset();
                fetchVerificationStatus();
            } catch (error) {
                toast({ 
                    title: 'Failed to submit verification', 
                    description: (error as Error).message, 
                    variant: 'destructive' 
                });
            }
        });
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'pending':
                return <Clock className="h-5 w-5" />;
            case 'approved':
                return <CheckCircle className="h-5 w-5" />;
            case 'rejected':
                return <XCircle className="h-5 w-5" />;
            default:
                return <AlertCircle className="h-5 w-5" />;
        }
    };

    const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
        switch (status) {
            case 'pending':
                return 'outline';
            case 'approved':
                return 'default';
            case 'rejected':
                return 'destructive';
            default:
                return 'secondary';
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending':
                return 'text-orange-600';
            case 'approved':
                return 'text-green-600';
            case 'rejected':
                return 'text-red-600';
            default:
                return 'text-gray-600';
        }
    };

    const getIdTypeLabel = (idType: string) => {
        switch (idType) {
            case 'aadhar':
                return 'Aadhaar Card';
            case 'pan':
                return 'PAN Card';
            case 'passport':
                return 'Passport';
            case 'driving_license':
                return 'Driving License';
            default:
                return idType;
        }
    };

    const canSubmitNewVerification = !verification || verification.status === 'rejected';

    return (
        <div className="space-y-6 sm:space-y-8">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold font-headline flex items-center gap-3">
                        <Shield className="h-8 w-8 text-primary" />
                        Identity Verification
                    </h1>
                    <p className="text-muted-foreground text-sm sm:text-base">
                        Verify your identity to unlock all broker features and increase your account security.
                    </p>
                </div>
                
                {canSubmitNewVerification && (
                    <Dialog open={isSubmitDialogOpen} onOpenChange={(isOpen) => {
                        setIsSubmitDialogOpen(isOpen);
                        if (!isOpen) {
                            form.reset();
                        }
                    }}>
                        <DialogTrigger asChild>
                            <Button className="w-full sm:w-auto">
                                <Upload className="mr-2 h-4 w-4" /> 
                                Submit Verification
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[550px] mx-4 sm:mx-0 max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>Submit Identity Verification</DialogTitle>
                                <DialogDescription>
                                    Please provide your identity documents for verification. This helps us ensure the security of your account.
                                </DialogDescription>
                            </DialogHeader>

                            {/* Display User ID (Read-only) */}
                            {profileData && (
                                <div className="bg-muted/50 p-3 rounded-lg border">
                                    <div className="flex items-start gap-2 text-sm">
                                        <IdCard className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                                        <div>
                                            <span className="text-muted-foreground">User ID:</span>
                                            <p className="font-mono text-xs break-all">{profileData.id}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(onVerificationSubmit)} className="space-y-4">
                                    <FormField
                                        control={form.control}
                                        name="fullName"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Full Name (as per ID)</FormLabel>
                                                <FormControl>
                                                    <Input 
                                                        placeholder="Enter your full name"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="email"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Email Address</FormLabel>
                                                <FormControl>
                                                    <Input 
                                                        type="email"
                                                        placeholder="Enter your email"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="mobileNumber"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Mobile Number</FormLabel>
                                                <FormControl>
                                                    <Input 
                                                        type="tel"
                                                        placeholder="Enter your mobile number"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="address"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Address</FormLabel>
                                                <FormControl>
                                                    <Textarea 
                                                        placeholder="Enter your complete address"
                                                        rows={3}
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="idType"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>ID Type</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select ID type" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="aadhar">Aadhaar Card</SelectItem>
                                                        <SelectItem value="pan">PAN Card</SelectItem>
                                                        <SelectItem value="passport">Passport</SelectItem>
                                                        <SelectItem value="driving_license">Driving License</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="idNumber"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>ID Number</FormLabel>
                                                <FormControl>
                                                    <Input 
                                                        placeholder="Enter your ID number"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="idImageData"
                                        render={({ field }) => (
                                            <FormItem>
                                                <ImageUpload
                                                    label="Upload ID Document"
                                                    accept="image/*"
                                                    maxSize={5}
                                                    value={
                                                        field.value ? {
                                                            data: field.value,
                                                            type: form.watch('idImageType'),
                                                            size: form.watch('idImageSize')
                                                        } : null
                                                    }
                                                    onChange={(imageData) => {
                                                        if (imageData) {
                                                            form.setValue('idImageData', imageData.data);
                                                            form.setValue('idImageType', imageData.type);
                                                            form.setValue('idImageSize', imageData.size);
                                                        } else {
                                                            form.setValue('idImageData', '');
                                                            form.setValue('idImageType', '');
                                                            form.setValue('idImageSize', 0);
                                                        }
                                                    }}
                                                    error={form.formState.errors.idImageData?.message}
                                                    required
                                                />
                                                <FormMessage />
                                                <p className="text-sm text-muted-foreground">
                                                    Upload a clear image of your ID document. Supported formats: JPEG, PNG, GIF (max 5MB)
                                                </p>
                                            </FormItem>
                                        )}
                                    />
                                    <DialogFooter>
                                        <Button type="submit" disabled={isPending}>
                                            {isPending ? "Submitting..." : "Submit for Verification"}
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </Form>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            {/* Current Verification Status */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Verification Status
                    </CardTitle>
                    <CardDescription>Your current identity verification status and details.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center items-center h-40">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    ) : verification ? (
                        <div className="space-y-6">
                            {/* Status Overview */}
                            <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-lg border bg-muted/50">
                                <div className={`flex items-center gap-3 ${getStatusColor(verification.status)}`}>
                                    {getStatusIcon(verification.status)}
                                    <div>
                                        <p className="font-semibold text-lg capitalize">{verification.status}</p>
                                        <p className="text-sm text-muted-foreground">
                                            Submitted on {formatDate(verification.createdAt)}
                                        </p>
                                    </div>
                                </div>
                                <div className="sm:ml-auto">
                                    <Badge variant={getStatusVariant(verification.status)} className="text-sm">
                                        {verification.status === 'pending' && 'Under Review'}
                                        {verification.status === 'approved' && 'Verified'}
                                        {verification.status === 'rejected' && 'Verification Failed'}
                                    </Badge>
                                </div>
                            </div>

                            {/* Verification Details */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                                        <p className="text-base">{verification.fullName}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">ID Type</label>
                                        <p className="text-base">{getIdTypeLabel(verification.idType)}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">ID Number</label>
                                        <p className="text-base font-mono">{verification.idNumber}</p>
                                    </div>
                                </div>
                                
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Submitted Image</label>
                                        <div className="mt-2">
                                            <Button 
                                                variant="outline" 
                                                size="sm"
                                                onClick={() => setIsImageDialogOpen(true)}
                                            >
                                                <Eye className="mr-2 h-4 w-4" />
                                                View Image
                                            </Button>
                                        </div>
                                    </div>
                                    {verification.processedAt && (
                                        <div>
                                            <label className="text-sm font-medium text-muted-foreground">Processed Date</label>
                                            <p className="text-base">{formatDate(verification.processedAt)}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Rejection Reason */}
                            {verification.status === 'rejected' && verification.rejectionReason && (
                                <div className="p-4 rounded-lg border border-red-200 bg-red-50">
                                    <h4 className="font-semibold text-red-800 mb-2">Rejection Reason</h4>
                                    <p className="text-red-700">{verification.rejectionReason}</p>
                                    <p className="text-sm text-red-600 mt-2">
                                        You can submit a new verification request with the correct information.
                                    </p>
                                </div>
                            )}

                            {/* Success Message */}
                            {verification.status === 'approved' && (
                                <div className="p-4 rounded-lg border border-green-200 bg-green-50">
                                    <h4 className="font-semibold text-green-800 mb-2">Verification Successful!</h4>
                                    <p className="text-green-700">
                                        Your identity has been successfully verified. You now have access to all broker features.
                                    </p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <Shield className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-semibold mb-2">No Verification Submitted</h3>
                            <p className="text-muted-foreground mb-4">
                                Submit your identity verification to unlock all broker features and increase account security.
                            </p>
                            <Button onClick={() => setIsSubmitDialogOpen(true)}>
                                <Upload className="mr-2 h-4 w-4" />
                                Start Verification
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Image Preview Dialog */}
            {verification && (
                <Dialog open={isImageDialogOpen} onOpenChange={setIsImageDialogOpen}>
                    <DialogContent className="sm:max-w-[600px] mx-4 sm:mx-0">
                        <DialogHeader>
                            <DialogTitle>Submitted ID Image</DialogTitle>
                            <DialogDescription>
                                {getIdTypeLabel(verification.idType)} - {verification.idNumber}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="flex justify-center">
                            <img 
                                src={verification.idImageData} 
                                alt="Submitted ID" 
                                className="max-w-full max-h-96 object-contain rounded-lg border cursor-pointer hover:scale-105 transition-transform"
                                onError={(e) => {
                                    e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzljYTNhZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIG5vdCBhdmFpbGFibGU8L3RleHQ+PC9zdmc+';
                                }}
                                onClick={() => {
                                    // Open image in new tab for full zoom
                                    const newWindow = window.open();
                                    if (newWindow) {
                                        newWindow.document.write(`
                                            <html>
                                                <head><title>ID Document - ${verification.idType}</title></head>
                                                <body style="margin:0;padding:20px;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f5f5f5;">
                                                    <img src="${verification.idImageData}" style="max-width:100%;max-height:100%;object-fit:contain;border-radius:8px;box-shadow:0 4px 6px rgba(0,0,0,0.1);" />
                                                </body>
                                            </html>
                                        `);
                                    }
                                }}
                            />
                        </div>
                        <p className="text-sm text-muted-foreground text-center mt-2">
                            Click image to view in full size
                        </p>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}