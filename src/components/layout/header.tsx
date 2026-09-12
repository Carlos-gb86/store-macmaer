import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { MiniCart } from "@/components/cart/mini-cart";
import { getMiniCart } from "@/modules/cart/repository";

export async function Header() {
  const cart = await getMiniCart();
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
          <Link href="/contact">Contact</Link>
        </nav>
        <div className="header-tools">
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
          <MiniCart initialCart={cart} />
        </div>
      </Container>
    </header>
  );
}
