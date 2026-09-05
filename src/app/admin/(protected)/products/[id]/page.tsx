import { ProductEditor } from "@/components/admin/product-editor";
import { editorData, adminProduct } from "@/modules/admin/queries";
import { productInput } from "@/modules/admin/schema";
export default async function EditProduct({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [p, data] = await Promise.all([adminProduct(id), editorData()]);
  return <ProductEditor key={id} initial={productInput(p)} {...data} />;
}
