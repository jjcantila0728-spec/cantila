import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cantila Console — ship anything, live",
  description:
    "The unified control surface for the Cantila hosting cloud. Deploy sites, apps, and AI agents from one chat — domain, database, email and SMS already wired in.",
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
