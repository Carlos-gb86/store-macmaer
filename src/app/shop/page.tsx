import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { Catalogue } from "@/components/catalog/catalogue";
import { getCatalogue } from "@/modules/catalog/repository";
import type { SearchParams } from "@/modules/catalog/query";
export const metadata: Metadata = {
  title: "All pieces",
  description:
    "Explore Macmaer's collection of handmade knot pillows and accessories.",
};
export default async function Shop({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const [data, params] = await Promise.all([getCatalogue(), searchParams]);
  return (
    <Container className="page-section">
      <div className="page-intro">
        <p className="eyebrow">The Macmaer collection</p>
        <h1>Find your soft spot.</h1>
        <p>
          Sculptural pillows and thoughtful little details, made to bring a room
          together.
        </p>
      </div>
      <Catalogue data={data} params={params} />
    </Container>
  );
}
