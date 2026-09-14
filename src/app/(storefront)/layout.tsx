import { getServerEnv } from "@/lib/env/server";
import { connection } from "next/server";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { getHomepage } from "@/modules/content/repository";
import { JsonLd } from "@/components/seo/json-ld";
import { siteUrl, socialProfiles } from "@/modules/seo/site";
import { getStorefrontLocale } from "@/modules/i18n/server";
import { storefrontMessages } from "@/modules/i18n/messages";
import { StorefrontI18nProvider } from "@/components/i18n/storefront-i18n";
import { localizeHomepage } from "@/modules/i18n/localize";
export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The shared header reads the visitor's cart cookie, so storefront output is
  // request-specific. Stop before any Supabase-backed content is evaluated;
  // production builds must not depend on live database availability.
  await connection();
  const locale = await getStorefrontLocale();
  const content = localizeHomepage(await getHomepage(), locale);
  const t = storefrontMessages[locale];
  return (
    <StorefrontI18nProvider locale={locale}>
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
        {t.skipToContent}
      </a>
      <div className="announcement">
        {getServerEnv().CATALOG_SOURCE === "demo"
          ? t.sampleAnnouncement
          : content.announcement}
      </div>
      <div lang={locale === "sv" ? "sv-SE" : "en"}>
        <Header locale={locale} />
        <main id="main-content">{children}</main>
        <Footer locale={locale} />
      </div>
    </StorefrontI18nProvider>
  );
}
