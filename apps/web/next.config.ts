import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@regionevel/types", "@regionevel/utils"],
};

export default nextConfig;
