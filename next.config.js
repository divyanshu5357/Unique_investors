/** @type {import('next').NextConfig} */
const nextConfig = {
	// Match settings from next.config.mjs but in CommonJS format.
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

module.exports = nextConfig;
