'use client';

import React, { useState } from 'react';
import { CloudinaryImageUpload } from '@/components/ui/cloudinary-image-upload';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, AlertCircle } from 'lucide-react';

/**
 * Quick Test Page for Cloudinary Integration
 * Access at: http://localhost:3000/cloudinary-test
 */
export default function CloudinaryTestPage() {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [testLog, setTestLog] = useState<string[]>([]);
    const [copied, setCopied] = useState(false);

    const addLog = (message: string) => {
        setTestLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
    };

    const handleCopy = () => {
        if (imageUrl) {
            navigator.clipboard.writeText(imageUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            addLog('✅ URL copied to clipboard');
        }
    };

    const cloudinaryConfigured = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
            <div className="max-w-2xl mx-auto space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-4xl font-bold">🎨 Cloudinary Integration Test</h1>
                    <p className="text-muted-foreground mt-2">
                        Test your Cloudinary setup with this quick demo
                    </p>
                </div>

                {/* Configuration Status */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            {cloudinaryConfigured ? (
                                <>
                                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                                    ✅ Configuration Status
                                </>
                            ) : (
                                <>
                                    <AlertCircle className="h-5 w-5 text-red-500" />
                                    ❌ Configuration Missing
                                </>
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="text-muted-foreground">Cloud Name</p>
                                <p className="font-mono bg-muted p-2 rounded">
                                    {cloudinaryConfigured || 'Not set'}
                                </p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Upload Preset</p>
                                <p className="font-mono bg-muted p-2 rounded">
                                    {process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'Not set'}
                                </p>
                            </div>
                        </div>
                        {cloudinaryConfigured && (
                            <Alert className="bg-green-50 border-green-200">
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                                <AlertDescription className="text-green-800">
                                    All environment variables are configured correctly!
                                </AlertDescription>
                            </Alert>
                        )}
                    </CardContent>
                </Card>

                {/* Upload Component */}
                <Card>
                    <CardHeader>
                        <CardTitle>Test Upload</CardTitle>
                        <CardDescription>
                            Upload an image to test the Cloudinary integration
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <CloudinaryImageUpload
                            label="Upload Test Image"
                            value={imageUrl || undefined}
                            onChange={setImageUrl}
                            folder="unique_investors/test"
                            onImageData={(data) => {
                                addLog(`📸 Image uploaded: ${data.width}x${data.height}px`);
                            }}
                        />
                    </CardContent>
                </Card>

                {/* Results */}
                {imageUrl && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                                ✅ Upload Successful!
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <p className="text-sm text-muted-foreground mb-2">Image URL:</p>
                                <div className="flex gap-2">
                                    <code className="flex-1 bg-muted p-3 rounded text-xs overflow-auto">
                                        {imageUrl}
                                    </code>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={handleCopy}
                                    >
                                        {copied ? 'Copied! ✓' : 'Copy'}
                                    </Button>
                                </div>
                            </div>

                            <div>
                                <p className="text-sm text-muted-foreground mb-2">Preview:</p>
                                <img
                                    src={imageUrl}
                                    alt="Uploaded"
                                    className="max-w-full h-auto rounded border"
                                />
                            </div>

                            <Alert className="bg-blue-50 border-blue-200">
                                <AlertCircle className="h-4 w-4 text-blue-600" />
                                <AlertDescription className="text-blue-800">
                                    This URL is ready to save to your database! It's already hosted on Cloudinary's CDN.
                                </AlertDescription>
                            </Alert>
                        </CardContent>
                    </Card>
                )}

                {/* Test Log */}
                <Card>
                    <CardHeader>
                        <CardTitle>📋 Test Log</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="bg-muted p-4 rounded font-mono text-xs space-y-1 max-h-48 overflow-y-auto">
                            {testLog.length === 0 ? (
                                <p className="text-muted-foreground">Logs will appear here...</p>
                            ) : (
                                testLog.map((log, i) => (
                                    <p key={i} className="text-foreground">{log}</p>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Next Steps */}
                <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                    <CardHeader>
                        <CardTitle>📚 Next Steps</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                        <p>✅ <strong>Environment variables set</strong></p>
                        <p>✅ <strong>Upload component working</strong></p>
                        <p>→ <strong>Now migrate your components:</strong></p>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                            <li>Read <code className="bg-white px-1 rounded">CLOUDINARY_MIGRATION.md</code></li>
                            <li>Start with Testimonials component</li>
                            <li>Test thoroughly before moving to next component</li>
                            <li>Deploy to production when ready</li>
                        </ul>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
