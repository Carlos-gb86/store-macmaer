"use client";

import { useActionState, useEffect, useRef } from "react";
import { submitReviewAction } from "@/modules/reviews/actions";
import type { ReviewFormState } from "@/modules/reviews/schema";

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
  const [state, action, pending] = useActionState(
    submitReviewAction,
    initialState,
  );
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) form.current?.reset();
  }, [state.ok, state.submissionId]);
  return (
    <form ref={form} action={action} className="review-form">
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="productSlug" value={productSlug} />
      <fieldset>
        <legend>Share your experience</legend>
        <p className="small muted">
          Reviews are checked before publication. Your email is used only to
          verify a purchase and is never displayed.
        </p>
        <div className="form-grid">
          <label>
            Display name
            <input
              name="displayName"
              autoComplete="name"
              required
              maxLength={100}
              aria-invalid={!!state.fieldErrors?.displayName}
            />
            {state.fieldErrors?.displayName && (
              <small className="field-error">
                {state.fieldErrors.displayName}
              </small>
            )}
          </label>
          <label>
            Email
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={320}
              aria-invalid={!!state.fieldErrors?.email}
            />
            {state.fieldErrors?.email && (
              <small className="field-error">{state.fieldErrors.email}</small>
            )}
          </label>
        </div>
        <label>
          Rating
          <select name="rating" defaultValue="5" required>
            <option value="5">5 — Wonderful</option>
            <option value="4">4 — Very good</option>
            <option value="3">3 — Good</option>
            <option value="2">2 — Could be better</option>
            <option value="1">1 — Disappointing</option>
          </select>
        </label>
        <label>
          Review title <span className="muted">(optional)</span>
          <input name="title" maxLength={120} />
        </label>
        <label>
          Your review
          <textarea name="body" required minLength={10} maxLength={5000} />
          {state.fieldErrors?.body && (
            <small className="field-error">{state.fieldErrors.body}</small>
          )}
        </label>
        <label className="honeypot" aria-hidden="true">
          Company
          <input name="company" tabIndex={-1} autoComplete="off" />
        </label>
        <button disabled={pending}>
          {pending ? "Submitting…" : "Submit review"}
        </button>
        {state.message && (
          <p role={state.ok ? "status" : "alert"}>{state.message}</p>
        )}
      </fieldset>
    </form>
  );
}
