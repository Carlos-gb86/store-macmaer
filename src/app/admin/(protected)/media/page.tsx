import { requireAdminPage } from "@/modules/admin/auth";
import { mediaLibrary } from "@/modules/admin/media";
import { MediaManager } from "@/components/admin/media-picker";
export default async function Media() {
  const { client } = await requireAdminPage();
  return (
    <>
      <h1>Media library</h1>
      <p>
        New images remain private until a product, collection, or homepage using
        them is published. Preview links expire after five minutes.
      </p>
      <MediaManager items={await mediaLibrary(client)} />
    </>
  );
}
