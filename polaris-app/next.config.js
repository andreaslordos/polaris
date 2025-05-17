/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'export', // Removed for API routes to work
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  // images: {
  //   unoptimized: true, // Removed, Vercel can handle image optimization
  // },
};

module.exports = nextConfig; 