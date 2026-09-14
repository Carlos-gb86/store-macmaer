import type { Metadata } from "next";
import { PolicyPage } from "@/components/policies/policy-page";
import { getStorefrontLocale } from "@/modules/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title:
      (await getStorefrontLocale()) === "sv"
        ? "Ångra en beställning"
        : "Withdraw from an order",
    robots: { index: false },
  };
}

export default async function WithdrawalPage() {
  const sv = (await getStorefrontLocale()) === "sv";
  if (sv)
    return (
      <PolicyPage eyebrow="Returer" title="Ångra en beställning">
        <p>
          Funktionen för att skicka ångermeddelande online och få en omedelbar
          elektronisk bekräftelse färdigställs tillsammans med ordersystemet för
          e-post. Beställning är avstängd tills denna lagstadgade funktion
          fungerar.
        </p>
        <p>
          Under tiden kan ett tydligt ångermeddelande skickas till{" "}
          <a href="mailto:info@macmaer.com">info@macmaer.com</a>. Ange namn,
          ordernummer, e-postadress för bekräftelse och ett tydligt meddelande
          om att du ångrar köpet.
        </p>
      </PolicyPage>
    );
  return (
    <PolicyPage eyebrow="Returns" title="Withdraw from an order">
      <p>
        The online withdrawal submission and immediate electronic receipt are
        being completed with the order email system. Ordering remains disabled
        until this legally required function is operational.
      </p>
      <p>
        In the meantime, a clear withdrawal notice can be sent to{" "}
        <a href="mailto:info@macmaer.com">info@macmaer.com</a>. Include your
        name, order number, the email address for confirmation, and a clear
        statement that you are withdrawing.
      </p>
    </PolicyPage>
  );
}
