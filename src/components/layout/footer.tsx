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
          <div className="footer-contact">
            <span className="eyebrow">Trader & contact</span>
            <p>
              Maria Botyan · Macmaer
              <br />
              Sole trader · ID 19820627-4345
              <br />
              VAT SE820627434501
              <br />
              Trombongatan 22B
              <br />
              421 51 Västra Frölunda, Sweden
            </p>
            <a href="mailto:info@macmaer.com">info@macmaer.com</a>
            <a href="tel:+46728748756">+46 72 874 87 56</a>
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
