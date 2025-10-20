'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ZoomIn, ZoomOut, RotateCw, Download, ExternalLink, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageZoomModalProps {
    isOpen: boolean;
    onClose: () => void;
    imageData: string;
    title?: string;
    description?: string;
    metadata?: {
        fileName?: string;
        fileType?: string;
        fileSize?: number;
        uploadedBy?: string;
        uploadedAt?: string;
        [key: string]: any;
    };
}

export function ImageZoomModal({
    isOpen,
    onClose,
    imageData,
    title = "Image Preview",
    description,
    metadata
}: ImageZoomModalProps) {
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);

    const handleZoomIn = () => {
        setZoom(prev => Math.min(prev + 0.25, 3));
    };

    const handleZoomOut = () => {
        setZoom(prev => Math.max(prev - 0.25, 0.25));
    };

    const handleRotate = () => {
        setRotation(prev => (prev + 90) % 360);
    };

    const handleReset = () => {
        setZoom(1);
        setRotation(0);
    };

    const handleDownload = () => {
        const link = document.createElement('a');
        link.href = imageData;
        link.download = metadata?.fileName || `image-${Date.now()}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const openInNewTab = () => {
        const newWindow = window.open();
        if (newWindow) {
            newWindow.document.write(`
                <html>
                    <head>
                        <title>${title}</title>
                        <style>
                            body {
                                margin: 0;
                                padding: 20px;
                                display: flex;
                                flex-direction: column;
                                justify-content: center;
                                align-items: center;
                                min-height: 100vh;
                                background: #f5f5f5;
                                font-family: Arial, sans-serif;
                            }
                            .header {
                                background: white;
                                padding: 15px 20px;
                                border-radius: 8px;
                                margin-bottom: 20px;
                                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                                text-align: center;
                                max-width: 90vw;
                            }
                            .header h1 {
                                margin: 0 0 5px 0;
                                color: #333;
                                font-size: 18px;
                            }
                            .header p {
                                margin: 0;
                                color: #666;
                                font-size: 14px;
                            }
                            img {
                                max-width: 95vw;
                                max-height: 80vh;
                                object-fit: contain;
                                border-radius: 8px;
                                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                                cursor: zoom-in;
                                transition: transform 0.3s ease;
                            }
                            img:hover {
                                transform: scale(1.05);
                            }
                            .controls {
                                margin-top: 15px;
                                display: flex;
                                gap: 10px;
                                align-items: center;
                                justify-content: center;
                                flex-wrap: wrap;
                            }
                            .btn {
                                padding: 8px 16px;
                                background: #007bff;
                                color: white;
                                border: none;
                                border-radius: 4px;
                                cursor: pointer;
                                font-size: 12px;
                            }
                            .btn:hover {
                                background: #0056b3;
                            }
                        </style>
                    </head>
                    <body>
                        <div class="header">
                            <h1>${title}</h1>
                            ${description ? `<p>${description}</p>` : ''}
                            ${metadata?.uploadedBy ? `<p>Uploaded by: ${metadata.uploadedBy}</p>` : ''}
                        </div>
                        <img src="${imageData}" alt="${title}" id="zoomImg" />
                        <div class="controls">
                            <button class="btn" onclick="zoomIn()">🔍+ Zoom In</button>
                            <button class="btn" onclick="zoomOut()">🔍- Zoom Out</button>
                            <button class="btn" onclick="rotate()">↻ Rotate</button>
                            <button class="btn" onclick="reset()">⟲ Reset</button>
                        </div>
                        <script>
                            let currentZoom = 1;
                            let currentRotation = 0;
                            const img = document.getElementById('zoomImg');
                            
                            function updateTransform() {
                                img.style.transform = \`scale(\${currentZoom}) rotate(\${currentRotation}deg)\`;
                            }
                            
                            function zoomIn() {
                                currentZoom = Math.min(currentZoom + 0.25, 3);
                                updateTransform();
                            }
                            
                            function zoomOut() {
                                currentZoom = Math.max(currentZoom - 0.25, 0.25);
                                updateTransform();
                            }
                            
                            function rotate() {
                                currentRotation = (currentRotation + 90) % 360;
                                updateTransform();
                            }
                            
                            function reset() {
                                currentZoom = 1;
                                currentRotation = 0;
                                updateTransform();
                            }
                            
                            // Keyboard shortcuts
                            document.addEventListener('keydown', function(e) {
                                switch(e.key) {
                                    case '+':
                                    case '=':
                                        zoomIn();
                                        break;
                                    case '-':
                                        zoomOut();
                                        break;
                                    case 'r':
                                    case 'R':
                                        rotate();
                                        break;
                                    case 'Escape':
                                        reset();
                                        break;
                                }
                            });
                        </script>
                    </body>
                </html>
            `);
            newWindow.document.close();
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const resetView = () => {
        setZoom(1);
        setRotation(0);
    };

    // Reset view when modal opens/closes
    React.useEffect(() => {
        if (isOpen) {
            resetView();
        }
    }, [isOpen]);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 overflow-hidden">
                <DialogHeader className="p-6 pb-4">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
                            {description && (
                                <DialogDescription className="mt-1">{description}</DialogDescription>
                            )}
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onClose}
                            className="flex-shrink-0"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                    
                    {/* Control buttons */}
                    <div className="flex flex-wrap gap-2 mt-4">
                        <Button variant="outline" size="sm" onClick={handleZoomIn}>
                            <ZoomIn className="h-4 w-4 mr-1" />
                            Zoom In
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleZoomOut}>
                            <ZoomOut className="h-4 w-4 mr-1" />
                            Zoom Out
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleRotate}>
                            <RotateCw className="h-4 w-4 mr-1" />
                            Rotate
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleReset}>
                            Reset
                        </Button>
                        <Button variant="outline" size="sm" onClick={openInNewTab}>
                            <ExternalLink className="h-4 w-4 mr-1" />
                            Full Screen
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleDownload}>
                            <Download className="h-4 w-4 mr-1" />
                            Download
                        </Button>
                    </div>
                </DialogHeader>

                {/* Image container */}
                <div className="flex-1 overflow-auto p-6 pt-0">
                    <div className="flex justify-center items-center min-h-[300px]">
                        <img
                            src={imageData}
                            alt={title}
                            className={cn(
                                "max-w-full max-h-[60vh] object-contain transition-transform duration-300 ease-in-out cursor-pointer",
                                "border rounded-lg shadow-lg"
                            )}
                            style={{
                                transform: `scale(${zoom}) rotate(${rotation}deg)`,
                            }}
                            onClick={openInNewTab}
                            onError={(e) => {
                                e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNiIgZmlsbD0iIzljYTNhZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIG5vdCBhdmFpbGFibGU8L3RleHQ+PC9zdmc+';
                            }}
                        />
                    </div>
                </div>

                {/* Metadata footer */}
                {metadata && (
                    <div className="border-t bg-muted/30 p-4">
                        <div className="flex flex-wrap gap-4 text-sm">
                            {metadata.fileType && (
                                <div className="flex items-center gap-1">
                                    <span className="text-muted-foreground">Type:</span>
                                    <Badge variant="outline" className="text-xs">
                                        {metadata.fileType}
                                    </Badge>
                                </div>
                            )}
                            {metadata.fileSize && (
                                <div className="flex items-center gap-1">
                                    <span className="text-muted-foreground">Size:</span>
                                    <span className="font-medium">{formatFileSize(metadata.fileSize)}</span>
                                </div>
                            )}
                            {metadata.uploadedBy && (
                                <div className="flex items-center gap-1">
                                    <span className="text-muted-foreground">Uploaded by:</span>
                                    <span className="font-medium">{metadata.uploadedBy}</span>
                                </div>
                            )}
                            {metadata.uploadedAt && (
                                <div className="flex items-center gap-1">
                                    <span className="text-muted-foreground">Date:</span>
                                    <span className="font-medium">{metadata.uploadedAt}</span>
                                </div>
                            )}
                            <div className="flex items-center gap-1">
                                <span className="text-muted-foreground">Zoom:</span>
                                <span className="font-medium">{Math.round(zoom * 100)}%</span>
                            </div>
                        </div>
                        
                        <div className="mt-2 text-xs text-muted-foreground">
                            💡 Use zoom controls, click image for full screen, or keyboard shortcuts: +/- (zoom), R (rotate), Esc (reset)
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

export default ImageZoomModal;