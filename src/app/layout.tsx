import type { Metadata, Viewport } from "next";
import "./globals.css";

const PUBLIC_HOST = process.env.CANTILA_PUBLIC_HOST ?? "cantila.app";
const SITE_URL =
  process.env.NODE_ENV === "production"
    ? `https://${PUBLIC_HOST}`
    : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Cantila — ship anything, live, from one chat",
    template: "%s · Cantila",
  },
  description:
    "The VPS-powered hosting cloud where websites, apps, and AI agents ship from a single chat — with the domain, email, SMS, and database already wired in.",
  applicationName: "Cantila",
  manifest: "/brand/favicons/manifest.webmanifest",
  icons: {
    icon: [{ url: "/brand/favicons/favicon.svg", type: "image/svg+xml" }],
    shortcut: "/brand/favicons/favicon.svg",
  },
  appleWebApp: {
    title: "Cantila",
    statusBarStyle: "black-translucent",
  },
  openGraph: {
    title: "Cantila — ship anything, live",
    description:
      "The VPS-powered hosting cloud — apps, sites, and AI agents on real servers, with domain, email, SMS, and database already wired in.",
    siteName: "Cantila",
    type: "website",
    url: SITE_URL,
    images: [
      {
        url: "/brand/social/og-default.svg",
        width: 1200,
        height: 630,
        alt: "Cantila — ship anything, live",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Cantila — ship anything, live",
    description:
      "Ship anything, live — from one chat. The VPS-powered hosting cloud with domain, email, SMS, and database already wired in.",
    images: ["/brand/social/og-default.svg"],
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0c0e",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
