import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "trove-us.vercel.app" }],
        destination: "https://trove-us.com/:path*",
        permanent: true,
      },
    ];
  },
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
