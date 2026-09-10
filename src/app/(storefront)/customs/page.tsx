import type { Metadata } from "next";
import { PolicyPage } from "@/components/policies/policy-page";

export const metadata: Metadata = {
  title: "VAT, Currency and Customs",
  robots: { index: false },
};

export default function CustomsPage() {
  return (
    <PolicyPage eyebrow="Pricing" title="VAT, Currency and Customs">
      <h2>Fixed customer-facing retail prices</h2>
      <p>
        A displayed product price remains the product price when the destination
        changes. For example, a 500 SEK product remains 500 SEK in Sweden, with
        applicable VAT shown as part of that price, and remains 500 SEK where
        Macmaer collects 0% VAT.
      </p>
      <h2>Destination VAT</h2>
      <p>
        Where legally applicable, VAT is calculated from the shipping
        destination using server-controlled, configurable rules. Currency
        selection does not determine tax jurisdiction. The checkout shows the
        VAT included or charged, and the order preserves the exact tax
        configuration used.
      </p>
      <h2>SEK, EUR and USD</h2>
      <p>
        The exact currency and total shown immediately before payment are the
        amount charged. Converted prices can be rounded and can change before an
        order is created as configured rates change. Banks and card issuers may
        add their own conversion or cross-border fees.
      </p>
      <h2>Import charges</h2>
      <p>
        Unless checkout expressly says otherwise, Macmaer does not collect
        destination-country customs duties, import VAT, brokerage, or carrier
        handling fees. These may be charged to the recipient. Local authorities
        and carriers control their amounts and clearance timing.
      </p>
    </PolicyPage>
  );
}
