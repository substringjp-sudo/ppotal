import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === 'production';

const nextConfig: NextConfig = {
  output: isProd ? 'export' : undefined,
  trailingSlash: true,
  images: { unoptimized: true },
  transpilePackages: ["@pplaner/shared"],
  experimental: {
    turbopackUseSystemTlsCerts: true,
  },
  turbopack: {
    root: "../../",
  },
};

export default nextConfig;
