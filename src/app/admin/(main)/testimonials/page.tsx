"use client"

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StarRating } from "@/components/StarRating";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImageUpload } from '@/components/ui/image-upload';
import { ImageZoomModal } from '@/components/ui/image-zoom-modal';
// Firebase imports removed - now using Supabase actions
import { getTestimonials, createTestimonial, deleteTestimonial, updateTestimonial } from '@/lib/actions';
import { Loader2, Trash2, Edit, Plus, Eye, ZoomIn } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

interface Testimonial {
    id: string;
    name: string;
    message: string;
    rating: number;
    imageData?: string; // Base64 image data
    imageType?: string; // MIME type
    imageSize?: number; // File size
    imageUrl?: string; // Legacy support
    date: {
        toDate: () => Date;
    };
}

const testimonialSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    message: z.string().min(10, 'Message must be at least 10 characters'),
    rating: z.number().min(1, 'Rating must be at least 1').max(5, 'Rating cannot exceed 5'),
    imageData: z.string().optional(),
    imageType: z.string().optional(),
    imageSize: z.number().optional(),
});

type TestimonialFormValues = z.infer<typeof testimonialSchema>;

export default function AdminTestimonialsPage() {
    const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingTestimonial, setEditingTestimonial] = useState<Testimonial | null>(null);
    const [viewingTestimonial, setViewingTestimonial] = useState<Testimonial | null>(null);
    const [imageZoomOpen, setImageZoomOpen] = useState(false);

    const form = useForm<TestimonialFormValues>({
        resolver: zodResolver(testimonialSchema),
        defaultValues: {
            name: '',
            message: '',
            rating: 5,
            imageData: '',
            imageType: '',
            imageSize: 0,
        },
    });

    // Helper function to get image source
    const getImageSrc = (testimonial: Testimonial) => {
        if (testimonial.imageData) {
            return `data:${testimonial.imageType || 'image/jpeg'};base64,${testimonial.imageData}`;
        }
        return testimonial.imageUrl || '';
    };

    // Dialog control functions
    const openAddDialog = () => {
        setEditingTestimonial(null);
        form.reset({
            name: '',
            message: '',
            rating: 5,
            imageData: '',
            imageType: '',
            imageSize: 0,
        });
        setIsDialogOpen(true);
    };

    const openEditDialog = (testimonial: Testimonial) => {
        setEditingTestimonial(testimonial);
        form.reset({
            name: testimonial.name,
            message: testimonial.message,
            rating: testimonial.rating,
            imageData: testimonial.imageData || '',
            imageType: testimonial.imageType || '',
            imageSize: testimonial.imageSize || 0,
        });
        setIsDialogOpen(true);
    };

    const openViewDialog = (testimonial: Testimonial) => {
        setViewingTestimonial(testimonial);
        setIsViewDialogOpen(true);
    };

    const closeDialog = () => {
        setIsDialogOpen(false);
        setEditingTestimonial(null);
        form.reset();
    };

    // Form submission handler
    const onSubmit = async (values: TestimonialFormValues) => {
        setIsSubmitting(true);
        try {
            if (editingTestimonial) {
                // Update existing testimonial
                await updateTestimonial(editingTestimonial.id, values);
                toast({
                    title: "Success",
                    description: "Testimonial updated successfully.",
                });
            } else {
                // Add new testimonial
                await createTestimonial(values);
                toast({
                    title: "Success",
                    description: "Testimonial added successfully.",
                });
            }
            closeDialog();
            // Refresh testimonials list
            fetchTestimonials();
        } catch (error) {
            console.error('Error saving testimonial:', error);
            toast({
                title: "Error",
                description: "Failed to save testimonial. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Fetch testimonials function
    const fetchTestimonials = async () => {
        try {
            setLoading(true);
            const testimonialsData = await getTestimonials();
            setTestimonials(testimonialsData);
        } catch (error) {
            console.error('Error fetching testimonials:', error);
            toast({
                title: "Error",
                description: "Failed to load testimonials.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    // Load testimonials
    useEffect(() => {
        fetchTestimonials();
    }, []);

    // Delete testimonial
    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this testimonial?')) {
            try {
                await deleteTestimonial(id);
                toast({
                    title: "Success",
                    description: "Testimonial deleted successfully.",
                });
                // Refresh testimonials list
                fetchTestimonials();
            } catch (error) {
                console.error('Error deleting testimonial:', error);
                toast({
                    title: "Error",
                    description: "Failed to delete testimonial.",
                    variant: "destructive",
                });
            }
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold font-headline">Client Testimonials</h1>
                    <p className="text-muted-foreground">View and manage all testimonials submitted by clients.</p>
                </div>
                
                <Button onClick={openAddDialog} className="w-full sm:w-auto">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Testimonial
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Manage Testimonials</CardTitle>
                    <CardDescription>
                        View, edit, and manage client testimonials. Click on a testimonial to view details or use the action buttons to edit or delete.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex justify-center items-center h-40">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="min-w-[200px]">Client</TableHead>
                                        <TableHead className="min-w-[300px]">Message</TableHead>
                                        <TableHead className="text-center min-w-[100px]">Rating</TableHead>
                                        <TableHead className="text-center min-w-[120px]">Date</TableHead>
                                        <TableHead className="text-right min-w-[120px]">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {testimonials.length > 0 ? (
                                        testimonials.map((testimonial) => (
                                            <TableRow key={testimonial.id} className="hover:bg-muted/50">
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <Avatar className="h-10 w-10">
                                                            <AvatarImage 
                                                                src={getImageSrc(testimonial)} 
                                                                alt={testimonial.name} 
                                                            />
                                                            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                                                                {testimonial.name.charAt(0).toUpperCase()}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <p className="font-medium">{testimonial.name}</p>
                                                            {(testimonial.imageData || testimonial.imageUrl) && (
                                                                <p className="text-xs text-muted-foreground">Has profile image</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="max-w-sm">
                                                    <p className="line-clamp-2 text-sm">{testimonial.message}</p>
                                                    {testimonial.message.length > 100 && (
                                                        <Button 
                                                            variant="link" 
                                                            size="sm" 
                                                            className="p-0 h-auto text-xs"
                                                            onClick={() => openViewDialog(testimonial)}
                                                        >
                                                            Read more...
                                                        </Button>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <StarRating rating={testimonial.rating} />
                                                </TableCell>
                                                <TableCell className="text-center text-sm">
                                                    {testimonial.date ? new Date(testimonial.date.toDate()).toLocaleDateString('en-IN', {
                                                        day: '2-digit',
                                                        month: '2-digit',
                                                        year: 'numeric'
                                                    }) : 'N/A'}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Button 
                                                            variant="ghost" 
                                                            size="sm"
                                                            onClick={() => openViewDialog(testimonial)}
                                                            title="View full testimonial"
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="sm"
                                                            onClick={() => openEditDialog(testimonial)}
                                                            title="Edit testimonial"
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="sm"
                                                            onClick={() => handleDelete(testimonial.id)}
                                                            title="Delete testimonial"
                                                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-32 text-center">
                                                <div className="flex flex-col items-center gap-2">
                                                    <p className="text-muted-foreground">No testimonials found.</p>
                                                    <Button onClick={openAddDialog} variant="outline" size="sm">
                                                        <Plus className="mr-2 h-4 w-4" />
                                                        Add First Testimonial
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Add/Edit Testimonial Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingTestimonial ? 'Edit Testimonial' : 'Add New Testimonial'}</DialogTitle>
                        <DialogDescription>
                            {editingTestimonial ? 'Update the testimonial details below.' : 'Create a new client testimonial.'}
                        </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Client Name */}
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Client Name *</FormLabel>
                                            <FormControl>
                                                <Input 
                                                    placeholder="Enter client's full name" 
                                                    {...field} 
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Rating */}
                                <FormField
                                    control={form.control}
                                    name="rating"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Rating *</FormLabel>
                                            <FormControl>
                                                <Select 
                                                    onValueChange={(value) => field.onChange(parseInt(value))}
                                                    value={field.value?.toString()}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select rating" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {[1, 2, 3, 4, 5].map((rating) => (
                                                            <SelectItem key={rating} value={rating.toString()}>
                                                                <div className="flex items-center gap-2">
                                                                    <StarRating rating={rating} />
                                                                    <span>({rating} star{rating !== 1 ? 's' : ''})</span>
                                                                </div>
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Profile Image */}
                            <FormField
                                control={form.control}
                                name="imageData"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Profile Image</FormLabel>
                                        <FormControl>
                                            <ImageUpload
                                                label="Upload Profile Image"
                                                value={field.value ? {
                                                    data: field.value,
                                                    type: form.getValues('imageType') || 'image/jpeg',
                                                    size: form.getValues('imageSize') || 0
                                                } as any : null}
                                                onChange={(imageData: any) => {
                                                    if (imageData) {
                                                        field.onChange(imageData.data);
                                                        form.setValue('imageType', imageData.type);
                                                        form.setValue('imageSize', imageData.size);
                                                    } else {
                                                        field.onChange('');
                                                        form.setValue('imageType', '');
                                                        form.setValue('imageSize', 0);
                                                    }
                                                }}
                                                accept="image/*"
                                                maxSize={5 * 1024 * 1024} // 5MB in bytes
                                                className="w-full"
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            Upload a profile image for the client (optional). Maximum size: 5MB.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Message */}
                            <FormField
                                control={form.control}
                                name="message"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Testimonial Message *</FormLabel>
                                        <FormControl>
                                            <Textarea 
                                                placeholder="Enter the client's testimonial message..."
                                                className="min-h-[120px] resize-none"
                                                {...field} 
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            The client's feedback about your services (minimum 10 characters).
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <DialogFooter className="gap-2">
                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    onClick={closeDialog}
                                    disabled={isSubmitting}
                                >
                                    Cancel
                                </Button>
                                <Button 
                                    type="submit" 
                                    disabled={isSubmitting}
                                    className="min-w-[100px]"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            {editingTestimonial ? 'Updating...' : 'Adding...'}
                                        </>
                                    ) : (
                                        editingTestimonial ? 'Update Testimonial' : 'Add Testimonial'
                                    )}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            {/* View Testimonial Dialog */}
            <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Testimonial Details</DialogTitle>
                        <DialogDescription>
                            Full testimonial information
                        </DialogDescription>
                    </DialogHeader>
                    {viewingTestimonial && (
                        <div className="space-y-6">
                            {/* Client Info */}
                            <div className="flex items-center gap-4">
                                <Avatar className="h-16 w-16">
                                    <AvatarImage 
                                        src={getImageSrc(viewingTestimonial)} 
                                        alt={viewingTestimonial.name} 
                                    />
                                    <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg">
                                        {viewingTestimonial.name.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold">{viewingTestimonial.name}</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <StarRating rating={viewingTestimonial.rating} />
                                        <span className="text-sm text-muted-foreground">
                                            ({viewingTestimonial.rating}/5 stars)
                                        </span>
                                    </div>
                                    {viewingTestimonial.date && (
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {new Date(viewingTestimonial.date.toDate()).toLocaleDateString('en-IN', {
                                                weekday: 'long',
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            })}
                                        </p>
                                    )}
                                </div>
                                {(viewingTestimonial.imageData || viewingTestimonial.imageUrl) && (
                                    <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => setImageZoomOpen(true)}
                                    >
                                        <ZoomIn className="mr-2 h-4 w-4" />
                                        View Image
                                    </Button>
                                )}
                            </div>

                            {/* Message */}
                            <div className="space-y-2">
                                <h4 className="font-medium">Testimonial Message:</h4>
                                <div className="p-4 bg-muted/50 rounded-lg">
                                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                        "{viewingTestimonial.message}"
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                            Close
                        </Button>
                        {viewingTestimonial && (
                            <Button onClick={() => {
                                setIsViewDialogOpen(false);
                                openEditDialog(viewingTestimonial);
                            }}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Testimonial
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Image Zoom Modal */}
            {viewingTestimonial && (viewingTestimonial.imageData || viewingTestimonial.imageUrl) && (
                <ImageZoomModal
                    imageData={getImageSrc(viewingTestimonial)}
                    title={`${viewingTestimonial.name}'s Profile Image`}
                    isOpen={imageZoomOpen}
                    onClose={() => setImageZoomOpen(false)}
                />
            )}
        </div>
    );
}