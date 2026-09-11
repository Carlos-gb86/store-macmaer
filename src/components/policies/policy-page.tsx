import type { ReactNode } from "react";
import { Container } from "@/components/ui/container";

export function PolicyPage({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <Container className="page-section policy-page">
      <header className="page-intro">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="policy-draft">
          Pre-launch draft updated 11 September 2026. Ordering remains disabled
          pending final legal review and activation of the online withdrawal
          function.
        </p>
      </header>
      <article className="policy-content">{children}</article>
    </Container>
  );
}
