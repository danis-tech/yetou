import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: undefined,
  devIndicators: false,
  typescript: { ignoreBuildErrors: true },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
