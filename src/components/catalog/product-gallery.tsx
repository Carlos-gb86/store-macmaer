"use client";

import Image from "./catalogue-image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import type { ProductImage as ImageData } from "@/modules/catalog/schema";
import { resolveImage } from "@/modules/media/resolve-image";
import { ProductImage } from "./product-image";
import { useStorefrontI18n } from "@/components/i18n/storefront-i18n";
import { GalleryCarousel, galleryReducedMotion } from "./gallery-carousel";
import {
  galleryNavigationReducer,
  initialGalleryNavigation,
  type GalleryDirection,
  type GalleryOrigin,
} from "@/modules/media/gallery-navigation";

export function ProductGallery({ images }: { images: ImageData[] }) {
  const { locale } = useStorefrontI18n();
  const sv = locale === "sv";
  const [navigation, dispatch] = useReducer(
    galleryNavigationReducer,
    initialGalleryNavigation,
  );
  const selected = navigation.selected;
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const suppressMainClickUntil = useRef(0);
  const image = images[selected] ?? images[0];
  const multiple = images.length > 1;

  function selectRelative(
    direction: GalleryDirection,
    origin: GalleryOrigin = "embedded",
    offset = 0,
  ) {
    dispatch({
      type: "navigate",
      count: images.length,
      relative: direction,
      origin,
      offset,
      animate: !galleryReducedMotion(),
    });
  }
  function selectThumbnail(index: number, origin: GalleryOrigin) {
    dispatch({
      type: "navigate",
      count: images.length,
      index,
      origin,
      animate: !galleryReducedMotion(),
    });
  }
  const finishTransition = useCallback((sequence: number) => {
    dispatch({ type: "finish", sequence, animate: !galleryReducedMotion() });
  }, []);

  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal();
  }, [open]);

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
              onClick={() => selectThumbnail(index, "embedded")}
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
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            selectRelative(event.key === "ArrowLeft" ? -1 : 1);
          }
        }}
      >
        <button
          type="button"
          className="gallery-main"
          onClick={() => {
            if (Date.now() < suppressMainClickUntil.current) {
              suppressMainClickUntil.current = 0;
              return;
            }
            if (image) {
              dispatch({
                type: "finish",
                sequence: navigation.sequence,
                animate: false,
              });
              setOpen(true);
            }
          }}
          disabled={!image}
          aria-label={
            (sv ? "Förstora produktbild" : "Enlarge product image") +
            (image ? `, ${selected + 1} / ${images.length}` : "")
          }
        >
          {image ? (
            <GalleryCarousel
              navigation={navigation}
              count={images.length}
              origin="embedded"
              active={!open}
              onNavigate={(direction, offset) =>
                selectRelative(direction, "embedded", offset)
              }
              onFinish={finishTransition}
              onDrag={() => {
                suppressMainClickUntil.current = Date.now() + 500;
              }}
              renderImage={(index, onReady) => (
                <ProductImage
                  image={images[index]}
                  sizes="(max-width: 800px) 85vw, 50vw"
                  priority
                  onLoad={onReady}
                  onUnavailable={onReady}
                />
              )}
            />
          ) : (
            <ProductImage />
          )}
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
        onClose={() => {
          dispatch({
            type: "finish",
            sequence: navigation.sequence,
            animate: false,
          });
          setOpen(false);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            selectRelative(event.key === "ArrowLeft" ? -1 : 1, "lightbox");
          }
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

          <div className="lightbox-stage">
            {open && image && (
              <GalleryCarousel
                navigation={navigation}
                count={images.length}
                origin="lightbox"
                onNavigate={(direction, offset) =>
                  selectRelative(direction, "lightbox", offset)
                }
                onFinish={finishTransition}
                renderImage={(index, onReady) => {
                  const item = images[index];
                  return item ? (
                    <Image
                      src={imageSource(item)}
                      unoptimized={item.private}
                      alt={item.alt}
                      fill
                      sizes="(max-width: 800px) 100vw, 75vw"
                      className="lightbox-image"
                      loading="eager"
                      onLoad={onReady}
                      onUnavailable={onReady}
                    />
                  ) : null;
                }}
              />
            )}
            {multiple && (
              <>
                <button
                  type="button"
                  className="lightbox-arrow lightbox-arrow-previous"
                  aria-label={previousLabel}
                  onClick={() => selectRelative(-1, "lightbox")}
                >
                  <ChevronLeft aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="lightbox-arrow lightbox-arrow-next"
                  aria-label={nextLabel}
                  onClick={() => selectRelative(1, "lightbox")}
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
                  onClick={() => selectThumbnail(index, "lightbox")}
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
