import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "**.cjdropshipping.com",
      },
      {
        protocol: "https",
        hostname: "oss-cf.cjdropshipping.com",
      },
      {
        protocol: "https",
        hostname: "cf.cjdropshipping.com",
      },
    ],
  },
};

export default nextConfig;
