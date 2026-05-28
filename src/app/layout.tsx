import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cantila Console — ship anything, live",
  description:
    "The unified control surface for the Cantila hosting cloud. Deploy sites, apps, and AI agents from one chat — domain, database, email and SMS already wired in.",
  applicationName: "Cantila",
  manifest: "/brand/favicons/manifest.webmanifest",
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
  },
  twitter: {
    card: "summary_large_image",
    title: "Cantila — ship anything, live",
    description:
      "Ship anything, live — from one chat. The VPS-powered hosting cloud with domain, email, SMS, and database already wired in.",
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
