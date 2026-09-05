"use client";
import Image from "next/image";
import { useRef, useState } from "react";
import type { ProductImage as ImageData } from "@/modules/catalog/schema";
import { resolveImage } from "@/modules/media/resolve-image";
import { ProductImage } from "./product-image";
import { Button } from "@/components/ui/button";
export function ProductGallery({ images }: { images: ImageData[] }) {
  const [selected, setSelected] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const image = images[selected] ?? images[0];
  return (
    <div className="product-gallery">
      <button
        type="button"
        className="gallery-main"
        onClick={() => image && dialog.current?.showModal()}
        disabled={!image}
        aria-label="Enlarge product image"
      >
        <ProductImage
          image={image}
          sizes="(max-width: 800px) 100vw, 55vw"
          priority
        />
        {image && <span className="image-label">View closer +</span>}
      </button>
      {images.length > 1 && (
        <div className="gallery-thumbnails" aria-label="Product images">
          {images.map((item, index) => (
            <button
              key={item.id}
              type="button"
              aria-label={"View image " + (index + 1)}
              aria-pressed={index === selected}
              onClick={() => setSelected(index)}
            >
              <Image
                src={resolveImage(item.path)}
                alt={item.alt}
                width={80}
                height={80}
              />
            </button>
          ))}
        </div>
      )}
      <dialog
        ref={dialog}
        className="image-dialog"
        aria-label="Enlarged product image"
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
      >
        <Button type="button" onClick={() => dialog.current?.close()} autoFocus>
          Close ×
        </Button>
        {image && (
          <Image
            src={resolveImage(image.path)}
            alt={image.alt}
            width={image.width}
            height={image.height}
            sizes="90vw"
          />
        )}
      </dialog>
    </div>
  );
}
