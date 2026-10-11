import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import { brand } from "@/lib/brand";
import { RegisterSw } from "@/components/pwa";
import { CookieNotice } from "@/components/cookie-notice";
import { appUrl } from "@/lib/billing/config";
import "./globals.css";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

export const metadata: Metadata = {
  metadataBase: new URL(appUrl()),
  keywords: ["job search", "AI resume", "ATS resume", "cover letter", "interview practice", "salary negotiation", "job tracker"],
  openGraph: {
    type: "website",
    siteName: brand.name,
    title: `${brand.name}: ${brand.tagline}`,
    description: brand.description,
    url: "/",
  },
  twitter: { card: "summary_large_image", title: brand.name, description: brand.description },
  alternates: { canonical: "/" },
  title: { default: brand.name, template: `%s · ${brand.shortName}` },
  description: brand.description,
  applicationName: brand.name,
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: brand.shortName, statusBarStyle: "default" },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${outfit.variable} h-full`}>
      <body className="min-h-full antialiased">
        <RegisterSw />
        {children}
        <CookieNotice />
      </body>
    </html>
  );
}
