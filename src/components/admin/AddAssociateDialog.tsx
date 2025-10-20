"use client"

import React, { useState, useTransition, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { createBroker } from '@/lib/actions';
import type { Broker } from '@/lib/types';

const addAssociateSchema = z.object({
    fullName: z.string().min(1, 'Full name is required.'),
    email: z.string().email('Invalid email address.'),
    password: z.string().min(6, 'Password must be at least 6 characters.'),
    uplineId: z.string().optional().nullable(),
});

type AddAssociateValues = z.infer<typeof addAssociateSchema>;

interface AddAssociateDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    brokers: Broker[]; // List of existing brokers for upline dropdown
}

export function AddAssociateDialog({ isOpen, onClose, onSuccess, brokers }: AddAssociateDialogProps) {
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    const form = useForm<AddAssociateValues>({
        resolver: zodResolver(addAssociateSchema),
        defaultValues: {
            fullName: '',
            email: '',
            password: '',
            uplineId: null,
        },
    });

    useEffect(() => {
        if (!isOpen) {
            form.reset();
        }
    }, [isOpen, form]);

    const handleSubmit = (values: AddAssociateValues) => {
        startTransition(async () => {
            try {
                await createBroker(values);
                toast({
                    title: 'Success',
                    description: `Associate ${values.fullName} has been added successfully.`,
                });
                form.reset();
                onSuccess();
                onClose();
            } catch (error) {
                toast({
                    title: 'Error',
                    description: (error as Error).message,
                    variant: 'destructive',
                });
            }
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Add New Associate</DialogTitle>
                    <DialogDescription>
                        Create a new associate/broker account. You can optionally set an upline for commission tracking.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 pt-4">
                        <FormField
                            control={form.control}
                            name="fullName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Full Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g. John Doe" {...field} />
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
                                    <FormLabel>Email</FormLabel>
                                    <FormControl>
                                        <Input type="email" placeholder="e.g. john@example.com" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Password</FormLabel>
                                    <FormControl>
                                        <Input type="password" placeholder="Minimum 6 characters" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="uplineId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Upline (Optional)</FormLabel>
                                    <Select
                                        onValueChange={(value) => field.onChange(value === 'none' ? null : value)}
                                        value={field.value || 'none'}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select upline broker" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="none">No Upline</SelectItem>
                                            {brokers.map((broker) => (
                                                <SelectItem key={broker.id} value={broker.id}>
                                                    {broker.full_name} ({broker.email})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>
                                        Select an upline broker for commission tracking. Leave as "No Upline" if this is a top-level associate.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isPending}>
                                {isPending ? 'Creating...' : 'Create Associate'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
