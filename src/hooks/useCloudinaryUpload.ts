import { useState, useCallback } from 'react';
import { uploadToCloudinary, CloudinaryUploadResult, validateImageFile } from '@/lib/cloudinary';
import { useToast } from '@/hooks/use-toast';

export interface UseCloudinaryUploadOptions {
    folder?: string;
    maxSize?: number;
    onSuccess?: (result: CloudinaryUploadResult) => void;
    onError?: (error: Error) => void;
}

export interface UseCloudinaryUploadState {
    isUploading: boolean;
    progress: number;
    error: string | null;
    preview: string | null;
}

/**
 * Hook for managing Cloudinary image uploads
 * Provides upload state, progress tracking, and error handling
 */
export function useCloudinaryUpload(options: UseCloudinaryUploadOptions = {}) {
    const { folder = 'unique_investors', onSuccess, onError } = options;
    const { toast } = useToast();

    const [state, setState] = useState<UseCloudinaryUploadState>({
        isUploading: false,
        progress: 0,
        error: null,
        preview: null,
    });

    /**
     * Upload a single file to Cloudinary
     */
    const upload = useCallback(
        async (file: File): Promise<CloudinaryUploadResult | null> => {
            // Clear previous error
            setState(prev => ({ ...prev, error: null }));

            // Validate file
            const validation = validateImageFile(file);
            if (!validation.isValid) {
                setState(prev => ({ ...prev, error: validation.error || 'File validation failed' }));
                toast({
                    title: 'Upload Failed',
                    description: validation.error,
                    variant: 'destructive',
                });
                return null;
            }

            setState(prev => ({ ...prev, isUploading: true, progress: 0 }));

            try {
                // Simulate progress
                const progressInterval = setInterval(() => {
                    setState(prev => ({
                        ...prev,
                        progress: Math.min(prev.progress + Math.random() * 20, 90),
                    }));
                }, 200);

                const result = await uploadToCloudinary(file, folder);
                clearInterval(progressInterval);

                setState(prev => ({
                    ...prev,
                    isUploading: false,
                    progress: 100,
                    preview: result.secure_url,
                }));

                // Callback after brief delay
                setTimeout(() => {
                    setState(prev => ({ ...prev, progress: 0 }));
                }, 500);

                if (onSuccess) {
                    onSuccess(result);
                }

                return result;
            } catch (error) {
                const errorMessage = error instanceof Error
                    ? error.message
                    : 'Failed to upload image';

                setState(prev => ({
                    ...prev,
                    isUploading: false,
                    error: errorMessage,
                    progress: 0,
                }));

                toast({
                    title: 'Upload Error',
                    description: errorMessage,
                    variant: 'destructive',
                });

                if (onError) {
                    onError(error instanceof Error ? error : new Error(errorMessage));
                }

                return null;
            }
        },
        [folder, onSuccess, onError, toast]
    );

    /**
     * Clear upload state
     */
    const reset = useCallback(() => {
        setState({
            isUploading: false,
            progress: 0,
            error: null,
            preview: null,
        });
    }, []);

    /**
     * Clear error message
     */
    const clearError = useCallback(() => {
        setState(prev => ({ ...prev, error: null }));
    }, []);

    return {
        ...state,
        upload,
        reset,
        clearError,
    };
}

/**
 * Hook for managing multiple image uploads
 */
export function useMultipleCloudinaryUploads(options: UseCloudinaryUploadOptions = {}) {
    const { folder = 'unique_investors', onSuccess, onError } = options;
    const { toast } = useToast();

    const [uploads, setUploads] = useState<Map<string, UseCloudinaryUploadState>>(new Map());
    const [totalProgress, setTotalProgress] = useState(0);

    const uploadFile = useCallback(
        async (file: File, fileId: string = file.name): Promise<CloudinaryUploadResult | null> => {
            // Validate file
            const validation = validateImageFile(file);
            if (!validation.isValid) {
                setUploads(prev => new Map(prev).set(fileId, {
                    isUploading: false,
                    progress: 0,
                    error: validation.error || 'File validation failed',
                    preview: null,
                }));
                return null;
            }

            setUploads(prev => new Map(prev).set(fileId, {
                isUploading: true,
                progress: 0,
                error: null,
                preview: null,
            }));

            try {
                const progressInterval = setInterval(() => {
                    setUploads(prev => {
                        const newMap = new Map(prev);
                        const current = newMap.get(fileId);
                        if (current) {
                            newMap.set(fileId, {
                                ...current,
                                progress: Math.min(current.progress + Math.random() * 20, 90),
                            });
                        }
                        return newMap;
                    });
                }, 200);

                const result = await uploadToCloudinary(file, folder);
                clearInterval(progressInterval);

                setUploads(prev => {
                    const newMap = new Map(prev);
                    newMap.set(fileId, {
                        isUploading: false,
                        progress: 100,
                        error: null,
                        preview: result.secure_url,
                    });
                    return newMap;
                });

                if (onSuccess) {
                    onSuccess(result);
                }

                return result;
            } catch (error) {
                const errorMessage = error instanceof Error
                    ? error.message
                    : 'Failed to upload image';

                setUploads(prev => {
                    const newMap = new Map(prev);
                    newMap.set(fileId, {
                        isUploading: false,
                        progress: 0,
                        error: errorMessage,
                        preview: null,
                    });
                    return newMap;
                });

                if (onError) {
                    onError(error instanceof Error ? error : new Error(errorMessage));
                }

                return null;
            }
        },
        [folder, onSuccess, onError]
    );

    const updateTotalProgress = useCallback(() => {
        const values = Array.from(uploads.values());
        if (values.length === 0) {
            setTotalProgress(0);
            return;
        }

        const totalProgress = values.reduce((sum, upload) => sum + upload.progress, 0) / values.length;
        setTotalProgress(totalProgress);
    }, [uploads]);

    const reset = useCallback(() => {
        setUploads(new Map());
        setTotalProgress(0);
    }, []);

    const getUploadState = useCallback(
        (fileId: string) => uploads.get(fileId),
        [uploads]
    );

    return {
        uploads,
        totalProgress,
        uploadFile,
        updateTotalProgress,
        reset,
        getUploadState,
    };
}
