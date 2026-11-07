import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tailwind v4 runs through the Turbopack loader (Next 16 default bundler).
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }],
  },
};

export default nextConfig;
