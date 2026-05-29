import type { Metadata, Viewport } from "next";
import "./globals.css";
import JsonLd from "@/components/JsonLd";
import { orgJsonLd, websiteJsonLd, SITE_ORIGIN } from "@/lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_ORIGIN),
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
  // `appleWebApp` emits the legacy <meta name="apple-mobile-web-app-capable">;
  // modern browsers want the standardized name too (the other is deprecated).
  other: {
    "mobile-web-app-capable": "yes",
  },
  alternates: {
    canonical: SITE_ORIGIN,
  },
  openGraph: {
    title: "Cantila — ship anything, live",
    description:
      "The VPS-powered hosting cloud — apps, sites, and AI agents on real servers, with domain, email, SMS, and database already wired in.",
    siteName: "Cantila",
    type: "website",
    url: SITE_ORIGIN,
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
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0c0e",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Preconnect cuts ~80-150ms off cold font load. Fontshare and
            Google Fonts are still imported via @import in globals.css
            (P1.6 in the audit) — until that migration lands, preconnect
            is the cheapest perf win. */}
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        <JsonLd payload={[orgJsonLd(), websiteJsonLd()]} />
        {children}
      </body>
    </html>
  );
}
