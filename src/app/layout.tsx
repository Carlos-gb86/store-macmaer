import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "Macmaer — A softer kind of home",
    template: "%s | Macmaer",
  },
  description:
    "Sculptural knot pillows and thoughtful accessories, handmade in Sweden.",
  icons: { icon: "/logo/macmaer.ico" },
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
