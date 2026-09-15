"use client";

import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type TouchEvent,
} from "react";
import {
  gallerySwipeDirection,
  type GalleryDirection,
  type GalleryNavigation,
  type GalleryOrigin,
} from "@/modules/media/gallery-navigation";

const timing = {
  duration: 300,
  easing: "cubic-bezier(0.22, 0.61, 0.36, 1)",
  fill: "both" as const,
};
type ImageRenderer = (index: number, onReady: () => void) => ReactNode;

function CarouselImage({
  index,
  renderImage,
  onReady,
}: {
  index: number;
  renderImage: ImageRenderer;
  onReady: (index: number) => void;
}) {
  return renderImage(index, () => onReady(index));
}
export function galleryReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// Both viewers share this two-slide viewport. Only the displayed image and an
// incoming navigation/drag target are mounted; there is no full-gallery preload.
export function GalleryCarousel({
  navigation,
  count,
  origin,
  renderImage,
  onNavigate,
  onFinish,
  onDrag,
  active = true,
}: {
  navigation: GalleryNavigation;
  count: number;
  origin: GalleryOrigin;
  renderImage: ImageRenderer;
  onNavigate: (direction: GalleryDirection, offset: number) => void;
  onFinish: (sequence: number) => void;
  onDrag?: () => void;
  active?: boolean;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const [initialSequence] = useState(navigation.sequence);
  const ready = useRef<((index: number) => void) | null>(null);
  const gesture = useRef<{ x: number; y: number; horizontal: boolean } | null>(
    null,
  );
  const snapAnimations = useRef<Animation[]>([]);
  const [dragState, setDrag] = useState<{
    index: number;
    offset: number;
    direction: GalleryDirection;
  } | null>(null);
  const transitioning =
    active && navigation.from !== null && navigation.sequence > initialSequence;
  // A button/key request may interrupt an uncommitted drag or snap-back. Never
  // let its old local preview override the newly selected navigation frame.
  const drag =
    active &&
    navigation.from === null &&
    dragState?.index === navigation.selected
      ? dragState
      : null;
  const {
    selected,
    direction: navigationDirection,
    origin: navigationOrigin,
    offset: navigationOffset,
    sequence,
  } = navigation;
  const outgoingIndex = transitioning
    ? navigation.from
    : drag
      ? navigation.selected
      : null;
  const incomingIndex = drag
    ? (navigation.selected + drag.direction + count) % count
    : navigation.selected;
  const direction = drag?.direction ?? navigation.direction;
  const offset =
    drag?.offset ?? (navigation.origin === origin ? navigation.offset : 0);
  const notifyReady = useCallback((index: number) => {
    ready.current?.(index);
  }, []);

  useLayoutEffect(() => {
    if (!transitioning) return;
    const element = viewport.current;
    if (!element) return;
    const outgoing = element.querySelector<HTMLElement>("[data-outgoing]");
    const incoming = element.querySelector<HTMLElement>("[data-current]");
    if (!outgoing || !incoming) return;
    let cancelled = false;
    let started = false;
    let animations: Animation[] = [];
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finish = () => {
      if (!cancelled) onFinish(sequence);
    };
    const animate = () => {
      if (cancelled || started) return;
      started = true;
      element.dataset.phase = "sliding";
      if (motion.matches || !incoming.animate) {
        queueMicrotask(finish);
        return;
      }
      const start = navigationOrigin === origin ? navigationOffset : 0;
      animations = [
        outgoing.animate(
          [
            { transform: `translateX(${start}px)` },
            { transform: `translateX(${-navigationDirection * 100}%)` },
          ],
          timing,
        ),
        incoming.animate(
          [
            {
              transform: `translateX(calc(${navigationDirection * 100}% + ${start}px))`,
            },
            { transform: "translateX(0)" },
          ],
          timing,
        ),
      ];
      void Promise.all(animations.map((animation) => animation.finished))
        .then(finish)
        .catch(() => {}); // Cancellation on navigation/unmount is intentional.
    };
    const onMotionChange = () => {
      if (motion.matches) finish();
    };
    motion.addEventListener("change", onMotionChange);
    ready.current = (index) => {
      if (index === selected) animate();
    };
    // Retain the outgoing image while a cold incoming image loads or completes
    // its bounded error recovery. Never slide a blank, undecoded image into view.
    const image = incoming.querySelector("img");
    if (
      motion.matches ||
      (image?.complete && image.naturalWidth > 0) ||
      incoming.querySelector(".is-unavailable")
    )
      animate();
    else element.dataset.phase = "waiting";
    return () => {
      cancelled = true;
      ready.current = null;
      motion.removeEventListener("change", onMotionChange);
      animations.forEach((animation) => animation.cancel());
    };
  }, [
    transitioning,
    sequence,
    selected,
    navigationDirection,
    navigationOrigin,
    navigationOffset,
    origin,
    onFinish,
  ]);

  useLayoutEffect(
    () => () =>
      snapAnimations.current.forEach((animation) => animation.cancel()),
    [],
  );

  function startTouch(event: TouchEvent<HTMLDivElement>) {
    if (count <= 1 || event.touches.length !== 1) return;
    snapAnimations.current.forEach((animation) => animation.cancel());
    snapAnimations.current = [];
    setDrag(null);
    const touch = event.touches[0];
    if (!touch) return;
    gesture.current = { x: touch.clientX, y: touch.clientY, horizontal: false };
  }
  function moveTouch(event: TouchEvent<HTMLDivElement>) {
    const start = gesture.current;
    const touch = event.touches[0];
    if (!start || !touch || event.touches.length !== 1 || transitioning) return;
    const x = touch.clientX - start.x;
    const y = touch.clientY - start.y;
    if (!start.horizontal) {
      if (Math.max(Math.abs(x), Math.abs(y)) < 8) return;
      if (Math.abs(y) >= Math.abs(x)) {
        gesture.current = null;
        return; // Preserve normal vertical page scrolling.
      }
      start.horizontal = true;
    }
    onDrag?.();
    if (!galleryReducedMotion()) {
      const width = viewport.current?.clientWidth ?? 0;
      setDrag({
        index: navigation.selected,
        offset: Math.max(-width, Math.min(width, x)),
        direction: x < 0 ? 1 : -1,
      });
    }
  }
  function snapBack() {
    const element = viewport.current;
    if (!drag || !element || galleryReducedMotion()) {
      setDrag(null);
      return;
    }
    snapAnimations.current = Array.from(
      element.querySelectorAll<HTMLElement>(".gallery-slide"),
    ).map((slide) =>
      slide.animate(
        [
          { transform: getComputedStyle(slide).transform },
          {
            transform: slide.hasAttribute("data-outgoing")
              ? "translateX(0)"
              : `translateX(${drag.direction * 100}%)`,
          },
        ],
        timing,
      ),
    );
    void Promise.all(
      snapAnimations.current.map((animation) => animation.finished),
    )
      .then(() => {
        setDrag(null);
        snapAnimations.current.forEach((animation) => animation.cancel());
        snapAnimations.current = [];
      })
      .catch(() => {});
  }
  function finishTouch(event: TouchEvent<HTMLDivElement>) {
    const start = gesture.current;
    const touch = event.changedTouches[0];
    gesture.current = null;
    if (!start || !touch) return;
    const x = touch.clientX - start.x;
    const y = touch.clientY - start.y;
    const next = gallerySwipeDirection(
      x,
      y,
      viewport.current?.clientWidth ?? 0,
    );
    if (start.horizontal || next) onDrag?.();
    if (!next) {
      snapBack();
      return;
    }
    setDrag(null);
    onNavigate(next, drag?.offset ?? 0);
  }

  return (
    <div
      ref={viewport}
      className="gallery-carousel"
      data-direction={
        transitioning || drag
          ? direction === 1
            ? "next"
            : "previous"
          : undefined
      }
      data-phase={transitioning ? "waiting" : drag ? "dragging" : "idle"}
      onTouchStart={startTouch}
      onTouchMove={moveTouch}
      onTouchEnd={finishTouch}
      onTouchCancel={() => {
        gesture.current = null;
        snapBack();
      }}
    >
      {[outgoingIndex, incomingIndex]
        .filter((index): index is number => index !== null)
        .map((index) => {
          const outgoing = index === outgoingIndex;
          return (
            <div
              key={index}
              className="gallery-slide"
              data-outgoing={outgoing ? "" : undefined}
              data-current={!outgoing ? "" : undefined}
              aria-hidden={outgoing || !!drag ? true : undefined}
              style={{
                transform: outgoing
                  ? `translateX(${offset}px)`
                  : outgoingIndex !== null
                    ? `translateX(calc(${direction * 100}% + ${offset}px))`
                    : "translateX(0)",
              }}
            >
              <CarouselImage
                index={index}
                renderImage={renderImage}
                onReady={notifyReady}
              />
            </div>
          );
        })}
    </div>
  );
}
