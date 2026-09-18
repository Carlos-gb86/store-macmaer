import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { MiniCart } from "@/components/cart/mini-cart";
import { getMiniCart } from "@/modules/cart/repository";
import type { StorefrontLocale } from "@/modules/i18n/config";
import { storefrontMessages } from "@/modules/i18n/messages";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { getCatalogue } from "@/modules/catalog/repository";
import { localizeCollection } from "@/modules/i18n/localize";
import { CollectionNavigation } from "./collection-navigation";
import { MobileNavigation } from "./mobile-navigation";

const fallbackCollections = {
  en: [
    ["boucle", "Bouclé"],
    ["velvet", "Velvet"],
    ["velour", "Velour"],
    ["limited-edition", "Limited Edition"],
  ],
  sv: [
    ["boucle", "Bouclé"],
    ["velvet", "Sammet"],
    ["velour", "Velour"],
    ["limited-edition", "Begränsad upplaga"],
  ],
} satisfies Record<StorefrontLocale, [string, string][]>;

async function getNavigationCollections(locale: StorefrontLocale) {
  try {
    const catalogue = await getCatalogue();
    return catalogue.collections
      .filter(
        (collection) => collection.kind === "collection" && collection.active,
      )
      .sort((a, b) => a.sort_order - b.sort_order)
      .slice(0, 4)
      .map((collection) => {
        const localized = localizeCollection(collection, locale);
        return { slug: localized.slug, name: localized.name };
      });
  } catch {
    console.error(JSON.stringify({ event: "header_collections_read_failed" }));
    return fallbackCollections[locale].map(([slug, name]) => ({ slug, name }));
  }
}

export async function Header({ locale }: { locale: StorefrontLocale }) {
  const [cart, collections] = await Promise.all([
    getMiniCart(),
    getNavigationCollections(locale),
  ]);
  const t = storefrontMessages[locale];
  return (
    <header className="site-header">
      <Container className="header-inner">
        <Link href="/" className="wordmark" aria-label={t.macmaerHome}>
          <Image
            src="/logo/Logo-macmaer-name.svg"
            alt={t.handmadeInSweden}
            width={982}
            height={187}
            loading="eager"
          />
        </Link>
        <nav aria-label={t.navLabel} className="main-nav">
          <Link href="/shop">{t.shopAll}</Link>
          <CollectionNavigation
            label={t.collections}
            collections={collections}
          />
          <Link href="/about">{t.aboutUs}</Link>
          <Link href="/contact">{t.contact}</Link>
        </nav>
        <div className="header-tools">
          <LanguageSwitcher locale={locale} />
          <MiniCart initialCart={cart} />
          <MobileNavigation
            collections={collections}
            initialCartCount={cart.itemCount}
            labels={{
              navigation: t.navLabel,
              open: t.openMenu,
              close: t.closeMenu,
              shop: t.shopAll,
              collections: t.collections,
              allCollections: t.allCollections,
              about: t.aboutUs,
              contact: t.contact,
              cart: t.cart,
            }}
          />
        </div>
      </Container>
    </header>
  );
}
