import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { MiniCart } from "@/components/cart/mini-cart";
import { getMiniCart } from "@/modules/cart/repository";
import type { StorefrontLocale } from "@/modules/i18n/config";
import { storefrontMessages } from "@/modules/i18n/messages";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";

export async function Header({ locale }: { locale: StorefrontLocale }) {
  const cart = await getMiniCart();
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
          <Link href="/collections">{t.collections}</Link>
          <Link href="/about">{t.aboutUs}</Link>
          <Link href="/contact">{t.contact}</Link>
        </nav>
        <div className="header-tools">
          <LanguageSwitcher locale={locale} />
          <MiniCart initialCart={cart} />
        </div>
      </Container>
    </header>
  );
}
