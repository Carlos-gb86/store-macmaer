import type { Metadata } from "next";
import { PolicyHeadingPage } from "@/components/policies/policy-heading-page";
import { getStorefrontLocale } from "@/modules/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title:
      (await getStorefrontLocale()) === "sv"
        ? "Moms och tull"
        : "VAT & customs",
    robots: { index: false },
  };
}

export default async function CustomsPage() {
  const swedish = (await getStorefrontLocale()) === "sv";
  return (
    <PolicyHeadingPage title={swedish ? "Moms och tull" : "VAT & customs"} />
  );
}
