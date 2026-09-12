import type { Metadata } from "next";
import { Mail } from "lucide-react";
import { ContactForm } from "@/components/contact/contact-form";
import { SocialLinks } from "@/components/social/social-links";
import { Container } from "@/components/ui/container";

export const metadata: Metadata = {
  title: "Contact Macmaer",
  description:
    "Contact Macmaer about an order, a handmade piece, materials or delivery.",
};

export default function ContactPage() {
  return (
    <Container className="page-section contact-page">
      <div className="page-intro">
        <p className="eyebrow">Let’s talk</p>
        <h1>Get in touch.</h1>
        <p>
          Questions about a piece, your order, colours or delivery? Send a note
          and we’ll be happy to help.
        </p>
      </div>
      <div className="contact-layout">
        <aside className="contact-details">
          <p className="eyebrow">Email us</p>
          <a className="contact-email" href="mailto:info@macmaer.com">
            <Mail aria-hidden="true" strokeWidth={1.35} />
            info@macmaer.com
          </a>
          <p className="small muted">
            We read every message and reply as soon as we can from our studio in
            Sweden.
          </p>
          <div className="contact-social">
            <p className="eyebrow">Follow us</p>
            <SocialLinks />
          </div>
        </aside>
        <div className="contact-form-panel">
          <p className="eyebrow">Send a message</p>
          <h2>How can we help?</h2>
          <ContactForm />
        </div>
      </div>
    </Container>
  );
}
