import { notFound } from "next/navigation";
import { TagEditor } from "@/components/admin/tag-editor";
import { requireAdminPage } from "@/modules/admin/auth";
export default async function TagPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { client } = await requireAdminPage(),
    { id } = await params;
  const { data: targets, error } = await client
    .from("tags")
    .select()
    .order("name");
  if (error) throw error;
  const initial =
    id === "new"
      ? { id: crypto.randomUUID(), name: "", slug: "" }
      : targets.find((t) => t.id === id);
  if (!initial) notFound();
  return <TagEditor key={id} initial={initial} targets={targets} />;
}
