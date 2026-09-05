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
          <div>
            <span className="eyebrow">A little everyday softness</span>
            <p>
              Scandinavian decor.
              <br />
              Handmade in Sweden.
            </p>
            <p className="small">Catalogue preview. Ordering opens soon.</p>
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
