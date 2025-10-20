/** @type {import('next').NextConfig} */

const nextConfig = {
    // Ensure Next.js uses this project as the root for file tracing
    // to avoid selecting the parent folder due to multiple lockfiles.
    outputFileTracingRoot: process.cwd(),
    experimental: { ppr: false },
    images: {
        remotePatterns: [
            { protocol: 'https', hostname: 'res.cloudinary.com' },
            { protocol: 'https', hostname: 'placehold.co' },
            { protocol: 'https', hostname: 'images.unsplash.com' },
        ],
    },
};

export default nextConfig;
