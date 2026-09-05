import type { Metadata } from "next";
import { getServerEnv } from "@/lib/env/server";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "Macmaer — A softer kind of home",
    template: "%s | Macmaer",
  },
  description:
    "Sculptural knot pillows and thoughtful accessories, handmade in Sweden.",
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const demo = getServerEnv().CATALOG_SOURCE === "demo";
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <div className="announcement">
          {demo
            ? "Sample catalogue · Illustrative products & prices · Ordering opens soon"
            : "A little handmade warmth, from Sweden to your home"}
        </div>
        <Header />
        <main id="main-content">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
