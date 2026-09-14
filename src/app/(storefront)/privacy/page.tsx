import type { Metadata } from "next";
import { PolicyPage } from "@/components/policies/policy-page";
import { getStorefrontLocale } from "@/modules/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title:
      (await getStorefrontLocale()) === "sv"
        ? "Integritetspolicy"
        : "Privacy Policy",
    robots: { index: false },
  };
}

export default async function PrivacyPage() {
  const sv = (await getStorefrontLocale()) === "sv";
  if (sv)
    return (
      <PolicyPage eyebrow="Juridiskt" title="Integritetspolicy">
        <p>
          Maria Botyan, svensk enskild näringsidkare som bedriver verksamhet
          under namnet Macmaer, är personuppgiftsansvarig. Macmaer behandlar de
          personuppgifter som behövs för att driva butiken, fullgöra
          beställningar, ge support, hantera returer och reklamationer, uppfylla
          rättsliga skyldigheter och skydda tjänsten.
        </p>
        <h2>Uppgifter vi använder</h2>
        <p>
          Det kan omfatta namn, e-postadress, telefonnummer, adresser,
          leveransland, beställnings- och produktval, leverans- och
          returinformation, kommunikation, betalningsstatus och identifierare,
          begränsade kortuppgifter från Stripe samt tekniska loggar och
          säkerhetsloggar. Macmaer lagrar inte fullständiga kortnummer eller
          säkerhetskoder.
        </p>
        <h2>Ändamål och rättslig grund</h2>
        <p>
          Beställningshantering och vanlig support grundas främst på avtal,
          bokförings- och skatteuppgifter på rättslig förpliktelse och säkerhet,
          bedrägeriförebyggande, rättsliga anspråk och noggrant bedömd drift på
          berättigat intresse. Frivillig e-postmarknadsföring och icke nödvändig
          spårning grundas på samtycke när det krävs och är inte villkor för
          köp.
        </p>
        <h2>Mottagare och överföring till tredje land</h2>
        <p>
          Nödvändiga uppgifter kan delas med Stripe, Supabase, Vercel,
          leverantören av transaktionsmejl, transportörer, redovisningsföretag,
          rådgivare och myndigheter när det krävs. Tillämpliga skyddsåtgärder
          för behandling utanför EES ska verifieras före lansering.
        </p>
        <h2>Lagring och dina rättigheter</h2>
        <p>
          Uppgifter sparas bara så länge de behövs, utom när bokförings-,
          skatte- eller rättsliga krav kräver längre lagring. Beroende på
          omständigheterna kan du begära tillgång, rättelse, radering,
          begränsning eller dataportabilitet samt invända mot behandling och
          direktmarknadsföring. Du kan återkalla samtycke och klaga hos
          Integritetsskyddsmyndigheten (IMY).
        </p>
        <h2>Kontakt och säkerhet</h2>
        <p>
          Kontakta <a href="mailto:info@macmaer.com">info@macmaer.com</a> vid
          frågor eller för att utöva dina rättigheter, eller skriv till
          Trombongatan 22B, 421 51 Västra Frölunda. Macmaer använder
          proportionerliga säkerhetsåtgärder, håller serveruppgifter utanför
          webbläsarkoden och använder betalningsfält som driftas av Stripe.
        </p>
      </PolicyPage>
    );
  return (
    <PolicyPage eyebrow="Legal" title="Privacy Policy">
      <p>
        Maria Botyan, a Swedish sole trader trading as Macmaer, is the data
        controller. Macmaer processes personal data needed to operate the store,
        fulfil orders, provide support, manage returns and complaints, meet
        legal duties, and protect the service.
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
        privacy questions or rights requests, or write to Trombongatan 22B, 421
        51 Västra Frölunda, Sweden. Macmaer uses proportionate security
        controls, keeps server credentials out of browser code, and uses
        Stripe-hosted payment fields.
      </p>
    </PolicyPage>
  );
}
