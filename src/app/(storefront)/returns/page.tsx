import type { Metadata } from "next";
import { PolicyHeadingPage } from "@/components/policies/policy-heading-page";
import { getStorefrontLocale } from "@/modules/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title:
      (await getStorefrontLocale()) === "sv"
        ? "Returer och ångerrätt"
        : "Returns & withdrawal",
    robots: { index: false },
  };
}

export default async function ReturnsPage() {
  const swedish = (await getStorefrontLocale()) === "sv";
  return (
    <PolicyHeadingPage
      title={swedish ? "Returer och ångerrätt" : "Returns & withdrawal"}
    />
  );
}
