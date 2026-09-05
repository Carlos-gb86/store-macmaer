import { ProductEditor } from "@/components/admin/product-editor";
import { editorData } from "@/modules/admin/queries";
import { newProduct } from "@/modules/admin/schema";
export default async function NewProduct() {
  return <ProductEditor initial={newProduct()} {...await editorData()} />;
}
