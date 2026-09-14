"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useRef, useState, type TouchEvent } from "react";
import type { ProductImage as ImageData } from "@/modules/catalog/schema";
import { resolveImage } from "@/modules/media/resolve-image";
import { ProductImage } from "./product-image";
import { useStorefrontI18n } from "@/components/i18n/storefront-i18n";

const swipeThreshold = 45;

export function ProductGallery({ images }: { images: ImageData[] }) {
  const { locale } = useStorefrontI18n();
  const sv = locale === "sv";
  const [selected, setSelected] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const suppressMainClick = useRef(false);
  const image = images[selected] ?? images[0];
  const multiple = images.length > 1;

  function selectRelative(direction: -1 | 1) {
    if (!multiple) return;
    setSelected(
      (current) => (current + direction + images.length) % images.length,
    );
  }

  function startSwipe(event: TouchEvent<HTMLElement>) {
    const touch = event.touches[0];
    if (touch) swipeStart.current = { x: touch.clientX, y: touch.clientY };
  }

  function finishSwipe(event: TouchEvent<HTMLElement>, suppressClick = false) {
    const start = swipeStart.current;
    const touch = event.changedTouches[0];
    swipeStart.current = null;
    if (!start || !touch) return;
    const horizontalDistance = touch.clientX - start.x;
    const verticalDistance = touch.clientY - start.y;
    if (
      Math.abs(horizontalDistance) < swipeThreshold ||
      Math.abs(horizontalDistance) <= Math.abs(verticalDistance)
    )
      return;
    if (suppressClick) suppressMainClick.current = true;
    selectRelative(horizontalDistance < 0 ? 1 : -1);
  }

  function imageSource(item: ImageData) {
    return item.resolved_src ?? resolveImage(item.path);
  }

  const previousLabel = sv ? "Föregående bild" : "Previous image";
  const nextLabel = sv ? "Nästa bild" : "Next image";

  return (
    <div className={`product-gallery${multiple ? " has-thumbnails" : ""}`}>
      {multiple && (
        <div
          className="gallery-thumbnails"
          role="group"
          aria-label={sv ? "Produktbilder" : "Product images"}
        >
          {images.map((item, index) => (
            <button
              key={item.id}
              type="button"
              aria-label={(sv ? "Visa bild " : "View image ") + (index + 1)}
              aria-pressed={index === selected}
              onClick={() => setSelected(index)}
            >
              <Image
                src={imageSource(item)}
                unoptimized={item.private}
                alt={item.alt}
                fill
                sizes="82px"
              />
            </button>
          ))}
        </div>
      )}

      <div
        className="gallery-stage"
        onTouchStart={startSwipe}
        onTouchEnd={(event) => finishSwipe(event, true)}
      >
        <button
          type="button"
          className="gallery-main"
          onClick={() => {
            if (suppressMainClick.current) {
              suppressMainClick.current = false;
              return;
            }
            if (image) dialog.current?.showModal();
          }}
          disabled={!image}
          aria-label={
            (sv ? "Förstora produktbild" : "Enlarge product image") +
            (image ? `, ${selected + 1} / ${images.length}` : "")
          }
        >
          <ProductImage
            image={image}
            sizes="(max-width: 800px) 85vw, 50vw"
            priority
          />
          {image && (
            <span className="image-label">
              {sv ? "Visa närmare" : "View closer"} +
            </span>
          )}
        </button>

        {multiple && (
          <>
            <button
              type="button"
              className="gallery-arrow gallery-arrow-previous"
              aria-label={previousLabel}
              onClick={() => selectRelative(-1)}
            >
              <ChevronLeft aria-hidden="true" />
            </button>
            <button
              type="button"
              className="gallery-arrow gallery-arrow-next"
              aria-label={nextLabel}
              onClick={() => selectRelative(1)}
            >
              <ChevronRight aria-hidden="true" />
            </button>
            <span className="gallery-count" aria-live="polite">
              {selected + 1} / {images.length}
            </span>
          </>
        )}
      </div>

      <dialog
        ref={dialog}
        className="image-dialog"
        aria-label={sv ? "Förstorad produktbild" : "Enlarged product image"}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") selectRelative(-1);
          if (event.key === "ArrowRight") selectRelative(1);
        }}
      >
        <div className="lightbox-shell">
          <button
            type="button"
            className="lightbox-close"
            aria-label={sv ? "Stäng förstorad bild" : "Close enlarged image"}
            onClick={() => dialog.current?.close()}
            autoFocus
          >
            <X aria-hidden="true" />
          </button>

          <div
            className="lightbox-stage"
            onTouchStart={startSwipe}
            onTouchEnd={finishSwipe}
          >
            {image && (
              <Image
                src={imageSource(image)}
                unoptimized={image.private}
                alt={image.alt}
                fill
                sizes="(max-width: 800px) 100vw, 75vw"
                className="lightbox-image"
              />
            )}
            {multiple && (
              <>
                <button
                  type="button"
                  className="lightbox-arrow lightbox-arrow-previous"
                  aria-label={previousLabel}
                  onClick={() => selectRelative(-1)}
                >
                  <ChevronLeft aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="lightbox-arrow lightbox-arrow-next"
                  aria-label={nextLabel}
                  onClick={() => selectRelative(1)}
                >
                  <ChevronRight aria-hidden="true" />
                </button>
              </>
            )}
          </div>

          {multiple && (
            <div
              className="lightbox-thumbnails"
              role="group"
              aria-label={
                sv ? "Förstorade produktbilder" : "Enlarged product images"
              }
            >
              {images.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  aria-label={(sv ? "Visa bild " : "View image ") + (index + 1)}
                  aria-pressed={index === selected}
                  onClick={() => setSelected(index)}
                >
                  <Image
                    src={imageSource(item)}
                    unoptimized={item.private}
                    alt=""
                    fill
                    sizes="72px"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </dialog>
    </div>
  );
}
