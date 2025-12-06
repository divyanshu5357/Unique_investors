/**
 * Example Component: Using Cloudinary for Image Uploads
 * This demonstrates how to use Cloudinary in your application
 */

'use client';

import React, { useState } from 'react';
import { CloudinaryImageUpload } from '@/components/ui/cloudinary-image-upload';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCloudinaryUpload } from '@/hooks/useCloudinaryUpload';
import { useToast } from '@/hooks/use-toast';

/**
 * Example 1: Simple Image Upload
 * Store URL in database directly
 */
export function SimpleImageUploadExample() {
    const [imageUrl, setImageUrl] = useState<string | null>(null);

    const handleSave = async () => {
        if (!imageUrl) return;

        try {
            // Save URL to database
            // await updateUserProfile({ profileImageUrl: imageUrl });

            console.log('Saved image URL:', imageUrl);
        } catch (error) {
            console.error('Failed to save:', error);
        }
    };

    return (
        <Card className="w-full max-w-md">
            <CardHeader>
                <CardTitle>Upload Profile Picture</CardTitle>
                <CardDescription>Upload to Cloudinary</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <CloudinaryImageUpload
                    label="Profile Picture"
                    value={imageUrl || undefined}
                    onChange={setImageUrl}
                    folder="unique_investors/profile"
                    required
                />

                {imageUrl && (
                    <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Image URL:</p>
                        <code className="block p-2 bg-muted rounded text-xs break-all">
                            {imageUrl}
                        </code>
                        <Button onClick={handleSave} className="w-full">
                            Save Profile
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

/**
 * Example 2: Image Upload with Metadata
 * Store both URL and image dimensions
 */
export function ImageUploadWithMetadataExample() {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [metadata, setMetadata] = useState<{
        width?: number;
        height?: number;
    }>({});

    const handleSave = async () => {
        if (!imageUrl) return;

        const galleryItem = {
            imageUrl,
            width: metadata.width,
            height: metadata.height,
            uploadedAt: new Date(),
        };

        console.log('Saving gallery item:', galleryItem);
        // await addGalleryImage(galleryItem);
    };

    return (
        <Card className="w-full max-w-md">
            <CardHeader>
                <CardTitle>Add Gallery Image</CardTitle>
                <CardDescription>With automatic dimension detection</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <CloudinaryImageUpload
                    label="Gallery Image"
                    value={imageUrl || undefined}
                    onChange={setImageUrl}
                    onImageData={(data) => {
                        setMetadata({
                            width: data.width,
                            height: data.height,
                        });
                    }}
                    folder="unique_investors/gallery"
                />

                {metadata.width && (
                    <div className="p-3 bg-muted rounded text-sm">
                        <p>Dimensions: {metadata.width} × {metadata.height}px</p>
                    </div>
                )}

                <Button onClick={handleSave} className="w-full">
                    Save to Gallery
                </Button>
            </CardContent>
        </Card>
    );
}

/**
 * Example 3: Using Upload Hook
 * For more control over upload state
 */
export function UploadHookExample() {
    const { toast } = useToast();
    const [results, setResults] = useState<string[]>([]);

    const { upload, isUploading, progress, error, reset } = useCloudinaryUpload({
        folder: 'unique_investors/testimonials',
        onSuccess: (result) => {
            setResults(prev => [...prev, result.secure_url]);
            toast({
                title: 'Success',
                description: 'Image uploaded successfully',
            });
        },
        onError: (error) => {
            toast({
                title: 'Error',
                description: error.message,
                variant: 'destructive',
            });
        },
    });

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            await upload(file);
        }
    };

    return (
        <Card className="w-full max-w-md">
            <CardHeader>
                <CardTitle>Upload with Custom Hook</CardTitle>
                <CardDescription>Using useCloudinaryUpload</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        disabled={isUploading}
                        className="block w-full"
                    />
                </div>

                {isUploading && (
                    <div className="space-y-2">
                        <p className="text-sm">Uploading... {progress.toFixed(0)}%</p>
                        <div className="w-full bg-muted rounded-full h-2">
                            <div
                                className="bg-primary h-2 rounded-full transition-all"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                )}

                {error && (
                    <p className="text-sm text-red-500">{error}</p>
                )}

                {results.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-sm font-medium">Uploaded Images:</p>
                        <ul className="space-y-1">
                            {results.map((url, index) => (
                                <li key={index} className="text-xs bg-muted p-2 rounded break-all">
                                    {url}
                                </li>
                            ))}
                        </ul>
                        <Button variant="outline" onClick={reset} className="w-full">
                            Clear Results
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

/**
 * Example 4: Batch Upload
 * For multiple files
 */
export function BatchUploadExample() {
    const [files, setFiles] = useState<File[]>([]);
    const { toast } = useToast();

    const { upload, isUploading } = useCloudinaryUpload({
        folder: 'unique_investors/gallery',
    });

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFiles(Array.from(e.target.files));
        }
    };

    const handleUploadAll = async () => {
        const results = [];

        for (const file of files) {
            try {
                const result = await upload(file);
                if (result) {
                    results.push(result.secure_url);
                }
            } catch (error) {
                console.error(`Failed to upload ${file.name}:`, error);
            }
        }

        toast({
            title: 'Upload Complete',
            description: `Successfully uploaded ${results.length} of ${files.length} images`,
        });

        setFiles([]);
    };

    return (
        <Card className="w-full max-w-md">
            <CardHeader>
                <CardTitle>Batch Upload</CardTitle>
                <CardDescription>Upload multiple images</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="block w-full"
                    />
                </div>

                {files.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-sm font-medium">
                            Selected Files: {files.length}
                        </p>
                        <ul className="text-xs space-y-1 max-h-40 overflow-y-auto">
                            {files.map((file, index) => (
                                <li key={index} className="text-muted-foreground">
                                    {file.name} ({(file.size / 1024).toFixed(2)} KB)
                                </li>
                            ))}
                        </ul>
                        <Button
                            onClick={handleUploadAll}
                            disabled={isUploading}
                            className="w-full"
                        >
                            {isUploading ? 'Uploading...' : 'Upload All'}
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

/**
 * Example 5: Form Integration
 * Using with react-hook-form
 */
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const formSchema = z.object({
    name: z.string().min(2, 'Name required'),
    image: z.string().url('Image URL required'),
    description: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function FormIntegrationExample() {
    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: '',
            image: '',
            description: '',
        },
    });

    const onSubmit = async (values: FormValues) => {
        console.log('Form submitted:', values);
        // Save to database
    };

    return (
        <Card className="w-full max-w-md">
            <CardHeader>
                <CardTitle>Form with Image Upload</CardTitle>
                <CardDescription>react-hook-form + Cloudinary</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Name</FormLabel>
                                    <FormControl>
                                        <input
                                            {...field}
                                            className="w-full px-3 py-2 border rounded"
                                            placeholder="Enter name"
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="image"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Image</FormLabel>
                                    <CloudinaryImageUpload
                                        label="Upload Image"
                                        value={field.value}
                                        onChange={field.onChange}
                                        folder="unique_investors"
                                        required
                                    />
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <Button type="submit" className="w-full">
                            Submit
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
