import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kasparas Sleikus",
  description: "Scroll-driven cinematic portfolio story",
  icons: {
    icon: "/elements/baltas_ks.svg",
    shortcut: "/elements/baltas_ks.svg"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
