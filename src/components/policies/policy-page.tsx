import { Children, isValidElement, type ReactNode } from "react";
import { Container } from "@/components/ui/container";

type PolicySection = { title: ReactNode; content: ReactNode[] };

function policySections(children: ReactNode): PolicySection[] {
  const sections: PolicySection[] = [];
  let current: PolicySection = { title: "Overview", content: [] };
  for (const child of Children.toArray(children)) {
    if (
      isValidElement<{ children?: ReactNode }>(child) &&
      child.type === "h2"
    ) {
      if (current.content.length) sections.push(current);
      current = { title: child.props.children, content: [] };
    } else current.content.push(child);
  }
  if (current.content.length) sections.push(current);
  return sections;
}

export function PolicyPage({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  const sections = policySections(children);
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
      <article className="policy-content policy-accordion">
        {sections.map((section, index) => (
          <details key={index} open={index === 0}>
            <summary>
              <span>{section.title}</span>
              <span className="policy-accordion-toggle" aria-hidden="true" />
            </summary>
            <div className="policy-accordion-panel">{section.content}</div>
          </details>
        ))}
      </article>
    </Container>
  );
}
