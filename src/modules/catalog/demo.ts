import fixture from "./fixtures/catalogue.json";
import { catalogueSchema } from "./schema";
export function getDemoCatalogue() {
  const data = catalogueSchema.parse(fixture);
  return {
    collections: data.collections.filter((collection) => collection.active),
    products: data.products.filter((product) => product.status === "active"),
  };
}
