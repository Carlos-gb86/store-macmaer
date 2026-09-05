import { notFound } from "next/navigation";
import { CollectionEditor } from "@/components/admin/collection-editor";
import { requireAdminPage } from "@/modules/admin/auth";
import { mediaLibrary } from "@/modules/admin/media";
import { collectionSchema } from "@/modules/catalog/schema";
export default async function CollectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { client } = await requireAdminPage(),
    { id } = await params;
  let initial;
  if (id === "new")
    initial = collectionSchema.parse({
      id: crypto.randomUUID(),
      name: "",
      slug: "",
      description: "",
      image_path: null,
      image_alt: "",
      active: false,
      sort_order: 0,
      seo_title: null,
      seo_description: null,
    });
  else {
    const { data, error } = await client
      .from("collections")
      .select()
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (!data) notFound();
    initial = collectionSchema.parse(data);
  }
  return (
    <CollectionEditor
      key={id}
      initial={initial}
      media={await mediaLibrary(client)}
    />
  );
}
