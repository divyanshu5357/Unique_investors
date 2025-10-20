
"use client"

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Star } from 'lucide-react';
// Firebase imports removed - now using Supabase actions
import { submitTestimonial } from '@/lib/actions';
import { useToast } from "@/hooks/use-toast";

export default function TestimonialsPage() {
    const [name, setName] = useState('');
    const [message, setMessage] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !message || rating === 0) {
            toast({
                title: "Missing Fields",
                description: "Please fill out all fields and select a rating.",
                variant: "destructive",
            });
            return;
        }

        setIsSubmitting(true);
        try {
            await submitTestimonial({
                name,
                message,
                rating,
                imageUrl: imageUrl || null,
                date: new Date().toISOString(),
            });
            toast({
                title: "Testimonial Added!",
                description: "The new testimonial has been saved successfully.",
            });
            // Reset form
            setName('');
            setMessage('');
            setImageUrl('');
            setRating(0);
        } catch (error) {
            console.error("Error adding testimonial: ", error);
            toast({
                title: "Error",
                description: "Something went wrong. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold font-headline">Manage Testimonials</h1>
            
            <Card className="max-w-2xl">
                <CardHeader>
                    <CardTitle>Add New Testimonial</CardTitle>
                    <CardDescription>Create a new client testimonial to display on the homepage.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form className="grid gap-6" onSubmit={handleSubmit}>
                        <div className="grid gap-3">
                            <Label htmlFor="name">Client Name</Label>
                            <Input 
                                id="name" 
                                type="text" 
                                placeholder="e.g. John Doe" 
                                value={name} 
                                onChange={(e) => setName(e.target.value)} 
                                required 
                            />
                        </div>
                        <div className="grid gap-3">
                            <Label htmlFor="message">Message</Label>
                            <Textarea 
                                id="message" 
                                placeholder="The review content..." 
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                required
                            />
                        </div>
                         <div className="grid gap-3">
                            <Label htmlFor="imageUrl">Image URL (Optional)</Label>
                            <Input 
                                id="imageUrl" 
                                type="text" 
                                placeholder="https://example.com/image.png" 
                                value={imageUrl} 
                                onChange={(e) => setImageUrl(e.target.value)} 
                            />
                        </div>
                        <div className="grid gap-3">
                            <Label>Rating</Label>
                             <div className="flex items-center gap-2" onMouseLeave={() => setHoverRating(0)}>
                                {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                    key={star}
                                    className="h-6 w-6 cursor-pointer transition-colors"
                                    fill={(hoverRating >= star || rating >= star) ? 'hsl(var(--primary))' : 'none'}
                                    stroke={(hoverRating >= star || rating >= star) ? 'hsl(var(--primary))' : 'currentColor'}
                                    onMouseEnter={() => setHoverRating(star)}
                                    onClick={() => setRating(star)}
                                />
                                ))}
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? 'Saving...' : 'Save Testimonial'}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            {/* In a future step, we can add a table here to list and manage existing testimonials */}
        </div>
    );
}
