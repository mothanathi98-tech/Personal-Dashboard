import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Command Centre", robots: { index: false, follow: false } };
export const viewport: Viewport = { themeColor: "#202322", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
