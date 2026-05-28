/* ============================================================
   Web app manifest — lets the Console install as a standalone
   app and gives the browser a consistent name, theme colour and
   icon. Next.js serves this at /manifest.webmanifest and wires
   the <link rel="manifest"> tag automatically.
   ============================================================ */

import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Cantila Console",
    short_name: "Cantila",
    description:
      "The unified control surface for the Cantila hosting cloud — ship sites, apps and AI agents from one chat.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#0b0c0e",
    theme_color: "#0b0c0e",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
