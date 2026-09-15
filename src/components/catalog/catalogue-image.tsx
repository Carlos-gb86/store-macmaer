"use client";

import Image, { type ImageProps } from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  catalogueImageSource,
  imageRetrySource,
} from "@/modules/media/catalogue-image-source";
import { useStorefrontI18n } from "@/components/i18n/storefront-i18n";

function resourceKey(src: ImageProps["src"]) {
  return typeof src === "string"
    ? src
    : "default" in src
      ? src.default.src
      : src.src;
}

export type CatalogueImageProps = ImageProps & { onUnavailable?: () => void };

export default function CatalogueImage(props: CatalogueImageProps) {
  return <ImageAttempts key={resourceKey(props.src)} {...props} />;
}

function ImageAttempts({
  src,
  alt,
  style,
  onError,
  onLoad,
  onUnavailable,
  ...props
}: CatalogueImageProps) {
  const { locale } = useStorefrontI18n();
  const [attempt, setAttempt] = useState(0);
  const [phase, setPhase] = useState<
    "loading" | "loaded" | "retrying" | "unavailable"
  >("loading");
  const currentAttempt = useRef(0);
  const lastFailure = useRef(-1);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const source =
    typeof src === "string" && !props.unoptimized
      ? catalogueImageSource(src, process.env.NEXT_PUBLIC_SUPABASE_URL)
      : src;
  const retrying = phase === "retrying" || (phase === "loading" && attempt > 0);
  const unavailable = phase === "unavailable";
  const hidden = retrying || unavailable;
  const message =
    locale === "sv"
      ? "Bilden kan inte visas just nu"
      : "Image temporarily unavailable";
  const content = (
    <>
      <Image
        {...props}
        key={attempt}
        src={
          typeof source === "string"
            ? imageRetrySource(source, attempt)
            : source
        }
        alt={alt}
        aria-hidden={hidden ? true : props["aria-hidden"]}
        style={{ ...style, ...(hidden ? { opacity: 0 } : {}) }}
        onLoad={(event) => {
          if (attempt !== currentAttempt.current) return;
          if (timer.current) clearTimeout(timer.current);
          setPhase("loaded");
          onLoad?.(event);
        }}
        onError={(event) => {
          if (
            attempt !== currentAttempt.current ||
            lastFailure.current === attempt
          )
            return;
          lastFailure.current = attempt;
          event.currentTarget.style.opacity = "0";
          onError?.(event);
          if (attempt >= 2) {
            setPhase("unavailable");
            onUnavailable?.();
            return;
          }
          setPhase("retrying");
          timer.current = setTimeout(
            () => {
              currentAttempt.current = attempt + 1;
              setAttempt(attempt + 1);
              setPhase("loading");
            },
            1500 * 2 ** attempt + Math.floor(Math.random() * 300),
          );
        }}
      />
      {hidden && (
        <span
          className={`catalogue-image-feedback${unavailable ? " is-unavailable" : " is-retrying"}`}
          role={unavailable && alt ? "img" : undefined}
          aria-label={unavailable && alt ? `${alt}. ${message}.` : undefined}
          aria-hidden={!unavailable || !alt}
          style={
            !props.fill
              ? { width: props.width, height: props.height }
              : undefined
          }
        >
          {unavailable && <span>{message}</span>}
        </span>
      )}
    </>
  );
  return props.fill ? (
    content
  ) : (
    <span
      className="catalogue-image-frame"
      style={{ width: props.width, height: props.height }}
    >
      {content}
    </span>
  );
}
