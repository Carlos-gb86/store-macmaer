"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { formatMoney } from "@/modules/currency/money";
import type { Currency } from "@/modules/currency/schema";
import type { CartOptionSnapshot } from "@/modules/cart/schema";
import { formatOptions } from "@/modules/cart/format-options";
import { useStorefrontI18n } from "@/components/i18n/storefront-i18n";

type Status = {
  order_number: string;
  status: string;
  payment_status: string;
  currency: Currency;
  total_amount: number;
  customer_email: string;
  items: Array<{
    id: string;
    title: string;
    quantity: number;
    options: CartOptionSnapshot[];
  }>;
};

function paymentStatusLabel(status: string, swedish: boolean) {
  const normalized = status.toLowerCase().replaceAll("_", " ");
  if (!swedish) return normalized;
  return (
    {
      requires_payment: "inväntar betalning",
      processing: "behandlas",
      succeeded: "betald",
      failed: "misslyckad",
      canceled: "avbruten",
      refunded: "återbetald",
      partially_refunded: "delvis återbetald",
    }[status.toLowerCase()] ?? normalized
  );
}

export function OrderStatus({
  orderId,
  initial,
}: {
  orderId: string;
  initial: Status;
}) {
  const { locale } = useStorefrontI18n();
  const sv = locale === "sv";
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
          loading="eager"
        />
        {paid && (
          <>
            <span className="celebration-dot celebration-dot--one" />
            <span className="celebration-dot celebration-dot--two" />
            <span className="celebration-dot celebration-dot--three" />
          </>
        )}
      </div>
      <p className="eyebrow">
        {sv ? "Beställning" : "Order"} {order.order_number}
      </p>
      <h1>
        {paid
          ? sv
            ? "Tack för din beställning."
            : "Thank you for your order."
          : failed
            ? sv
              ? "Betalningen genomfördes inte."
              : "Payment was not completed."
            : sv
              ? "Betalningen har skickats."
              : "Payment submitted."}
      </h1>
      <p>
        {paid
          ? sv
            ? `Betalningen på ${formatMoney(order.total_amount, order.currency)} är bekräftad. Vi har skickat ett bekräftelsemejl till ${order.customer_email} med kvittot för ditt köp. Vi förbereder din beställning med omsorg.`
            : `Payment of ${formatMoney(order.total_amount, order.currency)} is confirmed. We’ve sent a confirmation email to ${order.customer_email} with the receipt for your purchase. We’ll prepare your order with care.`
          : failed
            ? sv
              ? "Din beställning har inte markerats som betald. Gå tillbaka till varukorgen för att försöka igen eller kontakta oss om du behöver hjälp."
              : "Your order has not been marked as paid. Return to your cart to try again or contact us if you need help."
            : sv
              ? "Vi verifierar betalningen säkert med Stripe. Låt sidan vara öppen; den uppdateras automatiskt. Skicka inte en ny betalning."
              : "We’re securely verifying the payment with Stripe. Keep this page open; it updates automatically. Please do not submit another payment."}
      </p>
      {!paid && !failed && takingLonger && (
        <p className="cart-notice">
          {sv
            ? "Detta tar längre tid än väntat. Ditt ordernummer är "
            : "This is taking longer than expected. Your order reference is "}
          {order.order_number}.{" "}
          {sv
            ? "Försök inte betala igen. Du kan stänga sidan och kontakta "
            : "Do not try to pay again. You may safely close this page and contact "}
          <a href="mailto:info@macmaer.com">info@macmaer.com</a>
          {sv ? " om statusen inte uppdateras." : " does not update."}
        </p>
      )}
      {pending && (
        <div className="confirmation-progress" aria-hidden="true">
          <span />
        </div>
      )}
      <p className="status-pill">
        {sv ? "Betalning" : "Payment"}:{" "}
        {paymentStatusLabel(order.payment_status, sv)}
      </p>
      <div className="confirmation-items">
        <h2>{sv ? "Dina produkter" : "Your pieces"}</h2>
        {order.items.map((item) => (
          <div key={item.id}>
            <strong>
              {item.title} × {item.quantity}
            </strong>
            {formatOptions(item.options).map((option, index) => (
              <span key={`${index}:${option}`}>{option}</span>
            ))}
          </div>
        ))}
      </div>
      {paid && (
        <Link href="/shop" className="button">
          {sv ? "Fortsätt handla" : "Continue shopping"}
        </Link>
      )}
      {failed && (
        <Link href="/cart" className="button">
          {sv ? "Tillbaka till varukorgen" : "Return to cart"}
        </Link>
      )}
    </div>
  );
}
