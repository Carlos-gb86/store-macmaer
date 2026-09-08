"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  removeCartItemAction,
  updateCartItemAction,
} from "@/modules/cart/actions";

export function CartLineControls({
  lineId,
  quantity,
}: {
  lineId: string;
  quantity: number;
}) {
  const [value, setValue] = useState(quantity);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  function run(operation: "update" | "remove") {
    startTransition(async () => {
      const result =
        operation === "update"
          ? await updateCartItemAction({ lineId, quantity: value })
          : await removeCartItemAction(lineId);
      setMessage(result.message);
      if (result.ok) router.refresh();
    });
  }
  return (
    <div className="cart-line-actions">
      <label>
        Quantity
        <input
          type="number"
          min="1"
          max="99"
          step="1"
          value={value}
          disabled={pending}
          onChange={(event) => setValue(Number(event.target.value))}
        />
      </label>
      <button
        type="button"
        className="text-link"
        disabled={pending || value === quantity}
        onClick={() => run("update")}
      >
        Update
      </button>
      <button
        type="button"
        className="text-link cart-remove"
        disabled={pending}
        onClick={() => run("remove")}
      >
        Remove
      </button>
      <span className="small" aria-live="polite">
        {pending ? "Updating…" : message}
      </span>
    </div>
  );
}
