"use client";

import { Globe2 } from "lucide-react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { StorefrontLocale } from "@/modules/i18n/config";
import { setStorefrontLocale } from "@/modules/i18n/actions";
import { useStorefrontI18n } from "./storefront-i18n";
import { StorefrontSelect } from "@/components/ui/storefront-select";

export function LanguageSwitcher({ locale }: { locale: StorefrontLocale }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { t } = useStorefrontI18n();
  return (
    <div className="language-switcher" title={t("language")}>
      <Globe2 aria-hidden="true" strokeWidth={1.4} />
      <span className="sr-only">{t("language")}</span>
      <StorefrontSelect
        ariaLabel={t("language")}
        value={locale}
        disabled={pending}
        align="end"
        className="language-select-trigger"
        options={[
          { value: "en", label: "EN", leading: "🇬🇧" },
          { value: "sv", label: "SV", leading: "🇸🇪" },
        ]}
        onValueChange={(value) => {
          startTransition(async () => {
            const result = await setStorefrontLocale(value);
            if (result.ok) router.refresh();
          });
        }}
      />
    </div>
  );
}
