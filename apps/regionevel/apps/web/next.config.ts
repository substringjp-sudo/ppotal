import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@regionevel/types", "@regionevel/utils", "@regionevel/data-store", "@ppotal/ui"],
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
