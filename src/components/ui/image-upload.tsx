'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, X, Eye, FileImage, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageUploadProps {
    label: string;
    accept?: string;
    maxSize?: number; // in MB
    value?: {
        data: string;
        type: string;
        size: number;
    } | null;
    onChange: (imageData: { data: string; type: string; size: number } | null) => void;
    error?: string;
    className?: string;
    required?: boolean;
}

export function ImageUpload({
    label,
    accept = 'image/*',
    maxSize = 5, // 5MB default
    value,
    onChange,
    error,
    className,
    required = false
}: ImageUploadProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [preview, setPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = async (file: File) => {
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            return;
        }

        // Validate file size
        const fileSizeMB = file.size / (1024 * 1024);
        if (fileSizeMB > maxSize) {
            return;
        }

        setUploading(true);

        try {
            // Convert to base64
            const reader = new FileReader();
            reader.onload = (e) => {
                const base64Data = e.target?.result as string;
                const imageData = {
                    data: base64Data,
                    type: file.type,
                    size: file.size
                };

                onChange(imageData);
                setPreview(base64Data);
                setUploading(false);
            };

            reader.onerror = () => {
                setUploading(false);
            };

            reader.readAsDataURL(file);
        } catch (error) {
            console.error('Error processing image:', error);
            setUploading(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            handleFileSelect(files[0]);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            handleFileSelect(files[0]);
        }
    };

    const handleRemove = () => {
        onChange(null);
        setPreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    React.useEffect(() => {
        if (value?.data) {
            setPreview(value.data);
        } else {
            setPreview(null);
        }
    }, [value]);

    return (
        <div className={cn('space-y-2', className)}>
            <Label className="text-sm font-medium">
                {label}
                {required && <span className="text-red-500 ml-1">*</span>}
            </Label>

            {!value && (
                <div
                    className={cn(
                        'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
                        isDragging 
                            ? 'border-primary bg-primary/5' 
                            : 'border-muted-foreground/25 hover:border-primary/50',
                        error && 'border-red-500 bg-red-50'
                    )}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <div className="flex flex-col items-center gap-2">
                        {uploading ? (
                            <>
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                <p className="text-sm text-muted-foreground">Uploading...</p>
                            </>
                        ) : (
                            <>
                                <Upload className="h-8 w-8 text-muted-foreground" />
                                <div className="space-y-1">
                                    <p className="text-sm font-medium">Drop your image here or click to browse</p>
                                    <p className="text-xs text-muted-foreground">
                                        Supports: JPEG, PNG, GIF • Max size: {maxSize}MB
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {value && preview && (
                <div className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <img 
                                    src={preview} 
                                    alt="Upload preview" 
                                    className="w-16 h-16 object-cover rounded-md border"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="absolute -top-2 -right-2 h-6 w-6 p-0"
                                    onClick={() => {
                                        // Open preview in a larger view (could trigger a modal)
                                        window.open(preview, '_blank');
                                    }}
                                >
                                    <Eye className="h-3 w-3" />
                                </Button>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-medium flex items-center gap-1">
                                    <FileImage className="h-4 w-4" />
                                    Document Image
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {value.type} • {formatFileSize(value.size)}
                                </p>
                            </div>
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleRemove}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}

            <input
                ref={fileInputRef}
                type="file"
                accept={accept}
                onChange={handleFileInputChange}
                className="hidden"
            />

            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}
        </div>
    );
}

export default ImageUpload;