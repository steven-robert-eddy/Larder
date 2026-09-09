import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    serverActions: {
      // Default is 1MB — the photo-import action (src/app/(app)/import/photo)
      // accepts up to 6 screenshots, so needs real headroom.
      bodySizeLimit: "24mb",
    },
  },
};

export default nextConfig;
