import type { Metadata } from "next";
import { PolicyPage } from "@/components/policies/policy-page";
import { getStorefrontLocale } from "@/modules/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title:
      (await getStorefrontLocale()) === "sv"
        ? "Leveransvillkor"
        : "Shipping Policy",
    robots: { index: false },
  };
}

export default async function ShippingPage() {
  const sv = (await getStorefrontLocale()) === "sv";
  if (sv)
    return (
      <PolicyPage eyebrow="Kundservice" title="Leveransvillkor">
        <h2>Tillverkningstid</h2>
        <p>
          Standardbeställningar från katalogen skickas normalt inom 2–4
          arbetsdagar. Verkligt specialtillverkade eller personanpassade
          beställningar skickas normalt inom 4–7 arbetsdagar om ingen annan tid
          anges.
        </p>
        <h2>Fraktkostnader</h2>
        <p>
          Frakten beräknas i kassan utifrån konfigurerat leveransland och
          orderuppgifter. Frakt inom Sverige kostar för närvarande 80 SEK
          inklusive moms och är kostnadsfri när varuvärdet efter rabatter är
          minst 500 SEK. Övriga konfigurerade leveransländer har för närvarande
          ingen gräns för fri frakt. Beloppet i kassan gäller.
        </p>
        <h2>Beräknad transporttid efter avsändning</h2>
        <ul>
          <li>Sverige: 1–3 arbetsdagar.</li>
          <li>EU: 5–8 arbetsdagar.</li>
          <li>
            Australien, Kanada, Japan, Nya Zeeland, Sydkorea och USA: 6–12
            arbetsdagar.
          </li>
        </ul>
        <p>
          Tiderna är uppskattningar. Störningar hos transportören, helgdagar,
          väder, tull och gränskontroller kan orsaka förseningar utan att
          begränsa tvingande konsumenträttigheter.
        </p>
        <h2>Spårning, förlust och adresser</h2>
        <p>
          Beställningar är normalt spårbara där tjänsten stöds. Kontakta{" "}
          <a href="mailto:info@macmaer.com">info@macmaer.com</a> snarast vid
          förlust, skada, saknat innehåll eller en oförklarlig markering som
          levererad. Feladresserade eller ej uthämtade leveranser kan, när det
          är tillåtet, medföra endast faktiska och skäliga extra
          transportkostnader. Att inte hämta ut ett paket är inte i sig ett
          meddelande om ånger.
        </p>
      </PolicyPage>
    );
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
