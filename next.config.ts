import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Authenticated pages are per-user. Cache Components would force a Suspense
  // hole around every database read, so this desk stays on dynamic rendering.
  serverExternalPackages: ["@prisma/client", "bcryptjs", "unpdf", "mammoth", "web-push"],
  experimental: {
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
