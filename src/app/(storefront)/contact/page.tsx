import type { Metadata } from "next";
import { Mail } from "lucide-react";
import { ContactForm } from "@/components/contact/contact-form";
import { SocialLinks } from "@/components/social/social-links";
import { Container } from "@/components/ui/container";
import { getStorefrontLocale } from "@/modules/i18n/server";
import { storefrontMessages } from "@/modules/i18n/messages";

export async function generateMetadata(): Promise<Metadata> {
  const sv = (await getStorefrontLocale()) === "sv";
  return {
    title: sv ? "Kontakta Macmaer" : "Contact Macmaer",
    description: sv
      ? "Kontakta Macmaer om en beställning, en handgjord produkt, material eller leverans."
      : "Contact Macmaer about an order, a handmade piece, materials or delivery.",
    alternates: { canonical: "/contact" },
  };
}

export default async function ContactPage() {
  const locale = await getStorefrontLocale();
  const t = storefrontMessages[locale];
  return (
    <Container className="page-section contact-page">
      <div className="page-intro">
        <p className="eyebrow">{t.contactEyebrow}</p>
        <h1>{t.contactTitle}</h1>
        <p>{t.contactIntro}</p>
      </div>
      <div className="contact-layout">
        <aside className="contact-details">
          <p className="eyebrow">{t.emailUs}</p>
          <a className="contact-email" href="mailto:info@macmaer.com">
            <Mail aria-hidden="true" strokeWidth={1.35} />
            info@macmaer.com
          </a>
          <p className="small muted">{t.contactReply}</p>
          <div className="contact-social">
            <p className="eyebrow">{t.followUs}</p>
            <SocialLinks locale={locale} />
          </div>
        </aside>
        <div className="contact-form-panel">
          <p className="eyebrow">{t.sendMessage}</p>
          <h2>{t.howHelp}</h2>
          <ContactForm />
        </div>
      </div>
    </Container>
  );
}
