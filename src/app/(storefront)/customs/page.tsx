import type { Metadata } from "next";
import { PolicyPage } from "@/components/policies/policy-page";
import { getStorefrontLocale } from "@/modules/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title:
      (await getStorefrontLocale()) === "sv"
        ? "Moms, valuta och tull"
        : "VAT, Currency and Customs",
    robots: { index: false },
  };
}

export default async function CustomsPage() {
  const sv = (await getStorefrontLocale()) === "sv";
  if (sv)
    return (
      <PolicyPage eyebrow="Priser" title="Moms, valuta och tull">
        <h2>Fasta kundpriser</h2>
        <p>
          Ett visat produktpris förblir produktpriset när leveranslandet ändras.
          En produkt för 500 SEK kostar exempelvis fortfarande 500 SEK i
          Sverige, där tillämplig moms visas som en del av priset, och 500 SEK
          där Macmaer tar ut 0 procent moms.
        </p>
        <h2>Destinationsmoms</h2>
        <p>
          När lagen kräver det beräknas momsen från leveranslandet med
          serverstyrda, konfigurerbara regler. Valutan avgör inte
          skattejurisdiktionen. Kassan visar momsen som ingår eller tas ut och
          ordern bevarar den exakta skattekonfiguration som användes.
        </p>
        <h2>SEK, EUR och USD</h2>
        <p>
          Den exakta valuta och totalsumma som visas omedelbart före betalning
          är beloppet som debiteras. Omräknade priser kan avrundas och ändras
          innan en order skapas när konfigurerade växelkurser ändras. Banker och
          kortutgivare kan lägga till egna växlings- eller utlandsavgifter.
        </p>
        <h2>Importavgifter</h2>
        <p>
          Om inget annat uttryckligen anges i kassan tar Macmaer inte ut tull,
          importmoms, mäklaravgift eller transportörens hanteringsavgift i
          destinationslandet. Dessa kan debiteras mottagaren. Lokala myndigheter
          och transportörer bestämmer belopp och tid för tullklarering.
        </p>
      </PolicyPage>
    );
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
