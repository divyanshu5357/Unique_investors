
"use client"

import React, { useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { bulkAddPlots } from '@/lib/actions';

const bulkAddSchema = z.object({
    projectName: z.string().min(1, "Project name is required"),
    type: z.string().min(1, "Type is required"),
    block: z.string().min(1, "Block is required"),
    totalPlots: z.coerce.number().int().positive("Total plots must be a positive integer"),
    dimension: z.string().min(1, "Dimension is required"),
    area: z.coerce.number().positive("Area must be a positive number"),
});

type BulkAddFormValues = z.infer<typeof bulkAddSchema>;

export default function BulkAddPage() {
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    const form = useForm<BulkAddFormValues>({
        resolver: zodResolver(bulkAddSchema),
        defaultValues: {
            projectName: '',
            type: '',
            block: '',
            totalPlots: '' as any,
            dimension: '',
            area: '' as any,
        },
    });

    const onFormSubmit = (values: BulkAddFormValues) => {
        startTransition(async () => {
            try {
                const result = await bulkAddPlots(values);
                toast({
                    title: "Success!",
                    description: `${result.count} plots were generated successfully for ${values.projectName}, Block ${values.block}.`,
                });
                form.reset();
            } catch (error) {
                console.error("Bulk add error:", error);
                toast({ 
                    title: "Error", 
                    description: (error as Error).message || "An unexpected error occurred.", 
                    variant: "destructive" 
                });
            }
        });
    };

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold font-headline">Bulk Add Plots</h1>
            
            <Card className="max-w-2xl">
                <CardHeader>
                    <CardTitle>Generate Plot Inventory</CardTitle>
                    <CardDescription>
                        Use this form to quickly generate multiple plot records for a new project or block. 
                        All generated plots will have a status of 'Available' by default.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onFormSubmit)} className="space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                                    name="totalPlots"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Total Number of Plots</FormLabel>
                                            <FormControl>
                                                <Input type="number" placeholder="e.g. 50" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                 <FormField
                                    control={form.control}
                                    name="dimension"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Default Dimension</FormLabel>
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
                                            <FormLabel>Default Area (gaj)</FormLabel>
                                            <FormControl>
                                                <Input type="number" placeholder="e.g. 133" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            
                            <div className="flex justify-end">
                                <Button type="submit" disabled={isPending}>
                                    {isPending ? `Generating ${form.getValues('totalPlots') || ''} Plots...` : 'Generate Plots'}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}
