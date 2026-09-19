import Image from "next/image";
import type { Metadata } from "next";
import { getStorefrontLocale } from "@/modules/i18n/server";

export const metadata: Metadata = {
  title: "Available soon",
  robots: { index: false, follow: false },
};

export default async function UnderConstructionPage() {
  const swedish = (await getStorefrontLocale()) === "sv";
  return (
    <main className="under-construction-page">
      <div className="under-construction-image">
        <Image
          src="/images/about/boucle-white.webp"
          alt={
            swedish ? "Vit bouclékudde med knut" : "White bouclé knot pillow"
          }
          fill
          priority
          sizes="(max-width: 600px) 72vw, 390px"
        />
      </div>
      <h1>
        {swedish
          ? "Sidan kommer snart att vara tillgänglig."
          : "The page will be available soon."}
      </h1>
    </main>
  );
}
