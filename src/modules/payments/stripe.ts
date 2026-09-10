import "server-only";
import Stripe from "stripe";
import { getServerEnv } from "@/lib/env/server";

export function getStripe() {
  const key = getServerEnv().STRIPE_SECRET_KEY;
  if (!key) throw new Error("Stripe is not configured.");
  return new Stripe(key, { appInfo: { name: "Macmaer Store" } });
}

export function usesLiveStripe() {
  return getServerEnv().STRIPE_SECRET_KEY?.startsWith("sk_live_") ?? false;
}
