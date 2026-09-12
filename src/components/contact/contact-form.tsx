"use client";

import { useActionState, useEffect, useRef } from "react";
import { submitContactFormAction } from "@/modules/contact/actions";
import { initialContactFormState } from "@/modules/contact/schema";

function FieldError({ message }: { message?: string }) {
  return message ? <span className="form-field-error">{message}</span> : null;
}

export function ContactForm() {
  const [state, formAction, pending] = useActionState(
    submitContactFormAction,
    initialContactFormState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok, state.submissionId]);

  return (
    <form ref={formRef} action={formAction} className="contact-form">
      <div className="contact-name-fields">
        <label>
          First name
          <input
            name="firstName"
            autoComplete="given-name"
            required
            aria-invalid={Boolean(state.fieldErrors?.firstName)}
          />
          <FieldError message={state.fieldErrors?.firstName} />
        </label>
        <label>
          Last name
          <input
            name="lastName"
            autoComplete="family-name"
            required
            aria-invalid={Boolean(state.fieldErrors?.lastName)}
          />
          <FieldError message={state.fieldErrors?.lastName} />
        </label>
      </div>
      <label>
        Email address
        <input
          type="email"
          name="email"
          autoComplete="email"
          required
          aria-invalid={Boolean(state.fieldErrors?.email)}
        />
        <FieldError message={state.fieldErrors?.email} />
      </label>
      <label>
        Subject <span className="muted">(optional)</span>
        <input name="subject" maxLength={160} />
        <FieldError message={state.fieldErrors?.subject} />
      </label>
      <label>
        How can we help?
        <textarea
          name="message"
          rows={8}
          minLength={10}
          maxLength={5000}
          required
          aria-invalid={Boolean(state.fieldErrors?.message)}
        />
        <FieldError message={state.fieldErrors?.message} />
      </label>
      <label className="contact-honeypot" aria-hidden="true">
        Company
        <input name="company" tabIndex={-1} autoComplete="off" />
      </label>
      <button type="submit" className="button" disabled={pending}>
        {pending ? "Sending…" : "Send message"}
      </button>
      <p
        className={
          state.message ? (state.ok ? "cart-success" : "cart-error") : ""
        }
        aria-live="polite"
      >
        {state.message}
      </p>
    </form>
  );
}
