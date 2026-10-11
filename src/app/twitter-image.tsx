import { ImageResponse } from "next/og";
import { brand } from "@/lib/brand";

export const alt = `${brand.name}: ${brand.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 80, background: "linear-gradient(135deg, #4f46e5, #6d28d9 55%, #3730a3)", color: "white", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", fontSize: 30, fontWeight: 700, background: "#f5c400", color: "#1e1b4b", padding: "8px 24px", borderRadius: 999, alignSelf: "flex-start" }}>{brand.name}</div>
        <div style={{ display: "flex", fontSize: 76, fontWeight: 800, marginTop: 40, lineHeight: 1.1, maxWidth: 950 }}>{brand.tagline}</div>
        <div style={{ display: "flex", fontSize: 32, marginTop: 30, opacity: 0.85 }}>Target · Resume · Track · Referrals · Interviews · Offer</div>
      </div>
    ),
    size,
  );
}
