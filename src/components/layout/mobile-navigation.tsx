"use client";

import Link from "next/link";
import { ChevronDown, Menu, ShoppingBag, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  CART_UPDATED_EVENT,
  type CartUpdatedDetail,
} from "@/modules/cart/events";

type NavigationCollection = {
  slug: string;
  name: string;
};

export function MobileNavigation({
  labels,
  collections,
  initialCartCount,
}: {
  labels: {
    navigation: string;
    open: string;
    close: string;
    shop: string;
    collections: string;
    allCollections: string;
    about: string;
    contact: string;
    cart: string;
  };
  collections: NavigationCollection[];
  initialCartCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [collectionsOpen, setCollectionsOpen] = useState(false);
  const [cartCount, setCartCount] = useState(initialCartCount);
  const shellRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const close = useCallback(() => {
    setOpen(false);
    setCollectionsOpen(false);
  }, []);

  useEffect(() => {
    function onCartUpdated(event: Event) {
      const count = (event as CustomEvent<CartUpdatedDetail>).detail.itemCount;
      if (count !== undefined) setCartCount(count);
    }
    window.addEventListener(CART_UPDATED_EVENT, onCartUpdated);
    return () => window.removeEventListener(CART_UPDATED_EVENT, onCartUpdated);
  }, []);

  useEffect(() => {
    const compactHeader = window.matchMedia("(max-width: 800px)");
    function closeAtDesktop(event: MediaQueryListEvent) {
      if (!event.matches) close();
    }
    compactHeader.addEventListener("change", closeAtDesktop);
    return () => compactHeader.removeEventListener("change", closeAtDesktop);
  }, [close]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();

    function closeOnOutsideClick(event: PointerEvent) {
      if (!shellRef.current?.contains(event.target as Node)) close();
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      close();
      triggerRef.current?.focus();
    }
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [close, open]);

  return (
    <div className="mobile-navigation" ref={shellRef}>
      <button
        ref={triggerRef}
        type="button"
        className="mobile-menu-button"
        aria-label={open ? labels.close : labels.open}
        aria-expanded={open}
        aria-controls="mobile-navigation-panel"
        onClick={() => (open ? close() : setOpen(true))}
      >
        {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
      </button>
      {open && (
        <nav
          ref={panelRef}
          id="mobile-navigation-panel"
          className="mobile-nav-panel"
          aria-label={labels.navigation}
          tabIndex={-1}
        >
          <div className="mobile-nav-primary-links">
            <Link href="/shop" onClick={close}>
              {labels.shop}
            </Link>
            <div className="mobile-nav-collections" data-open={collectionsOpen}>
              <button
                type="button"
                className="mobile-nav-collections-trigger"
                aria-expanded={collectionsOpen}
                aria-controls="mobile-nav-collection-panel"
                onClick={() => setCollectionsOpen((current) => !current)}
              >
                <span>{labels.collections}</span>
                <ChevronDown aria-hidden="true" />
              </button>
              {collectionsOpen && (
                <div
                  id="mobile-nav-collection-panel"
                  className="mobile-nav-collection-panel"
                >
                  <Link
                    href="/collections"
                    className="mobile-nav-all-collections"
                    onClick={close}
                  >
                    {labels.allCollections}
                  </Link>
                  <div className="mobile-nav-category-links">
                    {collections.map((collection) => (
                      <Link
                        key={collection.slug}
                        href={`/collections/${collection.slug}`}
                        onClick={close}
                      >
                        {collection.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <Link href="/about" onClick={close}>
              {labels.about}
            </Link>
            <Link href="/contact" onClick={close}>
              {labels.contact}
            </Link>
          </div>
          <Link href="/cart" className="mobile-nav-cart" onClick={close}>
            <ShoppingBag aria-hidden="true" strokeWidth={1.4} />
            <span>{labels.cart}</span>
            {cartCount > 0 && <strong>{cartCount}</strong>}
          </Link>
        </nav>
      )}
    </div>
  );
}
