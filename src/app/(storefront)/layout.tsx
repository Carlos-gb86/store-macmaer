import { getServerEnv } from "@/lib/env/server";
import { connection } from "next/server";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { getHomepage } from "@/modules/content/repository";
import { JsonLd } from "@/components/seo/json-ld";
import { siteUrl, socialProfiles } from "@/modules/seo/site";
export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The shared header reads the visitor's cart cookie, so storefront output is
  // request-specific. Stop before any Supabase-backed content is evaluated;
  // production builds must not depend on live database availability.
  await connection();
  const content = await getHomepage();
  return (
    <>
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            "@id": siteUrl("/#organization"),
            name: "Macmaer",
            url: siteUrl(),
            logo: siteUrl("/logo/Logo-macmaer-name.svg"),
            email: "info@macmaer.com",
            sameAs: socialProfiles,
          },
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            "@id": siteUrl("/#website"),
            name: "Macmaer",
            url: siteUrl(),
            publisher: { "@id": siteUrl("/#organization") },
          },
        ]}
      />
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <div className="announcement">
        {getServerEnv().CATALOG_SOURCE === "demo"
          ? "Sample catalogue · Illustrative products & prices · Ordering opens soon"
          : content.announcement}
      </div>
      <Header />
      <main id="main-content">{children}</main>
      <Footer />
    </>
  );
}
