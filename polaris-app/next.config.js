/** @type {import('next').NextConfig} */
const nextConfig = {
  headers: async () => {
    return [
      {
        // Apply cache headers to map tile requests
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig; 