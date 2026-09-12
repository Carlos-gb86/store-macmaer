export const CART_UPDATED_EVENT = "macmaer:cart-updated";

export type CartUpdatedDetail = {
  itemCount?: number;
  open: boolean;
};

export function announceCartUpdate(detail: CartUpdatedDetail) {
  window.dispatchEvent(
    new CustomEvent<CartUpdatedDetail>(CART_UPDATED_EVENT, { detail }),
  );
}
