import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { Catalogue } from "@/components/catalog/catalogue";
import { getCatalogue } from "@/modules/catalog/repository";
import type { SearchParams } from "@/modules/catalog/query";
import { getStorefrontContext } from "@/modules/currency/repository";
import { getStorefrontLocale } from "@/modules/i18n/server";
import { storefrontMessages } from "@/modules/i18n/messages";
import { localizeCatalogue } from "@/modules/i18n/localize";
import { getProductReviewSummaries } from "@/modules/reviews/repository";
export async function generateMetadata(): Promise<Metadata> {
  const sv = (await getStorefrontLocale()) === "sv";
  return {
    title: sv ? "Alla produkter" : "All pieces",
    description: sv
      ? "Utforska Macmaers kollektion av handgjorda knutkuddar och accessoarer."
      : "Explore Macmaer's collection of handmade knot pillows and accessories.",
    alternates: { canonical: "/shop" },
  };
}
export default async function Shop({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const [rawData, params, context, locale, reviewSummaries] = await Promise.all(
    [
      getCatalogue(),
      searchParams,
      getStorefrontContext(),
      getStorefrontLocale(),
      getProductReviewSummaries(),
    ],
  );
  const data = localizeCatalogue(rawData, locale);
  const t = storefrontMessages[locale];
  return (
    <Container className="page-section">
      <div className="page-intro">
        <p className="eyebrow">{t.shopEyebrow}</p>
        <h1>{t.shopTitle}</h1>
        <p>{t.shopIntro}</p>
      </div>
      <Catalogue
        data={data}
        params={params}
        pricing={context.pricing}
        locale={locale}
        reviewSummaries={reviewSummaries}
      />
    </Container>
  );
}
