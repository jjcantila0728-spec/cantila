/* eslint-disable @next/next/no-img-element */
/*
  Cantila Console — Open Graph image.
  Generated at request time via Next's ImageResponse (Satori).
  Mirrors brand/social/og-default.svg, simplified for Satori's
  supported subset (no SVG filters, no patterns).
  Spec: brand/social/README.md.
*/
import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Cantila — ship anything, live";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: 96,
          background: "#0b0c0e",
          backgroundImage:
            "radial-gradient(ellipse 60% 80% at 50% 0%, rgba(255,106,61,0.18), transparent 70%)",
          color: "#ece9e3",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* lockup — ember crystal on warm-charcoal backplate */}
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: 21,
              background: "#1a1c22",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width={96} height={96} viewBox="0 0 32 32">
              <path d="M16 2.5 L24 11 L8 11 Z" fill="#ff8159" />
              <path d="M8 11 L24 11 L24 21 L8 21 Z" fill="#ff6a3d" />
              <path d="M8 21 L24 21 L16 29.5 Z" fill="#bd4d2b" />
              <path
                d="M16 2.5 L24 11 L24 21 L16 29.5 L8 21 L8 11 Z"
                fill="none"
                stroke="#1a0e08"
                strokeWidth="0.6"
                strokeLinejoin="round"
              />
              <line
                x1="16"
                y1="2.5"
                x2="16"
                y2="29.5"
                stroke="#1a0e08"
                strokeWidth="0.35"
                opacity="0.5"
              />
            </svg>
          </div>
          <div
            style={{
              fontSize: 64,
              fontWeight: 600,
              letterSpacing: "-0.02em",
              color: "#ece9e3",
            }}
          >
            cantila
          </div>
        </div>

        {/* headlines */}
        <div
          style={{
            marginTop: 100,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              fontSize: 92,
              fontWeight: 600,
              letterSpacing: "-0.02em",
              color: "#ece9e3",
              lineHeight: 1.05,
            }}
          >
            Ship anything, live.
          </div>
          <div
            style={{
              fontSize: 92,
              fontWeight: 600,
              letterSpacing: "-0.02em",
              color: "#ff6a3d",
              lineHeight: 1.05,
            }}
          >
            From one chat.
          </div>
        </div>

        {/* subline */}
        <div
          style={{
            marginTop: 36,
            fontSize: 28,
            color: "#9a9ca6",
            lineHeight: 1.4,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div>The VPS-powered hosting cloud — apps, sites, and AI agents on real servers,</div>
          <div>with domain, email, SMS, and database already wired in.</div>
        </div>

        {/* corner mark */}
        <div
          style={{
            position: "absolute",
            bottom: 48,
            right: 96,
            fontFamily: "monospace",
            fontSize: 14,
            letterSpacing: "0.14em",
            color: "#5f626c",
          }}
        >
          CANTILA.APP
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
