import type { Metadata } from "next";
import { getServerEnv } from "@/lib/env/server";
import "./globals.css";
export function generateMetadata(): Metadata {
  const env = getServerEnv();
  const description =
    "Sculptural knot pillows and thoughtful accessories, handmade in Sweden.";
  return {
    metadataBase: new URL(env.NEXT_PUBLIC_SITE_URL),
    title: {
      default: "Macmaer — A softer kind of home",
      template: "%s | Macmaer",
    },
    description,
    applicationName: "Macmaer",
    icons: { icon: "/logo/macmaer.ico" },
    openGraph: {
      type: "website",
      siteName: "Macmaer",
      title: "Macmaer — A softer kind of home",
      description,
      images: [
        {
          url: "/images/catalogue/story.jpg",
          alt: "Macmaer handmade knot pillows",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "Macmaer — A softer kind of home",
      description,
      images: ["/images/catalogue/story.jpg"],
    },
    robots: env.SEO_INDEXING_ENABLED
      ? { index: true, follow: true }
      : { index: false, follow: false },
  };
}
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
