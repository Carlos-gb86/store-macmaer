import { Container } from "@/components/ui/container";

export function PolicyHeadingPage({ title }: { title: string }) {
  return (
    <Container className="page-section policy-heading-page">
      <h1>{title}</h1>
    </Container>
  );
}
