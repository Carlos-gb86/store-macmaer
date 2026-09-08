import { adminProduct } from "@/modules/admin/queries";
import { requireAdminPage } from "@/modules/admin/auth";
import { ProductGallery } from "@/components/catalog/product-gallery";
import { ProductConfigurator } from "@/components/catalog/product-configurator";
import { RichText } from "@/components/content/rich-text";
export default async function Preview({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { client } = await requireAdminPage();
  const p = await adminProduct((await params).id);
  p.images = await Promise.all(
    p.images.map(async (i) => {
      if (!i.asset_id) return i;
      const { data: a } = await client
        .from("media_assets")
        .select("private_path")
        .eq("id", i.asset_id)
        .single();
      if (!a) return i;
      const { data } = await client.storage
        .from("catalogue-drafts")
        .createSignedUrl(a.private_path, 300);
      return { ...i, resolved_src: data?.signedUrl, private: true };
    }),
  );
  p.options = await Promise.all(
    p.options.map(async (option) => ({
      ...option,
      values: await Promise.all(
        option.values.map(async (value) => {
          if (!value.asset_id) return value;
          const { data: asset } = await client
            .from("media_assets")
            .select("private_path")
            .eq("id", value.asset_id)
            .single();
          if (!asset) return value;
          const { data } = await client.storage
            .from("catalogue-drafts")
            .createSignedUrl(asset.private_path, 300);
          return { ...value, resolved_src: data?.signedUrl, private: true };
        }),
      ),
    })),
  );
  return (
    <>
      <p>
        Private preview · {p.status} · saved version · image links expire after
        five minutes.
      </p>
      <div className="product-detail">
        <ProductGallery images={p.images} />
        <div>
          <h1>{p.title}</h1>
          <p>{p.short_description}</p>
          <RichText
            document={p.description_document}
            fallback={p.description}
          />
          <ProductConfigurator
            product={p}
            pricing={{
              currency: "SEK",
              rate: null,
              markupBasisPoints: 0,
              roundingIncrementMinor: 1,
            }}
            commerceEnabled={false}
          />
        </div>
      </div>
    </>
  );
}
