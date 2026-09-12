"use client";

import Image from "next/image";
import Link from "next/link";
import { ShoppingBag, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatMoney } from "@/modules/currency/money";
import { resolveImage } from "@/modules/media/resolve-image";
import {
  CART_UPDATED_EVENT,
  type CartUpdatedDetail,
} from "@/modules/cart/events";
import type { MiniCartView } from "@/modules/cart/schema";

export function MiniCart({ initialCart }: { initialCart: MiniCartView }) {
  const [cart, setCart] = useState(initialCart);
  const [open, setOpen] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);

  const refreshCart = useCallback(async () => {
    try {
      const response = await fetch("/api/cart/summary", { cache: "no-store" });
      if (response.ok) setCart((await response.json()) as MiniCartView);
    } catch {
      // Keep the existing snapshot if a background refresh fails.
    }
  }, []);

  useEffect(() => {
    function onCartUpdated(event: Event) {
      const detail = (event as CustomEvent<CartUpdatedDetail>).detail;
      const itemCount = detail.itemCount;
      if (itemCount !== undefined)
        setCart((current) => ({ ...current, itemCount }));
      if (detail.open) setOpen(true);
      void refreshCart();
    }
    window.addEventListener(CART_UPDATED_EVENT, onCartUpdated);
    return () => window.removeEventListener(CART_UPDATED_EVENT, onCartUpdated);
  }, [refreshCart]);
  useEffect(() => {
    if (!open) return;
    function closeOnOutsideClick(event: PointerEvent) {
      if (!shellRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const itemLabel = `${cart.itemCount} ${cart.itemCount === 1 ? "item" : "items"}`;

  return (
    <div className="mini-cart-shell" ref={shellRef}>
      <button
        type="button"
        className="header-cart-button"
        aria-label={`Cart, ${itemLabel}`}
        aria-expanded={open}
        aria-controls="mini-cart-panel"
        onClick={() => {
          setOpen((current) => !current);
          if (!open) void refreshCart();
        }}
      >
        <ShoppingBag aria-hidden="true" strokeWidth={1.4} />
        {cart.itemCount > 0 && (
          <span className="header-cart-badge" key={cart.itemCount}>
            {cart.itemCount}
          </span>
        )}
      </button>
      {open && (
        <div
          id="mini-cart-panel"
          className="mini-cart-panel"
          role="dialog"
          aria-label="Cart summary"
        >
          <div className="mini-cart-heading">
            <div>
              <span className="eyebrow">Your cart</span>
              <h2>{itemLabel}</h2>
            </div>
            <button
              type="button"
              className="mini-cart-close"
              aria-label="Close cart summary"
              onClick={() => setOpen(false)}
            >
              <X aria-hidden="true" />
            </button>
          </div>
          {cart.lines.length ? (
            <>
              <div className="mini-cart-lines">
                {cart.lines.map((line) => (
                  <Link
                    href={`/products/${line.productSlug}`}
                    className="mini-cart-line"
                    key={line.id}
                    onClick={() => setOpen(false)}
                  >
                    <span className="mini-cart-image">
                      {line.imagePath ? (
                        <Image
                          src={resolveImage(line.imagePath)}
                          alt=""
                          fill
                          sizes="72px"
                        />
                      ) : null}
                    </span>
                    <span className="mini-cart-line-copy">
                      <strong>{line.productTitle}</strong>
                      <span>Quantity {line.quantity}</span>
                    </span>
                    <span>
                      {formatMoney(
                        line.displayUnitAmount * line.quantity,
                        cart.currency,
                      )}
                    </span>
                  </Link>
                ))}
                {cart.lineCount > cart.lines.length && (
                  <p className="small muted">
                    +{cart.lineCount - cart.lines.length} more configuration
                    {cart.lineCount - cart.lines.length === 1 ? "" : "s"}
                  </p>
                )}
              </div>
              <div className="mini-cart-subtotal">
                <span>Subtotal</span>
                <strong>{formatMoney(cart.subtotal, cart.currency)}</strong>
              </div>
              <p className="mini-cart-note">Shipping and VAT shown in cart.</p>
              <Link
                href="/cart"
                className="button"
                onClick={() => setOpen(false)}
              >
                View cart
              </Link>
            </>
          ) : (
            <div className="mini-cart-empty">
              <p>Your bag is ready for something beautiful.</p>
              <Link
                href="/shop"
                className="button button-secondary"
                onClick={() => setOpen(false)}
              >
                Explore all pieces
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
