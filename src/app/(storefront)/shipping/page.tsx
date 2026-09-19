import type { Metadata } from "next";
import { PolicyHeadingPage } from "@/components/policies/policy-heading-page";
import { getStorefrontLocale } from "@/modules/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: (await getStorefrontLocale()) === "sv" ? "Leverans" : "Shipping",
    robots: { index: false },
  };
}

export default async function ShippingPage() {
  const swedish = (await getStorefrontLocale()) === "sv";
  return <PolicyHeadingPage title={swedish ? "Leverans" : "Shipping"} />;
}
