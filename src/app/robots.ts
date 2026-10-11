import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/billing/config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: ["/", "/pricing", "/terms", "/privacy", "/refund"], disallow: ["/api/", "/admin", "/dashboard", "/settings"] }],
    sitemap: `${appUrl()}/sitemap.xml`,
  };
}
