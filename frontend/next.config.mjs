/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  serverActions: {
    bodySizeLimit: "5mb",
  },
  async rewrites() {
    return [
      {
        source: "/api-proxy/:path*",
        destination: `${process.env.INTERNAL_API_URL || "http://localhost:8000"}/:path*`,
      },
    ];
  },
};

export default nextConfig;
