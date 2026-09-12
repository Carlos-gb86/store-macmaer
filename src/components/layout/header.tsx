import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { StoreContextSelectors } from "./store-context-selectors";
import { getStorefrontContext } from "@/modules/currency/repository";
import { getCartCount } from "@/modules/cart/repository";
import { countries } from "@/modules/country/countries";

export async function Header() {
  const [context, cartCount] = await Promise.all([
    getStorefrontContext(),
    getCartCount(),
  ]);
  return (
    <header className="site-header">
      <Container className="header-inner">
        <Link href="/" className="wordmark" aria-label="Macmaer home">
          <Image
            src="/logo/Logo-macmaer-name.svg"
            alt="Macmaer — handmade in Sweden"
            width={982}
            height={187}
            priority
          />
        </Link>
        <nav aria-label="Main navigation" className="main-nav">
          <Link href="/shop">Shop all</Link>
          <Link href="/collections">Collections</Link>
          <Link href="/#story">Our story</Link>
        </nav>
        <div className="header-tools">
          <StoreContextSelectors
            currency={context.pricing.currency}
            currencies={context.settings.map((setting) => ({
              code: setting.code,
              available: context.pricing.availableCurrencies.includes(
                setting.code,
              ),
            }))}
            destination={context.destinationCountry}
            currencyNotice={context.pricing.unavailableReason}
            countries={countries.filter((country) =>
              context.supportedCountries.includes(country.code),
            )}
          />
          <Link
            className="header-search"
            href="/shop#catalogue-search"
            aria-label="Search the catalogue"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              aria-hidden="true"
            >
              <circle cx="10.5" cy="10.5" r="6.5" />
              <path d="m16 16 5 5" />
            </svg>
          </Link>
          <Link
            className="header-cart"
            href="/cart"
            aria-label={`Cart, ${cartCount} items`}
          >
            Cart <span>{cartCount}</span>
          </Link>
        </div>
      </Container>
    </header>
  );
}
