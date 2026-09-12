"use server";

import { headers } from "next/headers";
import {
  contactFormSchema,
  type ContactField,
  type ContactFormState,
} from "./schema";
import { ContactSubmissionError, saveContactMessage } from "./repository";

function validationErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const fieldErrors: Partial<Record<ContactField, string>> = {};
  for (const issue of issues) {
    const field = issue.path[0];
    if (typeof field === "string" && !(field in fieldErrors))
      fieldErrors[field as ContactField] = issue.message;
  }
  return fieldErrors;
}

export async function submitContactFormAction(
  _previous: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  const submissionId = Date.now();
  const parsed = contactFormSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    subject: formData.get("subject") ?? "",
    message: formData.get("message"),
    company: formData.get("company") ?? "",
  });
  if (!parsed.success)
    return {
      ok: false,
      message: "Please check the highlighted fields.",
      submissionId,
      fieldErrors: validationErrors(parsed.error.issues),
    };

  // Silently accept the hidden honeypot so automated senders cannot probe it.
  if (parsed.data.company)
    return {
      ok: true,
      message: "Thank you. Your message is on its way.",
      submissionId,
    };

  try {
    const requestHeaders = await headers();
    const forwarded = requestHeaders.get("x-forwarded-for")?.split(",")[0];
    const identifier =
      forwarded?.trim() ||
      requestHeaders.get("x-real-ip") ||
      `email:${parsed.data.email}`;
    await saveContactMessage(parsed.data, identifier);
    return {
      ok: true,
      message:
        "Thank you. We’ve received your message and will reply by email.",
      submissionId,
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof ContactSubmissionError
          ? error.message
          : "Your message could not be sent right now. Please try again or email info@macmaer.com.",
      submissionId,
    };
  }
}
