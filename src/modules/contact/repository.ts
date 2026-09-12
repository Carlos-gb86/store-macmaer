import "server-only";

import { createHmac } from "node:crypto";
import { createServiceSupabaseClient } from "@/lib/supabase/service";
import { getServerEnv } from "@/lib/env/server";
import type { ContactFormInput } from "./schema";

export class ContactSubmissionError extends Error {
  override name = "ContactSubmissionError";
}

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
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error: countError } = await client
    .from("contact_messages")
    .select("id", { count: "exact", head: true })
    .eq("sender_hash", hash)
    .gte("created_at", oneHourAgo);
  if (countError) throw countError;
  if ((count ?? 0) >= 5)
    throw new ContactSubmissionError(
      "Too many messages were sent recently. Please wait a while or email info@macmaer.com.",
    );

  const { data, error } = await client
    .from("contact_messages")
    .insert({
      first_name: input.firstName,
      last_name: input.lastName,
      email: input.email,
      subject: input.subject,
      message: input.message,
      sender_hash: hash,
    })
    .select("id,first_name,last_name,email,subject,message")
    .single();
  if (error) throw error;
  return {
    id: data.id,
    firstName: data.first_name,
    lastName: data.last_name,
    email: data.email,
    subject: data.subject,
    message: data.message,
  };
}
