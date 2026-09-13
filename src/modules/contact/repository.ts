import "server-only";

import { createHmac } from "node:crypto";
import { z } from "zod";
import { createServiceSupabaseClient } from "@/lib/supabase/service";
import { getServerEnv } from "@/lib/env/server";
import type { ContactFormInput } from "./schema";

export class ContactSubmissionError extends Error {
  override name = "ContactSubmissionError";
}

const savedContactSchema = z.object({
  id: z.uuid(),
  first_name: z.string(),
  last_name: z.string(),
  email: z.email(),
  subject: z.string(),
  message: z.string(),
});

function senderHash(value: string) {
  const secret = getServerEnv().CUSTOMER_IDENTITY_HASH_SECRET;
  if (!secret)
    throw new ContactSubmissionError(
      "The contact form is temporarily unavailable. Please email info@macmaer.com.",
    );
  return createHmac("sha256", secret).update(value).digest("hex");
}

export async function saveContactMessage(
  input: ContactFormInput,
  requestIdentifier: string,
) {
  const client = createServiceSupabaseClient();
  const hash = senderHash(requestIdentifier);
  const { data, error } = await client.rpc("submit_contact_message", {
    document: {
      first_name: input.firstName,
      last_name: input.lastName,
      email: input.email,
      subject: input.subject,
      message: input.message,
      sender_hash: hash,
    },
  });
  if (error) {
    if (/too many messages/i.test(error.message))
      throw new ContactSubmissionError(
        "Too many messages were sent recently. Please wait a while or email info@macmaer.com.",
      );
    throw error;
  }
  const saved = savedContactSchema.parse(data);
  return {
    id: saved.id,
    firstName: saved.first_name,
    lastName: saved.last_name,
    email: saved.email,
    subject: saved.subject,
    message: saved.message,
  };
}
