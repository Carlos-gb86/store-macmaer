import Link from "next/link";
import { Container } from "@/components/ui/container";
export function Footer() {
  return (
    <footer className="site-footer">
      <Container>
        <div className="footer-top">
          <div>
            <Link href="/" className="wordmark">
              macmaer
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
          </nav>
          <nav aria-label="Policies">
            <span className="eyebrow">Policies</span>
            <Link href="/terms">Terms of Sale</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/shipping">Shipping</Link>
            <Link href="/returns">Returns & withdrawal</Link>
            <Link href="/customs">VAT & customs</Link>
          </nav>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Macmaer</span>
          <span>Small details. A softer home.</span>
        </div>
      </Container>
    </footer>
  );
}
