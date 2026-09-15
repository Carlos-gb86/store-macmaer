import { describe, expect, it } from "vitest";
import {
  galleryNavigationReducer as reduce,
  gallerySwipeDirection,
  initialGalleryNavigation as initial,
  type GalleryAction,
  type GalleryNavigation,
} from "@/modules/media/gallery-navigation";

function navigate(
  state: GalleryNavigation,
  options: Partial<Extract<GalleryAction, { type: "navigate" }>> = {},
) {
  return reduce(state, {
    type: "navigate",
    count: 4,
    relative: 1,
    origin: "embedded",
    animate: true,
    ...options,
  });
}
function finish(state: GalleryNavigation, animate = true) {
  return reduce(state, { type: "finish", sequence: state.sequence, animate });
}

describe("shared gallery navigation", () => {
  it("starts without a fake opening transition", () => {
    expect(initial.from).toBeNull();
    expect(initial.sequence).toBe(0);
  });
  it("slides forward from first to second and backward from second to first", () => {
    const next = navigate(initial);
    expect(next).toMatchObject({ selected: 1, from: 0, direction: 1 });
    const previous = navigate(finish(next), { relative: -1 });
    expect(previous).toMatchObject({ selected: 0, from: 1, direction: -1 });
    expect(finish(previous).from).toBeNull();
  });
  it("retains arrow/swipe direction when wrapping in either direction", () => {
    const previous = navigate(initial, { relative: -1 });
    expect(previous).toMatchObject({ selected: 3, from: 0, direction: -1 });
    const next = navigate(finish(previous));
    expect(next).toMatchObject({ selected: 0, from: 3, direction: 1 });
  });
  it("determines thumbnail jump direction from the displayed index", () => {
    const jump = navigate(initial, { relative: undefined, index: 3 });
    expect(jump).toMatchObject({ selected: 3, direction: 1 });
    const reverse = navigate(finish(jump), { relative: undefined, index: 0 });
    expect(reverse).toMatchObject({ selected: 0, direction: -1 });
  });
  it("coalesces rapid clicks while preserving their intended final index", () => {
    let state = navigate(initial);
    state = navigate(state);
    state = navigate(state);
    state = navigate(state);
    expect(state.selected).toBe(1);
    expect(state.pending?.index).toBe(0);
    state = finish(state);
    expect(state).toMatchObject({ selected: 0, from: 1, direction: 1 });
    expect(finish(state)).toMatchObject({
      selected: 0,
      from: null,
      pending: null,
    });
  });
  it("handles rapid direction changes and thumbnail replacement", () => {
    let state = navigate(initial);
    state = navigate(state, { relative: -1 });
    state = navigate(state, { relative: undefined, index: 3 });
    expect(finish(state)).toMatchObject({ selected: 3, from: 1, direction: 1 });
  });
  it("cancels a pending request when the displayed target is selected again", () => {
    let state = navigate(navigate(initial));
    state = navigate(state, { relative: undefined, index: 1 });
    expect(finish(state)).toMatchObject({
      selected: 1,
      from: null,
      pending: null,
    });
  });
  it("ignores duplicate and stale animation completions", () => {
    const state = navigate(navigate(initial));
    const queued = finish(state);
    expect(
      reduce(queued, {
        type: "finish",
        sequence: state.sequence,
        animate: true,
      }),
    ).toBe(queued);
    const settled = finish(queued);
    expect(finish(settled)).toBe(settled);
  });
  it("changes images immediately for reduced motion, including pending work", () => {
    const next = navigate(initial, { animate: false });
    expect(next).toMatchObject({ selected: 1, from: null });
    const pending = navigate(navigate(initial));
    expect(finish(pending, false)).toMatchObject({
      selected: 2,
      from: null,
      pending: null,
    });
  });
  it("transfers drag offset only to the originating viewer", () => {
    expect(
      navigate(initial, { origin: "lightbox", offset: -120 }),
    ).toMatchObject({ origin: "lightbox", offset: -120 });
  });
  it("does nothing for empty/single-image galleries and invalid thumbnails", () => {
    for (const options of [
      { count: 0 },
      { count: 1 },
      { relative: undefined, index: -1 },
      { relative: undefined, index: 4 },
      { relative: undefined, index: 1.5 },
    ])
      expect(
        navigate(
          initial,
          options as Partial<Extract<GalleryAction, { type: "navigate" }>>,
        ),
      ).toBe(initial);
  });
});

describe("gallery touch thresholds", () => {
  it("navigates in swipe direction after the responsive threshold", () => {
    expect(gallerySwipeDirection(-100, 4, 400)).toBe(1);
    expect(gallerySwipeDirection(100, 4, 400)).toBe(-1);
    expect(gallerySwipeDirection(-45, 0, 200)).toBe(1);
  });
  it("snaps back for short or predominantly vertical gestures", () => {
    expect(gallerySwipeDirection(30, 0, 400)).toBeNull();
    expect(gallerySwipeDirection(90, 100, 400)).toBeNull();
    expect(gallerySwipeDirection(100, 100, 400)).toBeNull();
  });
});
