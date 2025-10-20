

"use client"

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Plot, PlotFormValidationSchema } from '@/lib/schema';
import { getBrokersClient } from '@/lib/clientActions';

export type PlotFormValues = z.infer<typeof PlotFormValidationSchema>;

interface PlotFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (values: PlotFormValues) => void;
    initialData?: Plot | null;
    isSubmitting: boolean;
}

interface Broker {
    id: string;
    full_name: string | null;
}

export function PlotForm({ isOpen, onClose, onSubmit, initialData, isSubmitting }: PlotFormProps) {
    const [brokers, setBrokers] = useState<Broker[]>([]);
    const [loadingBrokers, setLoadingBrokers] = useState(false);

    const form = useForm<PlotFormValues>({
        resolver: zodResolver(PlotFormValidationSchema),
        defaultValues: {
            projectName: '',
            type: '',
            block: '',
            plotNumber: '' as any,
            dimension: '',
            area: '' as any,
            status: 'available',
            buyerName: '',
            salePrice: '' as any,
            commissionRate: '' as any,
            brokerName: '',
            brokerId: '',
            sellerName: '',
            soldAmount: '' as any,
            // Booked plot fields
            totalPlotAmount: '' as any,
            bookingAmount: '' as any,
            tenureMonths: '' as any,
            remainingAmount: '' as any,
            paidPercentage: '' as any,
            commissionStatus: 'pending',
        },
    });

    const status = form.watch('status');
    
    // Check if we should show admin fields (either current status is sold or initial data was sold)
    const shouldShowAdminFields = status === 'sold' || (initialData && initialData.status === 'sold');

    // Load brokers when component mounts or when dialog opens
    useEffect(() => {
        if (isOpen) {
            setLoadingBrokers(true);
            getBrokersClient()
                .then(setBrokers)
                .catch(console.error)
                .finally(() => setLoadingBrokers(false));
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                form.reset({
                    ...initialData,
                    salePrice: initialData.salePrice || ('' as any),
                    commissionRate: initialData.commissionRate || ('' as any),
                    soldAmount: initialData.soldAmount || ('' as any),
                    brokerName: initialData.brokerName || '',
                    brokerId: initialData.brokerId || '',
                    sellerName: initialData.sellerName || '',
                    totalPlotAmount: initialData.totalPlotAmount || ('' as any),
                    bookingAmount: initialData.bookingAmount || ('' as any),
                    tenureMonths: initialData.tenureMonths || ('' as any),
                    remainingAmount: initialData.remainingAmount || ('' as any),
                    paidPercentage: initialData.paidPercentage || ('' as any),
                    commissionStatus: initialData.commissionStatus || 'pending',
                });
            } else {
                form.reset({
                    projectName: '',
                    type: '',
                    block: '',
                    plotNumber: '' as any,
                    dimension: '',
                    area: '' as any,
                    status: 'available',
                    buyerName: '',
                    salePrice: '' as any,
                    commissionRate: '' as any,
                    brokerName: '',
                    brokerId: '',
                    sellerName: '',
                    soldAmount: '' as any,
                    totalPlotAmount: '' as any,
                    bookingAmount: '' as any,
                    tenureMonths: '' as any,
                    remainingAmount: '' as any,
                    paidPercentage: '' as any,
                    commissionStatus: 'pending',
                });
            }
        }
    }, [initialData, isOpen]); // Removed 'form' from dependencies to prevent infinite loop

    const handleFormSubmit = form.handleSubmit(
        (data) => {
            console.log('📝 Form submitted successfully with data:', data);
            console.log('📝 Booked plot fields:', {
                status: data.status,
                totalPlotAmount: data.totalPlotAmount,
                bookingAmount: data.bookingAmount,
                tenureMonths: data.tenureMonths,
                brokerId: data.brokerId,
                buyerName: data.buyerName,
            });
            onSubmit(data);
        },
        (errors) => {
            console.error('❌ Form validation errors:', errors);
        }
    );

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[525px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{initialData ? 'Edit Plot' : 'Add New Plot'}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={handleFormSubmit} className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="projectName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Project Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g. Green Valley" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="type"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Type</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g. Residential" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                         <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="block"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Block</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g. A" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="plotNumber"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Plot Number</FormLabel>
                                        <FormControl>
                                            <Input type="number" placeholder="e.g. 101" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                         <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="dimension"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Dimension</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g. 30x40 ft" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="area"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Area (in gaj)</FormLabel>
                                        <FormControl>
                                            <Input type="number" placeholder="e.g. 1200" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        
                         <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="status"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Status</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select status" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="available">Available</SelectItem>
                                                <SelectItem value="booked">Booked</SelectItem>
                                                <SelectItem value="sold">Sold</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="buyerName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Buyer Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g. John Doe" {...field} value={field.value ?? ''} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Booked Plot Fields - Show only when status is 'booked' */}
                        {status === 'booked' && (
                            <div className="border-t pt-4">
                                <h4 className="text-sm font-medium mb-3 text-primary">Booking Details</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="totalPlotAmount"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Total Plot Amount *</FormLabel>
                                                <FormControl>
                                                    <Input type="number" placeholder="e.g. 1000000" {...field} value={field.value ?? ''} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="bookingAmount"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Booking Amount *</FormLabel>
                                                <FormControl>
                                                    <Input type="number" placeholder="e.g. 100000" {...field} value={field.value ?? ''} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4 mt-4">
                                    <FormField
                                        control={form.control}
                                        name="tenureMonths"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Tenure (Months) *</FormLabel>
                                                <FormControl>
                                                    <Input type="number" placeholder="e.g. 12" {...field} value={field.value ?? ''} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="brokerId"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Associate/Broker *</FormLabel>
                                                <Select 
                                                    onValueChange={(value) => {
                                                        field.onChange(value);
                                                        const selectedBroker = brokers.find(b => b.id === value);
                                                        if (selectedBroker) {
                                                            form.setValue('brokerName', selectedBroker.full_name || '');
                                                        }
                                                    }} 
                                                    value={field.value || ''}
                                                    disabled={loadingBrokers}
                                                >
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder={loadingBrokers ? "Loading..." : "Select broker"} />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {brokers.map(broker => (
                                                            <SelectItem key={broker.id} value={broker.id}>
                                                                {broker.full_name || 'Unknown'}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>
                        )}

                        {shouldShowAdminFields && (
                            <>
                                <div className="border-t pt-4">
                                    <h4 className="text-sm font-medium mb-3 text-muted-foreground">Sale Information</h4>
                                    <div className="grid grid-cols-1 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="salePrice"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Sale/Sold Amount</FormLabel>
                                                    <FormControl>
                                                        <Input type="number" placeholder="e.g. 500000" {...field} value={field.value ?? ''} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>

                                <div className="border-t pt-4">
                                    <h4 className="text-sm font-medium mb-3 text-muted-foreground">Commission & Broker Details</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="commissionRate"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Commission Rate (%)</FormLabel>
                                                    <FormControl>
                                                        <Input type="number" placeholder="e.g. 2.5" {...field} value={field.value ?? ''} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="brokerId"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Associate/Broker</FormLabel>
                                                    <Select 
                                                        onValueChange={(value) => {
                                                            field.onChange(value);
                                                            const selectedBroker = brokers.find(b => b.id === value);
                                                            if (selectedBroker) {
                                                                form.setValue('brokerName', selectedBroker.full_name || '');
                                                            }
                                                        }} 
                                                        value={field.value || ''}
                                                        disabled={loadingBrokers}
                                                    >
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder={loadingBrokers ? "Loading..." : "Select broker"} />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {brokers.map(broker => (
                                                                <SelectItem key={broker.id} value={broker.id}>
                                                                    {broker.full_name || 'Unknown'}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                    <div className="mt-4">
                                        <FormField
                                            control={form.control}
                                            name="sellerName"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Seller Name</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="e.g. Jane Smith" {...field} value={field.value ?? ''} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>
                            </>
                        )}
                        
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button type="button" variant="outline">Cancel</Button>
                            </DialogClose>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? 'Saving...' : 'Save Plot'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
