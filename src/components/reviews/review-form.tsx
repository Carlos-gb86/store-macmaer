"use client";

import { useActionState, useEffect, useId, useRef } from "react";
import { submitReviewAction } from "@/modules/reviews/actions";
import type { ReviewFormState } from "@/modules/reviews/schema";
import { useStorefrontI18n } from "@/components/i18n/storefront-i18n";
import { StorefrontSelect } from "@/components/ui/storefront-select";

const initialState: ReviewFormState = {
  ok: false,
  message: "",
  submissionId: 0,
};

export function ReviewForm({
  productId,
  productSlug,
}: {
  productId: string;
  productSlug: string;
}) {
  const { locale } = useStorefrontI18n();
  const sv = locale === "sv";
  const [state, action, pending] = useActionState(
    submitReviewAction,
    initialState,
  );
  const form = useRef<HTMLFormElement>(null);
  const errorPrefix = useId();
  useEffect(() => {
    if (state.ok) form.current?.reset();
  }, [state.ok, state.submissionId]);
  return (
    <form ref={form} action={action} className="review-form">
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="productSlug" value={productSlug} />
      <fieldset>
        <legend>{sv ? "Dela din upplevelse" : "Share your experience"}</legend>
        <p className="small muted">
          {sv
            ? "Recensioner granskas före publicering. Din e-post används bara för att verifiera ett köp och visas aldrig."
            : "Reviews are checked before publication. Your email is used only to verify a purchase and is never displayed."}
        </p>
        <div className="form-grid">
          <label>
            {sv ? "Visningsnamn" : "Display name"}
            <input
              name="displayName"
              autoComplete="name"
              required
              maxLength={100}
              aria-invalid={!!state.fieldErrors?.displayName}
              aria-describedby={
                state.fieldErrors?.displayName
                  ? `${errorPrefix}-display-name`
                  : undefined
              }
            />
            {state.fieldErrors?.displayName && (
              <small id={`${errorPrefix}-display-name`} className="field-error">
                {state.fieldErrors.displayName}
              </small>
            )}
          </label>
          <label>
            {sv ? "E-post" : "Email"}
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={320}
              aria-invalid={!!state.fieldErrors?.email}
              aria-describedby={
                state.fieldErrors?.email ? `${errorPrefix}-email` : undefined
              }
            />
            {state.fieldErrors?.email && (
              <small id={`${errorPrefix}-email`} className="field-error">
                {state.fieldErrors.email}
              </small>
            )}
          </label>
        </div>
        <div>
          <label htmlFor="review-rating">{sv ? "Betyg" : "Rating"}</label>
          <StorefrontSelect
            key={state.submissionId}
            id="review-rating"
            name="rating"
            defaultValue="5"
            required
            options={[
              { value: "5", label: `5 — ${sv ? "Fantastisk" : "Wonderful"}` },
              { value: "4", label: `4 — ${sv ? "Mycket bra" : "Very good"}` },
              { value: "3", label: `3 — ${sv ? "Bra" : "Good"}` },
              {
                value: "2",
                label: `2 — ${sv ? "Kunde vara bättre" : "Could be better"}`,
              },
              {
                value: "1",
                label: `1 — ${sv ? "En besvikelse" : "Disappointing"}`,
              },
            ]}
          />
        </div>
        <label>
          {sv ? "Rubrik" : "Review title"}{" "}
          <span className="muted">({sv ? "valfritt" : "optional"})</span>
          <input name="title" maxLength={120} />
        </label>
        <label>
          {sv ? "Din recension" : "Your review"}
          <textarea
            name="body"
            required
            minLength={10}
            maxLength={5000}
            aria-invalid={!!state.fieldErrors?.body}
            aria-describedby={
              state.fieldErrors?.body ? `${errorPrefix}-body` : undefined
            }
          />
          {state.fieldErrors?.body && (
            <small id={`${errorPrefix}-body`} className="field-error">
              {state.fieldErrors.body}
            </small>
          )}
        </label>
        <label className="honeypot" aria-hidden="true">
          {sv ? "Företag" : "Company"}
          <input name="company" tabIndex={-1} autoComplete="off" />
        </label>
        <button disabled={pending}>
          {pending
            ? sv
              ? "Skickar…"
              : "Submitting…"
            : sv
              ? "Skicka recension"
              : "Submit review"}
        </button>
        {state.message && (
          <p role={state.ok ? "status" : "alert"}>{state.message}</p>
        )}
      </fieldset>
    </form>
  );
}
