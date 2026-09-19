import type { Metadata } from "next";
import { PolicyHeadingPage } from "@/components/policies/policy-heading-page";
import { getStorefrontLocale } from "@/modules/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title:
      (await getStorefrontLocale()) === "sv" ? "Integritetspolicy" : "Privacy",
    robots: { index: false },
  };
}

export default async function PrivacyPage() {
  const swedish = (await getStorefrontLocale()) === "sv";
  return (
    <PolicyHeadingPage title={swedish ? "Integritetspolicy" : "Privacy"} />
  );
}
