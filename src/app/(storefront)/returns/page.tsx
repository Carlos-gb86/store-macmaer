import type { Metadata } from "next";
import Link from "next/link";
import { PolicyPage } from "@/components/policies/policy-page";
import { getStorefrontLocale } from "@/modules/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title:
      (await getStorefrontLocale()) === "sv"
        ? "Returer och ångerrätt"
        : "Returns and Withdrawal",
    robots: { index: false },
  };
}

export default async function ReturnsPage() {
  const sv = (await getStorefrontLocale()) === "sv";
  if (sv)
    return (
      <PolicyPage
        eyebrow="Kundservice"
        title="Returer, ångerrätt och reklamationer"
      >
        <h2>14 dagars ångerrätt</h2>
        <p>
          När svensk eller EU-rätt om distansavtal gäller har du normalt 14
          dagar från mottagandet att tydligt meddela Macmaer att du ångrar
          köpet, utan att ange något skäl. Du kan använda ångerfunktionen
          online, mejla <a href="mailto:info@macmaer.com">info@macmaer.com</a>{" "}
          eller använda Konsumentverkets standardblankett. Förhandsgodkännande
          krävs inte.
        </p>
        <p>
          Efter att du meddelat oss ska varan returneras inom 14 dagar. Vid
          vanlig ånger betalar du normalt den direkta returfrakten. Ett
          lagenligt avdrag får göras för en styrkt värdeminskning som beror på
          mer hantering än vad som rimligen behövdes för att undersöka
          produkten.
        </p>
        <h2>Återbetalningar</h2>
        <p>
          En giltig fullständig ånger omfattar de betalningar som ska
          återbetalas enligt lag och kostnaden för den billigaste
          standardleveransen. Tillägg för dyrare leverans behöver inte
          återbetalas när lagen medger det. Återbetalning sker normalt till
          ursprungligt betalningssätt och får, när det är tillåtet, hållas inne
          tills varan eller bevis på retur har tagits emot.
        </p>
        <h2>Personanpassade och rabatterade varor</h2>
        <p>
          Undantaget från ångerrätten är begränsat till varor som verkligen har
          tillverkats enligt individuella anvisningar eller fått en tydlig
          personlig prägel. Val av standardsortimentets storlek, färg, tyg, knut
          eller spänne omfattas inte automatiskt. Rabatterade varor behåller
          lagstadgade rättigheter.
        </p>
        <h2>Fel och reklamationer</h2>
        <p>
          Reklamation av en felaktig eller avtalsstridig vara är skild från
          ångerrätten. Svensk lag ger i allmänhet konsumenten tre års
          reklamationsrätt enligt lagens villkor. Kontakta oss med ordernummer
          och gärna en beskrivning eller bild. Macmaer står för kostnader och
          erbjuder de åtgärder som lagen kräver.
        </p>
        <p>
          Den offentliga <Link href="/withdrawal">ångerfunktionen online</Link>{" "}
          aktiveras innan beställning öppnar.
        </p>
      </PolicyPage>
    );
  return (
    <PolicyPage
      eyebrow="Customer care"
      title="Returns, Withdrawal and Complaints"
    >
      <h2>14-day withdrawal</h2>
      <p>
        Where Swedish or EU distance-selling law applies, you normally have 14
        days after receipt to tell Macmaer clearly that you are withdrawing,
        without giving a reason. You may use the online withdrawal function,
        email <a href="mailto:info@macmaer.com">info@macmaer.com</a>, or use the
        statutory model form. Prior approval is not required.
      </p>
      <p>
        After notifying us, return the goods within 14 days. You normally pay
        direct return shipping for an ordinary withdrawal. A lawful deduction
        may be made for proven loss of value caused by handling beyond what was
        reasonably necessary to inspect the product.
      </p>
      <h2>Refunds</h2>
      <p>
        A valid full withdrawal includes the refundable payments required by law
        and the original least-expensive standard delivery charge. Premium
        delivery supplements need not be refunded where law permits. Refunds
        normally return to the original payment method and may be withheld until
        the goods or evidence of dispatch are received where permitted.
      </p>
      <h2>Personalised and discounted goods</h2>
      <p>
        The withdrawal exception is limited to goods genuinely made to
        individual specifications or clearly personalised. Selecting standard
        size, colour, fabric, knot, or clasp options does not automatically
        qualify. Discounted goods retain statutory rights.
      </p>
      <h2>Defects and complaints</h2>
      <p>
        A complaint about defective or non-conforming goods is separate from
        withdrawal. Swedish law generally provides consumers a three-year
        complaint period, subject to its conditions. Contact us with the order
        number and a description or photo where practical. Macmaer bears costs
        and provides remedies required by law.
      </p>
      <p>
        The public <Link href="/withdrawal">online withdrawal function</Link>{" "}
        will be activated before ordering opens.
      </p>
    </PolicyPage>
  );
}
