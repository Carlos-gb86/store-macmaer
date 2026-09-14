import Link from "next/link";
import { Container } from "@/components/ui/container";
import { getStorefrontLocale } from "@/modules/i18n/server";
export default async function NotFound() {
  const sv = (await getStorefrontLocale()) === "sv";
  return (
    <Container className="empty-state">
      <p className="eyebrow">{sv ? "En lös tråd" : "A loose thread"}</p>
      <h1>
        {sv ? "Vi kunde inte hitta den sidan." : "We couldn’t find that page."}
      </h1>
      <p>
        {sv
          ? "Det finns fortfarande många fina produkter att upptäcka."
          : "There are still plenty of lovely pieces to discover."}
      </p>
      <Link className="button" href="/shop">
        {sv ? "Utforska kollektionen" : "Explore the collection"}
      </Link>
    </Container>
  );
}
