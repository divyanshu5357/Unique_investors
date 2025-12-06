'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Upload, X, Eye, FileImage, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { uploadToCloudinary, validateImageFile } from '@/lib/cloudinary';

interface CloudinaryImageUploadProps {
    label: string;
    value?: string; // Cloudinary URL
    onChange: (url: string | null) => void;
    onImageData?: (data: { url: string; width?: number; height?: number }) => void;
    error?: string;
    className?: string;
    required?: boolean;
    folder?: string;
    accept?: string;
}

export function CloudinaryImageUpload({
    label,
    value,
    onChange,
    onImageData,
    error,
    className,
    required = false,
    folder = 'unique_investors',
    accept = 'image/*'
}: CloudinaryImageUploadProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [preview, setPreview] = useState<string | null>(value || null);
    const [localError, setLocalError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = async (file: File) => {
        setLocalError(null);
        
        if (!file) return;

        // Validate file
        const validation = validateImageFile(file);
        if (!validation.isValid) {
            setLocalError(validation.error || 'File validation failed');
            return;
        }

        setUploading(true);
        setUploadProgress(0);

        try {
            // Simulate progress updates
            const progressInterval = setInterval(() => {
                setUploadProgress(prev => {
                    if (prev >= 90) clearInterval(progressInterval);
                    return Math.min(prev + Math.random() * 20, 90);
                });
            }, 200);

            const result = await uploadToCloudinary(file, folder);
            clearInterval(progressInterval);
            setUploadProgress(100);

            // Update preview with the secure URL
            setPreview(result.secure_url);
            onChange(result.secure_url);

            if (onImageData) {
                onImageData({
                    url: result.secure_url,
                    width: result.width,
                    height: result.height,
                });
            }

            // Reset after brief delay
            setTimeout(() => {
                setUploadProgress(0);
                setUploading(false);
            }, 500);
        } catch (err) {
            setLocalError(
                err instanceof Error
                    ? err.message
                    : 'Failed to upload image. Please try again.'
            );
            setUploading(false);
            setUploadProgress(0);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            handleFileSelect(files[0]);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            handleFileSelect(files[0] as File);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleClear = () => {
        setPreview(null);
        onChange(null);
        setLocalError(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleView = () => {
        if (preview) {
            window.open(preview, '_blank');
        }
    };

    const displayError = error || localError;

    return (
        <div className={cn('space-y-2', className)}>
            <Label htmlFor={`cloudinary-upload-${label}`}>
                {label}
                {required && <span className="text-red-500 ml-1">*</span>}
            </Label>

            <div
                className={cn(
                    'relative border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer',
                    isDragging
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-300 hover:border-primary/50',
                    displayError && 'border-red-500'
                )}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => !uploading && fileInputRef.current?.click()}
            >
                <Input
                    ref={fileInputRef}
                    id={`cloudinary-upload-${label}`}
                    type="file"
                    accept={accept}
                    onChange={handleInputChange}
                    className="hidden"
                    disabled={uploading}
                />

                {uploading ? (
                    <div className="space-y-3">
                        <div className="flex items-center justify-center gap-2">
                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                            <span className="text-sm font-medium">Uploading to Cloudinary...</span>
                        </div>
                        <Progress value={uploadProgress} className="h-2" />
                        <p className="text-xs text-muted-foreground text-center">
                            {uploadProgress.toFixed(0)}%
                        </p>
                    </div>
                ) : preview ? (
                    <div className="space-y-3">
                        <div className="relative inline-block">
                            <img
                                src={preview}
                                alt="Preview"
                                className="h-32 w-32 object-cover rounded-md"
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleView();
                                }}
                                className="gap-2"
                            >
                                <Eye className="h-4 w-4" />
                                View
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleClear();
                                }}
                                className="gap-2"
                            >
                                <X className="h-4 w-4" />
                                Remove
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            ✓ Image uploaded successfully to Cloudinary
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center gap-2 py-2">
                        <FileImage className="h-10 w-10 text-muted-foreground" />
                        <div className="text-center">
                            <p className="font-medium text-sm">
                                Drop image here or click to select
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                                Max 2.5MB • JPEG, PNG, GIF, WebP
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {displayError && (
                <Alert variant="destructive" className="mt-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{displayError}</AlertDescription>
                </Alert>
            )}

            {!displayError && (
                <p className="text-xs text-muted-foreground">
                    Images are uploaded directly to Cloudinary. Maximum file size: 2.5MB
                </p>
            )}
        </div>
    );
}

export default CloudinaryImageUpload;
