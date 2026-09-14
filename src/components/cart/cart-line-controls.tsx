"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  removeCartItemAction,
  updateCartItemAction,
} from "@/modules/cart/actions";
import { announceCartUpdate } from "@/modules/cart/events";
import { useStorefrontI18n } from "@/components/i18n/storefront-i18n";

export function CartLineControls({
  lineId,
  quantity,
}: {
  lineId: string;
  quantity: number;
}) {
  const { t } = useStorefrontI18n();
  const [value, setValue] = useState<number | "">(quantity);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const updateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  function cancelScheduledUpdate() {
    if (updateTimer.current) clearTimeout(updateTimer.current);
    updateTimer.current = null;
  }

  useEffect(() => cancelScheduledUpdate, []);

  function update(nextQuantity: number) {
    startTransition(async () => {
      const result = await updateCartItemAction({
        lineId,
        quantity: nextQuantity,
      });
      setMessage(result.message);
      if (result.ok) {
        announceCartUpdate({ itemCount: result.itemCount, open: false });
        router.refresh();
      } else {
        setValue(quantity);
      }
    });
  }

  function scheduleUpdate(nextValue: number | "") {
    setValue(nextValue);
    setMessage("");
    cancelScheduledUpdate();
    if (
      nextValue === "" ||
      !Number.isInteger(nextValue) ||
      nextValue < 1 ||
      nextValue > 99 ||
      nextValue === quantity
    )
      return;
    updateTimer.current = setTimeout(() => {
      updateTimer.current = null;
      update(nextValue);
    }, 300);
  }

  function remove() {
    cancelScheduledUpdate();
    startTransition(async () => {
      const result = await removeCartItemAction(lineId);
      setMessage(result.message);
      if (result.ok) {
        announceCartUpdate({ itemCount: result.itemCount, open: false });
        router.refresh();
      }
    });
  }

  return (
    <div className="cart-line-actions">
      <label>
        {t("quantity")}
        <input
          type="number"
          min="1"
          max="99"
          step="1"
          value={value}
          disabled={pending}
          onChange={(event) =>
            scheduleUpdate(
              event.currentTarget.value === ""
                ? ""
                : event.currentTarget.valueAsNumber,
            )
          }
          onBlur={() => {
            if (
              value === "" ||
              !Number.isInteger(value) ||
              value < 1 ||
              value > 99
            )
              setValue(quantity);
          }}
        />
      </label>
      <button
        type="button"
        className="text-link cart-remove"
        disabled={pending}
        onClick={remove}
      >
        {t("remove")}
      </button>
      <span className="small" aria-live="polite">
        {pending ? t("updating") : message}
      </span>
    </div>
  );
}
