/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    const api = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    return [
      {
        source: "/api/:path*",
        destination: `${api.replace(/\/$/, "")}/api/:path*`,
      },
    ];
  },
};
module.exports = nextConfig;
