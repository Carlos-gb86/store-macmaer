import "server-only";
import { requireAdminPage } from "./auth";
import { mediaLibrary } from "./media";
import { productSchema } from "@/modules/catalog/schema";
import { notFound } from "next/navigation";
export async function editorData() {
  const { client } = await requireAdminPage();
  const [collections, tags, media] = await Promise.all([
    client.from("collections").select("id,slug,name").order("name"),
    client.from("tags").select("id,slug,name,updated_at").order("name"),
    mediaLibrary(client),
  ]);
  if (collections.error) throw collections.error;
  if (tags.error) throw tags.error;
  return { collections: collections.data, tags: tags.data, media };
}
export async function adminProduct(id: string) {
  const { client } = await requireAdminPage();
  const { data, error } = await client
    .from("catalogue_products")
    .select("document")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) notFound();
  return productSchema.parse(data.document);
}
export type SearchParams = Promise<
  Record<string, string | string[] | undefined>
>;
export function searchInput(
  params: Record<string, string | string[] | undefined>,
) {
  return {
    q:
      typeof params.q === "string"
        ? params.q.replaceAll(/[^\p{L}\p{N}\s-]/gu, "").slice(0, 100)
        : "",
    page: Math.max(1, Math.min(100000, Number(params.page) || 1)),
    status: typeof params.status === "string" ? params.status : "",
  };
}
