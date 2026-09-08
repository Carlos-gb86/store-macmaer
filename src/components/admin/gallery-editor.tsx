"use client";
/* eslint-disable @next/next/no-img-element -- Private previews bypass public optimisation. */
import { useState } from "react";
import {
  ImagePlus,
  Trash2,
  GripVertical,
  Image as ImageIcon,
} from "lucide-react";
import type { ProductInput } from "@/modules/admin/schema";
import type { MediaItem } from "@/modules/admin/media";
import { resolveImage } from "@/modules/media/resolve-image";
import { MediaUpload, ImageLibraryDialog } from "./media-picker";
import { Field, OrderButtons, move } from "./fields";
type GalleryImage = ProductInput["images"][number];
export function GalleryEditor({
  images,
  variants,
  media,
  onChange,
}: {
  images: GalleryImage[];
  variants: ProductInput["variants"];
  media: MediaItem[];
  onChange: (
    images: GalleryImage[] | ((current: GalleryImage[]) => GalleryImage[]),
  ) => void;
}) {
  const [choosing, setChoosing] = useState(false),
    [uploaded, setUploaded] = useState<MediaItem[]>([]);
  const all = [...media, ...uploaded];
  const add = (item: MediaItem) => {
    setUploaded((items) => [...items, item]);
    onChange((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        asset_id: item.id,
        path: item.private_path,
        alt: "",
        width: item.width!,
        height: item.height!,
        is_primary: !current.length,
        sort_order: current.length,
        variant_id: null,
      },
    ]);
  };
  return (
    <fieldset id="product-gallery">
      <legend>Product images</legend>
      <p className="section-intro">
        Upload photos or choose from your library. The primary image appears in
        the shop. Drag the grip or use the arrows to change the order.
      </p>
      <MediaUpload onUploaded={add} />
      <button
        type="button"
        className="secondary"
        onClick={() => setChoosing(true)}
      >
        <ImagePlus size={17} />
        Choose from library
      </button>
      {choosing && (
        <ImageLibraryDialog
          items={all}
          onClose={() => setChoosing(false)}
          onSelect={add}
        />
      )}
      {!images.length && (
        <p className="empty-state">
          No product photos yet. Upload or choose an image to start the gallery.
        </p>
      )}
      <div className="gallery-grid">
        {images.map((image, i) => {
          const item = all.find((x) => x.id === image.asset_id);
          const src =
            item?.preview_url ??
            (!image.asset_id && image.path ? resolveImage(image.path) : null);
          const patch = (changes: Partial<GalleryImage>) =>
            onChange(
              images.map((x, j) => (i === j ? { ...x, ...changes } : x)),
            );
          return (
            <article
              className="gallery-card"
              key={image.id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const raw = e.dataTransfer.getData(
                  "application/x-macmaer-gallery",
                );
                if (!raw) return;
                const from = Number(raw);
                if (Number.isInteger(from) && from >= 0 && from < images.length)
                  onChange(move(images, from, i - from));
              }}
            >
              <div className="gallery-photo">
                {src ? (
                  <img
                    src={src}
                    alt={image.alt || "Product photo " + (i + 1)}
                    draggable={false}
                  />
                ) : (
                  <ImageIcon size={32} />
                )}
                {image.is_primary && (
                  <span className="status-badge">Primary</span>
                )}
              </div>
              <div className="gallery-card-body">
                <Field
                  label="Alt text"
                  value={image.alt}
                  placeholder="Describe this photo…"
                  help="Describe what the image shows for people using screen readers. For example, Cream knot pillow on a wooden chair."
                  onChange={(v) => patch({ alt: String(v) })}
                />
                {!!variants.length && (
                  <label>
                    Show for variant
                    <select
                      value={image.variant_id ?? ""}
                      onChange={(e) =>
                        patch({ variant_id: e.target.value || null })
                      }
                    >
                      <option value="">All variants</option>
                      {image.variant_id &&
                        !variants.some((v) => v.id === image.variant_id) && (
                          <option value={image.variant_id}>
                            Removed variant — choose another
                          </option>
                        )}
                      {variants.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.title || v.sku || "Unnamed variant"}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {!variants.length && image.variant_id && (
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => patch({ variant_id: null })}
                  >
                    Clear removed variant association
                  </button>
                )}
                <label className="primary-choice">
                  <input
                    type="radio"
                    name="primary-image"
                    checked={image.is_primary}
                    onChange={() =>
                      onChange(
                        images.map((x, j) => ({ ...x, is_primary: i === j })),
                      )
                    }
                  />
                  Primary image
                </label>
                <div className="item-footer">
                  <div className="admin-actions">
                    <button
                      type="button"
                      draggable
                      className="secondary icon-button drag-handle"
                      aria-label="Drag to reorder image"
                      title="Drag to reorder, or use the arrows"
                      onDragStart={(e) =>
                        e.dataTransfer.setData(
                          "application/x-macmaer-gallery",
                          String(i),
                        )
                      }
                    >
                      <GripVertical size={16} />
                    </button>
                    <OrderButtons
                      index={i}
                      length={images.length}
                      onMove={(d) => onChange(move(images, i, d))}
                    />
                  </div>
                  <button
                    type="button"
                    className="secondary icon-button danger"
                    aria-label={"Remove image " + (i + 1)}
                    title="Remove from gallery"
                    onClick={() =>
                      onChange(
                        images
                          .filter((_, j) => j !== i)
                          .map((x, j) => ({
                            ...x,
                            is_primary: image.is_primary
                              ? j === 0
                              : x.is_primary,
                          })),
                      )
                    }
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
      <p className="field-note">
        Removing a photo from this gallery does not delete it from your library.
        Save the product to apply changes.
      </p>
    </fieldset>
  );
}
