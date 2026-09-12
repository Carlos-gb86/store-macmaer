"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ExpressCheckoutElement,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";

export function PaymentForm({
  orderId,
  orderNumber,
}: {
  orderId: string;
  orderNumber: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  async function confirm() {
    if (!stripe || !elements || submitting) return;
    const returnUrl = `${window.location.origin}/checkout/confirmation?order=${encodeURIComponent(orderId)}`;
    setSubmitting(true);
    setMessage("");
    const result = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl },
      redirect: "if_required",
    });
    if (result.error) {
      setMessage(result.error.message ?? "The payment could not be completed.");
      setSubmitting(false);
      return;
    }
    router.push(returnUrl);
  }

  return (
    <div className="payment-panel">
      <p className="eyebrow">Secure payment</p>
      <h2>Pay for {orderNumber}</h2>
      <ExpressCheckoutElement
        options={{ paymentMethods: { link: "never" } }}
        onConfirm={confirm}
      />
      <div className="payment-divider">
        <span>or pay by card</span>
      </div>
      <PaymentElement
        options={{ layout: "tabs", wallets: { link: "never" } }}
      />
      <p className="checkout-legal-note">
        By placing this order, you agree to the Terms of Sale and acknowledge
        the Returns/Withdrawal Policy and Privacy Policy.
      </p>
      {message && (
        <p className="cart-error" role="alert">
          {message}
        </p>
      )}
      <button
        className="button"
        type="button"
        onClick={confirm}
        disabled={!stripe || submitting}
      >
        {submitting ? "Processing payment…" : "Place order and pay"}
      </button>
    </div>
  );
}
