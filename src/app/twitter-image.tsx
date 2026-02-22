import { ImageResponse } from "next/og";
import fs from "node:fs";
import path from "node:path";
import { getTranslation } from "@/lib/translations";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";
export const runtime = "nodejs";

// Footer component for OG images
function Footer() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://ethniafrica.com";
  const domain = siteUrl.replace(/^https?:\/\//, "");

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        fontSize: 22,
        opacity: 0.9,
      }}
    >
      <div>{domain}</div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <div style={{ fontWeight: 900, color: "#FBBF24" }}>BIG</div>
        <div style={{ fontWeight: 900 }}>EMOTION</div>
      </div>
    </div>
  );
}

export default async function TwitterImage() {
  const t = getTranslation("fr");

  // Load africa.png from the local filesystem to avoid build-time fetches.
  let africaSrc: string | undefined = undefined;
  try {
    const filePath = path.join(process.cwd(), "public", "africa.png");
    const buf = fs.readFileSync(filePath);
    africaSrc = `data:image/png;base64,${buf.toString("base64")}`;
  } catch {
    // optional
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 16,
          background:
            "linear-gradient(135deg, #0f172a 0%, #1e293b 35%, #111827 100%)",
          color: "white",
          padding: 48,
        }}
      >
        {africaSrc ? (
          <img
            src={africaSrc}
            alt="Africa"
            style={{
              position: "absolute",
              right: 24,
              bottom: 24,
              width: 260,
              height: 260,
              opacity: 0.15,
            }}
          />
        ) : null}
        <div style={{ fontSize: 64, fontWeight: 800 }}>{t.title}</div>
        <div style={{ fontSize: 28, opacity: 0.9 }}>{t.subtitle}</div>
        <div style={{ marginTop: 24, display: "flex" }}>
          <Footer />
        </div>
      </div>
    ),
    { ...size }
  );
}
