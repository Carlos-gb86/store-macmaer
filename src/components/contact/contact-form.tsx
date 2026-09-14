"use client";

import { useActionState, useEffect, useId, useRef } from "react";
import { submitContactFormAction } from "@/modules/contact/actions";
import { initialContactFormState } from "@/modules/contact/schema";
import { useStorefrontI18n } from "@/components/i18n/storefront-i18n";

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <span id={id} className="form-field-error">
      {message}
    </span>
  ) : null;
}

export function ContactForm() {
  const { locale } = useStorefrontI18n();
  const sv = locale === "sv";
  const [state, formAction, pending] = useActionState(
    submitContactFormAction,
    initialContactFormState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const errorPrefix = useId();

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok, state.submissionId]);

  return (
    <form ref={formRef} action={formAction} className="contact-form">
      <div className="contact-name-fields">
        <label>
          {sv ? "Förnamn" : "First name"}
          <input
            name="firstName"
            autoComplete="given-name"
            required
            aria-invalid={Boolean(state.fieldErrors?.firstName)}
            aria-describedby={
              state.fieldErrors?.firstName
                ? `${errorPrefix}-first-name`
                : undefined
            }
          />
          <FieldError
            id={`${errorPrefix}-first-name`}
            message={state.fieldErrors?.firstName}
          />
        </label>
        <label>
          {sv ? "Efternamn" : "Last name"}
          <input
            name="lastName"
            autoComplete="family-name"
            required
            aria-invalid={Boolean(state.fieldErrors?.lastName)}
            aria-describedby={
              state.fieldErrors?.lastName
                ? `${errorPrefix}-last-name`
                : undefined
            }
          />
          <FieldError
            id={`${errorPrefix}-last-name`}
            message={state.fieldErrors?.lastName}
          />
        </label>
      </div>
      <label>
        {sv ? "E-postadress" : "Email address"}
        <input
          type="email"
          name="email"
          autoComplete="email"
          required
          aria-invalid={Boolean(state.fieldErrors?.email)}
          aria-describedby={
            state.fieldErrors?.email ? `${errorPrefix}-email` : undefined
          }
        />
        <FieldError
          id={`${errorPrefix}-email`}
          message={state.fieldErrors?.email}
        />
      </label>
      <label>
        {sv ? "Ämne" : "Subject"}{" "}
        <span className="muted">({sv ? "valfritt" : "optional"})</span>
        <input
          name="subject"
          maxLength={160}
          aria-invalid={Boolean(state.fieldErrors?.subject)}
          aria-describedby={
            state.fieldErrors?.subject ? `${errorPrefix}-subject` : undefined
          }
        />
        <FieldError
          id={`${errorPrefix}-subject`}
          message={state.fieldErrors?.subject}
        />
      </label>
      <label>
        {sv ? "Hur kan vi hjälpa dig?" : "How can we help?"}
        <textarea
          name="message"
          rows={8}
          minLength={10}
          maxLength={5000}
          required
          aria-invalid={Boolean(state.fieldErrors?.message)}
          aria-describedby={
            state.fieldErrors?.message ? `${errorPrefix}-message` : undefined
          }
        />
        <FieldError
          id={`${errorPrefix}-message`}
          message={state.fieldErrors?.message}
        />
      </label>
      <label className="contact-honeypot" aria-hidden="true">
        {sv ? "Företag" : "Company"}
        <input name="company" tabIndex={-1} autoComplete="off" />
      </label>
      <button type="submit" className="button" disabled={pending}>
        {pending
          ? sv
            ? "Skickar…"
            : "Sending…"
          : sv
            ? "Skicka meddelande"
            : "Send message"}
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
