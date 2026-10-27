import { ImageResponse } from "next/og";
import { LIME, Mark, NIGHT, ogFonts } from "@/lib/brand";

export const alt = "Grant Hunter: an AI agent that finds grants, bounties and hackathons for you";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const TITLE = "Stop scrolling for grants.";
const ITALIC = "Let them find you.";
const KINDS = "Grants · Bounties · Hackathons · Contests";

export default async function OpengraphImage() {
  const fonts = await ogFonts(`Grant Hunter ${TITLE} ${KINDS}`, ITALIC);
  const rings = [560, 420, 280, 140];
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: NIGHT, color: "#0c111b", position: "relative", fontFamily: "Display" }}>
        {rings.map((d) => (
          <div key={d} style={{ position: "absolute", left: 900 - d / 2, top: 315 - d / 2, width: d, height: d, borderRadius: d, border: `1.5px solid rgba(12,17,27,${0.08 + (560 - d) / 2400})` }} />
        ))}
        <div style={{ position: "absolute", left: 900, top: 35, width: 1.5, height: 560, background: "rgba(12,17,27,0.08)" }} />
        <div style={{ position: "absolute", left: 620, top: 315, width: 560, height: 1.5, background: "rgba(12,17,27,0.08)" }} />
        <svg width="1200" height="630" viewBox="0 0 1200 630" style={{ position: "absolute", left: 0, top: 0 }}>
          <defs>
            <linearGradient id="beam" x1="900" y1="315" x2="1150" y2="160" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor={LIME} stopOpacity="0.45" />
              <stop offset="1" stopColor={LIME} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M900 315 L1137 167 A280 280 0 0 1 1176 280 Z" fill="url(#beam)" />
          <line x1="900" y1="315" x2="1137" y2="167" stroke={LIME} strokeWidth="2.5" strokeLinecap="round" />
        </svg>
        {[[1020, 200], [770, 420], [1080, 400], [820, 190]].map(([x, y], i) => (
          <div key={i} style={{ position: "absolute", left: x - 6, top: y - 6, width: 12, height: 12, borderRadius: 12, background: LIME, boxShadow: `0 0 24px ${LIME}` }} />
        ))}
        <div style={{ position: "absolute", left: 860, top: 275, width: 80, height: 80, borderRadius: 22, background: LIME, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 60px rgba(12,17,27,0.55)" }}>
          <Mark size={46} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "64px 72px", width: 720 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: LIME, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Mark size={32} />
            </div>
            <div style={{ fontSize: 34, fontWeight: 700 }}>Grant Hunter</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1, letterSpacing: -2 }}>{TITLE}</div>
            <div style={{ fontSize: 88, fontFamily: "Serif", fontStyle: "italic", color: LIME, lineHeight: 1.1, marginTop: 8 }}>{ITALIC}</div>
          </div>
          <div style={{ fontSize: 24, color: "rgba(12,17,27,0.55)" }}>{KINDS}</div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
