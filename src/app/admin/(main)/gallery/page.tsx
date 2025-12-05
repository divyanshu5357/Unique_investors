"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Plus, Edit, Trash2, Image as ImageIcon, Eye, EyeOff } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { getAdminGalleryImages, addGalleryImage, updateGalleryImage, deleteGalleryImage } from '@/lib/actions';
import Image from 'next/image';

interface GalleryImage {
    id: string;
    project_name: string;
    title: string;
    description: string;
    image_url: string;
    is_active: boolean;
    order_index: number;
    created_at: string;
}

export default function PropertyGalleryPage() {
    const [gallery, setGallery] = useState<GalleryImage[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingImage, setEditingImage] = useState<GalleryImage | null>(null);
    const [formData, setFormData] = useState({
        project_name: '',
        title: '',
        description: '',
        image_url: '',
        order_index: 0,
    });
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string>('');

    useEffect(() => {
        fetchGallery();
    }, []);

    const fetchGallery = async () => {
        try {
            setLoading(true);
            const data = await getAdminGalleryImages();
            setGallery(data || []);
        } catch (error) {
            console.error('Error fetching gallery:', error);
            toast({
                title: 'Error',
                description: 'Failed to load gallery images',
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                toast({
                    title: 'Error',
                    description: 'Please select a valid image file',
                    variant: 'destructive'
                });
                return;
            }

            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                toast({
                    title: 'Error',
                    description: 'Image size should be less than 5MB',
                    variant: 'destructive'
                });
                return;
            }

            setImageFile(file);

            // Create preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewUrl(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleOpenDialog = (image?: GalleryImage) => {
        if (image) {
            setEditingImage(image);
            setFormData({
                project_name: image.project_name,
                title: image.title,
                description: image.description,
                image_url: image.image_url,
                order_index: image.order_index,
            });
            setPreviewUrl(image.image_url);
        } else {
            setEditingImage(null);
            setFormData({
                project_name: '',
                title: '',
                description: '',
                image_url: '',
                order_index: 0,
            });
            setPreviewUrl('');
        }
        setImageFile(null);
        setIsDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setIsDialogOpen(false);
        setEditingImage(null);
        setImageFile(null);
        setPreviewUrl('');
        setFormData({
            project_name: '',
            title: '',
            description: '',
            image_url: '',
            order_index: 0,
        });
    };

    const uploadToSupabase = async (file: File): Promise<string> => {
        try {
            const formDataWithFile = new FormData();
            formDataWithFile.append('file', file);
            formDataWithFile.append('bucket', 'property_gallery');

            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formDataWithFile,
            });

            if (!response.ok) {
                throw new Error('Upload failed');
            }

            const data = await response.json();
            return data.url;
        } catch (error) {
            console.error('Upload error:', error);
            throw error;
        }
    };

    const handleSave = async () => {
        try {
            // Validate required fields
            if (!formData.project_name.trim() || !formData.title.trim()) {
                toast({
                    title: 'Error',
                    description: 'Project name and title are required',
                    variant: 'destructive'
                });
                return;
            }

            setUploading(true);
            let imageUrl = formData.image_url;

            // Upload new image if selected
            if (imageFile) {
                imageUrl = await uploadToSupabase(imageFile);
            }

            if (!imageUrl) {
                toast({
                    title: 'Error',
                    description: 'Image URL is required',
                    variant: 'destructive'
                });
                return;
            }

            if (editingImage) {
                // Update existing
                await updateGalleryImage(editingImage.id, {
                    project_name: formData.project_name,
                    title: formData.title,
                    description: formData.description,
                    image_url: imageUrl,
                    order_index: formData.order_index,
                });
                toast({
                    title: 'Success',
                    description: 'Gallery image updated successfully'
                });
            } else {
                // Add new
                await addGalleryImage({
                    project_name: formData.project_name,
                    title: formData.title,
                    description: formData.description,
                    image_url: imageUrl,
                    order_index: formData.order_index,
                });
                toast({
                    title: 'Success',
                    description: 'Gallery image added successfully'
                });
            }

            handleCloseDialog();
            await fetchGallery();
        } catch (error) {
            console.error('Error saving image:', error);
            toast({
                title: 'Error',
                description: 'Failed to save gallery image',
                variant: 'destructive'
            });
        } finally {
            setUploading(false);
        }
    };

    const handleToggleActive = async (image: GalleryImage) => {
        try {
            await updateGalleryImage(image.id, { is_active: !image.is_active });
            toast({
                title: 'Success',
                description: `Image ${!image.is_active ? 'activated' : 'deactivated'} successfully`
            });
            await fetchGallery();
        } catch (error) {
            console.error('Error toggling image:', error);
            toast({
                title: 'Error',
                description: 'Failed to toggle image status',
                variant: 'destructive'
            });
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this image?')) {
            return;
        }

        try {
            await deleteGalleryImage(id);
            toast({
                title: 'Success',
                description: 'Gallery image deleted successfully'
            });
            await fetchGallery();
        } catch (error) {
            console.error('Error deleting image:', error);
            toast({
                title: 'Error',
                description: 'Failed to delete gallery image',
                variant: 'destructive'
            });
        }
    };

    return (
        <div className="space-y-6 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Property Gallery</h1>
                    <p className="text-muted-foreground">Manage property gallery images</p>
                </div>
                <Button onClick={() => handleOpenDialog()}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Image
                </Button>
            </div>

            {/* Gallery Images Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Gallery Images</CardTitle>
                    <CardDescription>All property gallery images ({gallery.length})</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center h-40">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : gallery.length === 0 ? (
                        <div className="text-center h-40 flex items-center justify-center">
                            <div className="text-muted-foreground">
                                <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                <p>No gallery images yet</p>
                            </div>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Preview</TableHead>
                                        <TableHead>Project</TableHead>
                                        <TableHead>Title</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead className="text-center">Order</TableHead>
                                        <TableHead className="text-center">Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {gallery.map((image) => (
                                        <TableRow key={image.id}>
                                            <TableCell>
                                                <div className="relative w-16 h-16 rounded overflow-hidden">
                                                    <Image
                                                        src={image.image_url}
                                                        alt={image.title}
                                                        fill
                                                        className="object-cover"
                                                    />
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-medium">{image.project_name}</TableCell>
                                            <TableCell>{image.title}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                                                {image.description || '-'}
                                            </TableCell>
                                            <TableCell className="text-center">{image.order_index}</TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant={image.is_active ? 'default' : 'secondary'}>
                                                    {image.is_active ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right space-x-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleToggleActive(image)}
                                                    title={image.is_active ? 'Hide' : 'Show'}
                                                >
                                                    {image.is_active ? (
                                                        <Eye className="h-4 w-4" />
                                                    ) : (
                                                        <EyeOff className="h-4 w-4" />
                                                    )}
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleOpenDialog(image)}
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDelete(image.id)}
                                                    className="text-destructive hover:text-destructive"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Add/Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>
                            {editingImage ? 'Edit Gallery Image' : 'Add Gallery Image'}
                        </DialogTitle>
                        <DialogDescription>
                            {editingImage ? 'Update the gallery image details' : 'Add a new property image to the gallery'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {/* Project Name */}
                        <div className="space-y-2">
                            <Label htmlFor="project_name">Project Name *</Label>
                            <Input
                                id="project_name"
                                placeholder="e.g., Green Enclave, Royal Heights"
                                value={formData.project_name}
                                onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
                            />
                        </div>

                        {/* Title */}
                        <div className="space-y-2">
                            <Label htmlFor="title">Image Title *</Label>
                            <Input
                                id="title"
                                placeholder="e.g., Master Bedroom, Living Area"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            />
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Input
                                id="description"
                                placeholder="e.g., Spacious master bedroom with attached balcony"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>

                        {/* Order Index */}
                        <div className="space-y-2">
                            <Label htmlFor="order_index">Display Order</Label>
                            <Input
                                id="order_index"
                                type="number"
                                min="0"
                                value={formData.order_index}
                                onChange={(e) => setFormData({ ...formData, order_index: parseInt(e.target.value) })}
                            />
                        </div>

                        {/* Image Upload */}
                        <div className="space-y-2">
                            <Label htmlFor="image">Image *</Label>
                            <div className="border-2 border-dashed rounded-lg p-4">
                                <Input
                                    id="image"
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageSelect}
                                    className="cursor-pointer"
                                />
                                <p className="text-xs text-muted-foreground mt-2">
                                    Maximum file size: 5MB. Supported formats: JPEG, PNG, WebP
                                </p>
                            </div>
                        </div>

                        {/* Preview */}
                        {previewUrl && (
                            <div className="space-y-2">
                                <Label>Image Preview</Label>
                                <div className="relative w-full h-48 rounded-lg overflow-hidden border">
                                    <Image
                                        src={previewUrl}
                                        alt="Preview"
                                        fill
                                        className="object-cover"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={handleCloseDialog} disabled={uploading}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={uploading}>
                            {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {editingImage ? 'Update' : 'Add'} Image
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
