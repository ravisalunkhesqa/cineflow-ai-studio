/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@cineflow/shared"],
  async rewrites() {
    const apiBase = process.env.API_BASE_URL ?? "http://localhost:4000";
    return [{ source: "/api/backend/:path*", destination: `${apiBase}/api/:path*` }];
  },
};

export default nextConfig;
