import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { SocialLinks } from "@/components/social/social-links";
import type { StorefrontLocale } from "@/modules/i18n/config";
import { storefrontMessages } from "@/modules/i18n/messages";

export function Footer({ locale }: { locale: StorefrontLocale }) {
  const t = storefrontMessages[locale];
  return (
    <footer className="site-footer">
      <Container>
        <div className="footer-top">
          <div>
            <Link href="/" className="wordmark" aria-label={t.macmaerHome}>
              <Image
                src="/logo/Logo-macmaer-name.svg"
                alt="Macmaer"
                width={982}
                height={187}
              />
            </Link>
            <p>
              {t.footerTaglineOne}
              <br />
              {t.footerTaglineTwo}
            </p>
          </div>
          <nav
            aria-label={locale === "sv" ? "Sidfotsmeny" : "Footer navigation"}
          >
            <span className="eyebrow">{t.explore}</span>
            <Link href="/shop">{t.allPieces}</Link>
            <Link href="/collections">{t.ourCollections}</Link>
            <Link href="/about">{t.aboutUs}</Link>
            <Link href="/contact">{t.contactUs}</Link>
          </nav>
          <nav aria-label={t.policies}>
            <span className="eyebrow">{t.policies}</span>
            <Link href="/terms">{t.terms}</Link>
            <Link href="/privacy">{t.privacy}</Link>
            <Link href="/shipping">{t.shipping}</Link>
            <Link href="/returns">{t.returnsWithdrawal}</Link>
            <Link href="/customs">{t.vatCustoms}</Link>
          </nav>
          <div className="footer-social">
            <span className="eyebrow">{t.followUs}</span>
            <SocialLinks locale={locale} />
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Macmaer</span>
          <span>{t.footerClosing}</span>
        </div>
      </Container>
    </footer>
  );
}
