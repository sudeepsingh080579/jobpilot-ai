import type { NextConfig } from "next";
import { securityHeaders } from "./src/lib/security-headers";

const nextConfig: NextConfig = {
  // Authenticated pages are per-user. Cache Components would force a Suspense
  // hole around every database read, so this desk stays on dynamic rendering.
  serverExternalPackages: ["@prisma/client", "bcryptjs", "unpdf", "mammoth", "web-push", "stripe", "nodemailer"],
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders() }];
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
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
