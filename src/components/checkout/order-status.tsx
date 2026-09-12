"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { formatMoney } from "@/modules/currency/money";
import type { Currency } from "@/modules/currency/schema";

type Status = {
  order_number: string;
  status: string;
  payment_status: string;
  currency: Currency;
  total_amount: number;
  customer_email: string;
};

export function OrderStatus({
  orderId,
  initial,
}: {
  orderId: string;
  initial: Status;
}) {
  const [order, setOrder] = useState(initial);
  const [takingLonger, setTakingLonger] = useState(false);
  useEffect(() => {
    if (
      ["SUCCEEDED", "FAILED", "REFUNDED", "PARTIALLY_REFUNDED"].includes(
        order.payment_status,
      )
    )
      return;
    const timer = window.setInterval(async () => {
      const response = await fetch("/api/orders/status", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      if (response.ok) setOrder((await response.json()) as Status);
    }, 2000);
    return () => window.clearInterval(timer);
  }, [order.payment_status, orderId]);
  useEffect(() => {
    if (
      ["SUCCEEDED", "FAILED", "REFUNDED", "PARTIALLY_REFUNDED"].includes(
        order.payment_status,
      )
    )
      return;
    const timer = window.setTimeout(() => setTakingLonger(true), 10_000);
    return () => window.clearTimeout(timer);
  }, [order.payment_status]);

  const paid = order.payment_status === "SUCCEEDED";
  const failed = order.payment_status === "FAILED";
  const pending = !paid && !failed;
  return (
    <div
      className={`confirmation-card confirmation-card--${paid ? "paid" : failed ? "failed" : "pending"}`}
      aria-live="polite"
    >
      <div className="confirmation-visual" aria-hidden="true">
        {pending && <span className="confirmation-spinner" />}
        <Image
          src="/logo/logo-macmaer.png"
          alt=""
          width={1185}
          height={1104}
          priority
        />
        {paid && (
          <>
            <span className="celebration-dot celebration-dot--one" />
            <span className="celebration-dot celebration-dot--two" />
            <span className="celebration-dot celebration-dot--three" />
          </>
        )}
      </div>
      <p className="eyebrow">Order {order.order_number}</p>
      <h1>
        {paid
          ? "Thank you for your order."
          : failed
            ? "Payment was not completed."
            : "Payment submitted."}
      </h1>
      <p>
        {paid
          ? `Payment of ${formatMoney(order.total_amount, order.currency)} is confirmed. We’ve sent a confirmation email to ${order.customer_email} with the receipt for your purchase. We’ll prepare your order with care.`
          : failed
            ? "Your order has not been marked as paid. Return to your cart to try again or contact us if you need help."
            : "We’re securely verifying the payment with Stripe. Keep this page open; it updates automatically. Please do not submit another payment."}
      </p>
      {!paid && !failed && takingLonger && (
        <p className="cart-notice">
          This is taking longer than expected. Your order reference is{" "}
          {order.order_number}. Do not try to pay again. You may safely close
          this page and contact{" "}
          <a href="mailto:info@macmaer.com">info@macmaer.com</a> if the status
          does not update.
        </p>
      )}
      {pending && (
        <div className="confirmation-progress" aria-hidden="true">
          <span />
        </div>
      )}
      <p className="status-pill">
        Payment: {order.payment_status.toLowerCase().replaceAll("_", " ")}
      </p>
      {paid && (
        <Link href="/shop" className="button">
          Continue shopping
        </Link>
      )}
      {failed && (
        <Link href="/cart" className="button">
          Return to cart
        </Link>
      )}
    </div>
  );
}
