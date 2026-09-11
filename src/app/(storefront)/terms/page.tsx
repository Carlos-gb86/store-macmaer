import type { Metadata } from "next";
import Link from "next/link";
import { PolicyPage } from "@/components/policies/policy-page";

export const metadata: Metadata = {
  title: "Terms of Sale",
  robots: { index: false },
};

export default function TermsPage() {
  return (
    <PolicyPage eyebrow="Legal" title="Terms of Sale and Website Use">
      <p>
        These draft terms apply when you browse macmaer.com or place an order
        with Maria Botyan, a Swedish sole trader trading as Macmaer,
        identification number 19820627-4345 and VAT number SE820627434501.
        Nothing in them limits mandatory consumer rights.
      </p>
      <h2>Products and handmade variations</h2>
      <p>
        We aim to describe and photograph every product accurately. Dimensions
        are approximate, handmade details and natural materials can vary, and
        colours can differ between screens. These normal variations do not
        remove rights relating to defective, unsafe, or non-conforming goods.
      </p>
      <h2>Prices, VAT and currencies</h2>
      <p>
        The displayed retail product price remains the customer price even where
        Macmaer collects 0% VAT. Where VAT is chargeable, it is included within
        that price unless checkout expressly says otherwise. Shipping and any
        non-included import charges are shown separately. The final amount and
        currency shown immediately before payment control the order.
      </p>
      <h2>Ordering and payment</h2>
      <p>
        Checkout shows the selected products, options, destination, shipping,
        discounts, VAT and final total before payment. You can correct details
        before submitting. An order remains subject to availability, successful
        payment, delivery restrictions, and fraud or legal checks. Payment
        status is confirmed by Stripe’s server notification rather than a
        browser redirect.
      </p>
      <h2>Delivery, withdrawal and complaints</h2>
      <p>
        Processing and delivery estimates are not guarantees. Macmaer remains
        responsible during consumer transport as required by law. Eligible
        consumers normally have 14 days to give clear notice of withdrawal.
        Genuinely personalised items may be excluded only where the legal
        exception applies; ordinary catalogue choices do not automatically
        remove the right. Swedish consumer complaint rights for defective goods
        are separate from withdrawal rights.
      </p>
      <h2>Disputes and contact</h2>
      <p>
        Swedish law applies without depriving consumers of mandatory protections
        in their country of residence. Eligible disputes may be referred to
        Allmänna reklamationsnämnden (ARN) or a competent court. Contact{" "}
        <a href="mailto:info@macmaer.com">info@macmaer.com</a>. See the{" "}
        <Link href="/shipping">Shipping Policy</Link>,{" "}
        <Link href="/returns">Returns Policy</Link>, and{" "}
        <Link href="/privacy">Privacy Policy</Link>.
      </p>
      <h2>Trader information</h2>
      <address>
        Maria Botyan, sole trader trading as Macmaer
        <br />
        Trombongatan 22B, 421 51 Västra Frölunda, Sweden
        <br />
        <a href="mailto:info@macmaer.com">info@macmaer.com</a>
        <br />
        <a href="tel:+46728748756">+46 72 874 87 56</a>
      </address>
    </PolicyPage>
  );
}
