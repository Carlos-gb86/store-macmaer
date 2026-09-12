import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { SocialLinks } from "@/components/social/social-links";

export function Footer() {
  return (
    <footer className="site-footer">
      <Container>
        <div className="footer-top">
          <div>
            <Link href="/" className="wordmark" aria-label="Macmaer home">
              <Image
                src="/logo/Logo-macmaer-name.svg"
                alt="Macmaer"
                width={982}
                height={187}
              />
            </Link>
            <p>
              Thoughtfully knotted.
              <br />
              Made to feel at home.
            </p>
          </div>
          <nav aria-label="Footer navigation">
            <span className="eyebrow">Explore</span>
            <Link href="/shop">All pieces</Link>
            <Link href="/collections">Our collections</Link>
            <Link href="/#story">Our story</Link>
            <Link href="/contact">Contact us</Link>
          </nav>
          <nav aria-label="Policies">
            <span className="eyebrow">Policies</span>
            <Link href="/terms">Terms of Sale</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/shipping">Shipping</Link>
            <Link href="/returns">Returns & withdrawal</Link>
            <Link href="/customs">VAT & customs</Link>
          </nav>
          <div className="footer-social">
            <span className="eyebrow">Follow us</span>
            <SocialLinks />
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Macmaer</span>
          <span>Small details. A softer home.</span>
        </div>
      </Container>
    </footer>
  );
}
