import Link from "next/link";
import { Container } from "@/components/ui/container";
export default function NotFound() {
  return (
    <Container className="empty-state">
      <p className="eyebrow">A loose thread</p>
      <h1>We couldn’t find that page.</h1>
      <p>There are still plenty of lovely pieces to discover.</p>
      <Link className="button" href="/shop">
        Explore the collection
      </Link>
    </Container>
  );
}
