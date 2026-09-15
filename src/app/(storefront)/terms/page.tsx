import type { Metadata } from "next";
import Link from "next/link";
import { PolicyPage } from "@/components/policies/policy-page";
import { getStorefrontLocale } from "@/modules/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title:
      (await getStorefrontLocale()) === "sv" ? "Köpvillkor" : "Terms of Sale",
    robots: { index: false },
  };
}

export default async function TermsPage() {
  const sv = (await getStorefrontLocale()) === "sv";
  if (sv)
    return (
      <PolicyPage
        eyebrow="Juridiskt"
        title="Köpvillkor och användning av webbplatsen"
      >
        <p>
          Dessa villkor gäller när du besöker webbplatsen eller beställer från
          Maria Botyan, en svensk enskild näringsidkare som bedriver verksamhet
          under namnet Macmaer, personnummer 19820627-4345 och
          momsregistreringsnummer SE820627434501. Inget i villkoren begränsar
          tvingande konsumenträttigheter.
        </p>
        <h2>Produkter och variationer i hantverket</h2>
        <p>
          Vi strävar efter att beskriva och fotografera varje produkt korrekt.
          Måtten är ungefärliga, handgjorda detaljer och naturmaterial kan
          variera och färger kan återges olika på olika skärmar. Sådana normala
          variationer påverkar inte rättigheter som gäller felaktiga, osäkra
          eller avtalsstridiga varor.
        </p>
        <h2>Priser, moms och valutor</h2>
        <p>
          Det visade detaljhandelspriset är kundens produktpris även när Macmaer
          tar ut 0 procent moms. När moms ska tas ut ingår den i priset om inget
          annat uttryckligen anges i kassan. Frakt och eventuella importavgifter
          som inte ingår visas separat. Det slutliga beloppet och valutan som
          visas omedelbart före betalning gäller för beställningen.
        </p>
        <h2>Beställning och betalning</h2>
        <p>
          I kassan visas valda produkter och alternativ, leveransland, frakt,
          rabatter, moms och slutsumma före betalning. Du kan rätta uppgifter
          innan du skickar beställningen. Beställningen förutsätter
          tillgänglighet, godkänd betalning, leveransmöjlighet samt eventuella
          bedrägeri- och lagkontroller. Betalningsstatus bekräftas av Stripes
          servermeddelande, inte av en omdirigering i webbläsaren.
        </p>
        <h2>Leverans, ångerrätt och reklamation</h2>
        <p>
          Tider för tillverkning och leverans är uppskattningar, inte garantier.
          Macmaer ansvarar under konsumenttransport enligt lag. Berättigade
          konsumenter har normalt 14 dagar att tydligt meddela att de ångrar
          köpet. Verkligt personanpassade produkter kan undantas endast när det
          lagstadgade undantaget gäller; vanliga katalogval tar inte automatiskt
          bort ångerrätten. Reklamationsrätt för felaktiga varor är skild från
          ångerrätten.
        </p>
        <h2>Tvister och kontakt</h2>
        <p>
          Svensk lag gäller utan att frånta konsumenten tvingande skydd i
          bosättningslandet. Behöriga tvister kan prövas av Allmänna
          reklamationsnämnden (ARN) eller behörig domstol. Kontakta{" "}
          <a href="mailto:info@macmaer.com">info@macmaer.com</a>. Se även{" "}
          <Link href="/shipping">leveransvillkoren</Link>,{" "}
          <Link href="/returns">returvillkoren</Link> och{" "}
          <Link href="/privacy">integritetspolicyn</Link>.
        </p>
        <h2>Företagsinformation</h2>
        <address>
          <strong>Maria Botyan</strong>
          {/* <br />
          Enskild näringsidkare som bedriver verksamhet under namnet{" "}
          <strong>Macmaer</strong>
          <br />
          Personnummer: 19820627-4345
          <br />
          Momsregistreringsnummer: SE820627434501
          <br />
          <br />
          Företagsadress:
          <br />
          Trombongatan 22B, 421 51 Västra Frölunda, Sverige
          <br />
          Returadress: företagsadressen ovan om inget annat meddelas när returen
          ordnas.
          <br />
          <br />
          E-post: <a href="mailto:info@macmaer.com">info@macmaer.com</a>
          <br />
          Telefon: <a href="tel:+46728748756">072-874 87 56</a> (+46 72 874 87
          56 från utlandet) */}
        </address>
      </PolicyPage>
    );
  return (
    <PolicyPage eyebrow="Legal" title="Terms of Sale and Website Use">
      <p>
        These draft terms apply when you browse this website or place an order
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
        <strong>Maria Botyan</strong>
        {/* <br />
        Sole trader (enskild näringsidkare) trading as <strong>Macmaer</strong>
        <br />
        Identification number: 19820627-4345
        <br />
        VAT registration number: SE820627434501
        <br />
        <br />
        Business address:
        <br />
        Trombongatan 22B, 421 51 Västra Frölunda, Sweden
        <br />
        Return address: the business address above unless otherwise instructed
        when arranging a return.
        <br />
        <br />
        Email: <a href="mailto:info@macmaer.com">info@macmaer.com</a>
        <br />
        Telephone: <a href="tel:+46728748756">072-874 87 56</a> (+46 72 874 87
        56 from outside Sweden) */}
      </address>
    </PolicyPage>
  );
}
