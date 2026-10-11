import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/billing/config";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = appUrl();
  return ["", "/pricing", "/register", "/terms", "/privacy", "/refund"].map((path) => ({
    url: `${base}${path}`,
    changeFrequency: "weekly",
    priority: path === "" ? 1 : 0.6,
  }));
}
