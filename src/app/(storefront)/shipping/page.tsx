import type { Metadata } from "next";
import { PolicyPage } from "@/components/policies/policy-page";

export const metadata: Metadata = {
  title: "Shipping Policy",
  robots: { index: false },
};

export default function ShippingPage() {
  return (
    <PolicyPage eyebrow="Customer care" title="Shipping Policy">
      <h2>Processing</h2>
      <p>
        Standard catalogue orders normally dispatch in 2–4 business days.
        Genuinely custom or personalised orders normally dispatch in 4–7
        business days unless another lead time is shown.
      </p>
      <h2>Shipping costs</h2>
      <p>
        Shipping is calculated at checkout from the configured destination and
        order details. Sweden currently costs 80 SEK including VAT and is free
        when the merchandise subtotal after discounts is at least 500 SEK. Other
        configured destinations currently have no free-shipping threshold. The
        checkout amount is controlling.
      </p>
      <h2>Estimated transit after dispatch</h2>
      <ul>
        <li>Sweden: 1–3 business days.</li>
        <li>EU: 5–8 business days.</li>
        <li>
          Australia, Canada, Japan, New Zealand, South Korea, and the United
          States: 6–12 business days.
        </li>
      </ul>
      <p>
        These are estimates. Carrier disruption, holidays, weather, customs, and
        border controls can cause delay without limiting mandatory consumer
        remedies.
      </p>
      <h2>Tracking, loss and addresses</h2>
      <p>
        Orders are normally tracked where supported. Contact{" "}
        <a href="mailto:info@macmaer.com">info@macmaer.com</a> promptly about
        loss, damage, missing contents, or an unexplained delivered scan.
        Incorrect or unclaimed deliveries may incur only actual reasonable
        additional transport costs where permitted. Not collecting a parcel is
        not itself a withdrawal notice.
      </p>
    </PolicyPage>
  );
}
