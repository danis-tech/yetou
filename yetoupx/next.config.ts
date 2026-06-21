import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Force webpack (Turbopack not supported on this platform)
  turbopack: undefined,
};

export default nextConfig;
