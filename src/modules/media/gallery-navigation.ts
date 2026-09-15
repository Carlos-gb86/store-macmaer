export type GalleryDirection = -1 | 1;
export type GalleryOrigin = "embedded" | "lightbox";
type Destination = {
  index: number;
  direction: GalleryDirection;
  origin: GalleryOrigin;
  offset: number;
};
export type GalleryNavigation = {
  selected: number;
  from: number | null;
  direction: GalleryDirection;
  origin: GalleryOrigin;
  offset: number;
  sequence: number;
  pending: Destination | null;
};
export const initialGalleryNavigation: GalleryNavigation = {
  selected: 0,
  from: null,
  direction: 1,
  origin: "embedded",
  offset: 0,
  sequence: 0,
  pending: null,
};
export type GalleryAction =
  | {
      type: "navigate";
      count: number;
      relative?: GalleryDirection;
      index?: number;
      origin: GalleryOrigin;
      offset?: number;
      animate: boolean;
    }
  | { type: "finish"; sequence: number; animate: boolean };

function begin(
  state: GalleryNavigation,
  target: Destination,
  animate: boolean,
): GalleryNavigation {
  return {
    ...state,
    selected: target.index,
    from: animate ? state.selected : null,
    direction: target.direction,
    origin: target.origin,
    offset: target.offset,
    sequence: state.sequence + 1,
    pending: null,
  };
}

// Coalesce rapid requests to the latest intended destination. Animation
// completion is sequence-checked so two viewers or a cancelled animation cannot
// finish a newer transition. Relative wrapping retains the requested direction.
export function galleryNavigationReducer(
  state: GalleryNavigation,
  action: GalleryAction,
): GalleryNavigation {
  if (action.type === "finish") {
    if (action.sequence !== state.sequence || state.from === null) return state;
    return state.pending && state.pending.index !== state.selected
      ? begin(state, state.pending, action.animate)
      : { ...state, from: null, offset: 0, pending: null };
  }
  if (action.count <= 1) return state;
  const intended = state.pending?.index ?? state.selected;
  const index = action.relative
    ? (intended + action.relative + action.count) % action.count
    : action.index;
  if (
    index === undefined ||
    !Number.isInteger(index) ||
    index < 0 ||
    index >= action.count ||
    index === intended
  )
    return state;
  const target: Destination = {
    index,
    direction: action.relative ?? (index > state.selected ? 1 : -1),
    origin: action.origin,
    offset: action.offset ?? 0,
  };
  if (state.from !== null && action.animate)
    return {
      ...state,
      pending: index === state.selected ? null : { ...target, offset: 0 },
    };
  return begin(state, target, action.animate);
}

export function gallerySwipeDirection(
  horizontal: number,
  vertical: number,
  width: number,
): GalleryDirection | null {
  const threshold = Math.min(80, Math.max(45, width * 0.15));
  return Math.abs(horizontal) >= threshold &&
    Math.abs(horizontal) > Math.abs(vertical)
    ? horizontal < 0
      ? 1
      : -1
    : null;
}
