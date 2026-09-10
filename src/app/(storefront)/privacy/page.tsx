import type { Metadata } from "next";
import { PolicyPage } from "@/components/policies/policy-page";

export const metadata: Metadata = {
  title: "Privacy Policy",
  robots: { index: false },
};

export default function PrivacyPage() {
  return (
    <PolicyPage eyebrow="Legal" title="Privacy Policy">
      <p>
        Macmaer processes personal data needed to operate the store, fulfil
        orders, provide support, manage returns and complaints, meet legal
        duties, and protect the service. Final controller identity and address
        details will be added before ordering opens.
      </p>
      <h2>Data we use</h2>
      <p>
        This can include your name, email, telephone number, addresses,
        destination, order and product choices, shipping and return information,
        communications, payment status and identifiers, limited card metadata
        supplied by Stripe, and technical or security logs. Macmaer does not
        store full card numbers or card security codes.
      </p>
      <h2>Purpose and legal basis</h2>
      <p>
        Order processing and ordinary support rely principally on contract;
        bookkeeping and tax records on legal obligations; and security, fraud
        prevention, legal claims, and carefully assessed operations on
        legitimate interests. Optional email marketing and non-essential
        tracking use consent where required and are not conditions of purchase.
      </p>
      <h2>Recipients and international transfers</h2>
      <p>
        Necessary data may be shared with Stripe, Supabase, Vercel, the future
        transactional email provider, couriers, accounting providers, advisers,
        and authorities where required. Applicable safeguards will be verified
        for processing outside the EEA before launch.
      </p>
      <h2>Retention and your rights</h2>
      <p>
        Records are retained only as long as needed, except where accounting,
        tax, or legal-claim requirements require longer storage. Depending on
        the circumstances, you may request access, correction, deletion,
        restriction, portability, or object to processing and direct marketing.
        You may withdraw consent and complain to Integritetsskyddsmyndigheten
        (IMY).
      </p>
      <h2>Contact and security</h2>
      <p>
        Contact <a href="mailto:info@macmaer.com">info@macmaer.com</a> for
        privacy questions or rights requests. Macmaer uses proportionate
        security controls, keeps server credentials out of browser code, and
        uses Stripe-hosted payment fields.
      </p>
    </PolicyPage>
  );
}
