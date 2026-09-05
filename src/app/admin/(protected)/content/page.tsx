import { requireAdminPage } from "@/modules/admin/auth";
import { mediaLibrary } from "@/modules/admin/media";
import { homepageSchema } from "@/modules/content/schema";
import { ContentEditor } from "@/components/admin/content-editor";
export default async function Content() {
  const { client } = await requireAdminPage();
  const [content, products, collections, featured, featuredCollections, media] =
    await Promise.all([
      client.from("homepage_content").select().single(),
      client.from("products").select("id,title").order("title"),
      client.from("collections").select("id,name").order("name"),
      client.from("homepage_products").select().order("sort_order"),
      client.from("homepage_collections").select().order("sort_order"),
      mediaLibrary(client),
    ]);
  for (const result of [
    content,
    products,
    collections,
    featured,
    featuredCollections,
  ])
    if (result.error) throw result.error;
  const initial = homepageSchema.parse({
    ...content.data,
    product_ids: featured.data!.map((p) => p.product_id),
    collection_ids: featuredCollections.data!.map((c) => c.collection_id),
  });
  return (
    <ContentEditor
      initial={initial}
      products={products.data!}
      collections={collections.data!}
      media={media}
    />
  );
}
