/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        // This will apply the headers to all routes under /api
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          // For development, '*' is fine. For production, replace with your frontend's domain.
          { key: "Access-Control-Allow-Origin", value: process.env.NODE_ENV === 'production' ? 'https://your-production-frontend.com' : 'http://localhost:3001' },
          { key: "Access-Control-Allow-Methods", value: "GET,DELETE,PATCH,POST,PUT" },
          { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-api-key" },
        ],
      },
    ];
  },
};

export default nextConfig;