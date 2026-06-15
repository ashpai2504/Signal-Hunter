import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Signal — Internet Intelligence",
  description:
    "Live tracker of what the internet is saying about Hunter Industries, FX Luminaire, and Lumascape.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
