"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  applyDiscountCodeAction,
  removeDiscountCodeAction,
  type DiscountActionResult,
} from "@/modules/discount/actions";
import { useStorefrontI18n } from "@/components/i18n/storefront-i18n";

export function DiscountCodeForm({ code }: { code: string | null }) {
  const { locale } = useStorefrontI18n();
  const sv = locale === "sv";
  const [value, setValue] = useState(code ?? "");
  const [result, setResult] = useState<DiscountActionResult | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  return (
    <form
      className="discount-code-form"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          const result = await applyDiscountCodeAction(value);
          setResult(result);
          if (result.ok) router.refresh();
        });
      }}
    >
      <label htmlFor="discount-code">
        {sv ? "Rabattkod" : "Discount code"}
      </label>
      <div>
        <input
          id="discount-code"
          value={value}
          maxLength={40}
          disabled={pending}
          onChange={(event) => setValue(event.target.value.toUpperCase())}
        />
        <button disabled={pending || !value.trim()}>
          {pending
            ? sv
              ? "Kontrollerar…"
              : "Checking…"
            : sv
              ? "Använd"
              : "Apply"}
        </button>
        {code && (
          <button
            type="button"
            className="text-link"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await removeDiscountCodeAction();
                setResult(result);
                if (result.ok) {
                  setValue("");
                  router.refresh();
                }
              })
            }
          >
            {sv ? "Ta bort" : "Remove"}
          </button>
        )}
      </div>
      <p
        className={result && !result.ok ? "cart-error" : ""}
        aria-live="polite"
      >
        {result?.message}
      </p>
    </form>
  );
}
