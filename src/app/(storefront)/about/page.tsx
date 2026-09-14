import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { ExternalArrow } from "@/components/ui/external-arrow";
import { getHomepage } from "@/modules/content/repository";
import { resolveImage } from "@/modules/media/resolve-image";
import { getStorefrontLocale } from "@/modules/i18n/server";
import { localizeHomepage } from "@/modules/i18n/localize";

export async function generateMetadata(): Promise<Metadata> {
  const sv = (await getStorefrontLocale()) === "sv";
  return {
    title: sv ? "Vår berättelse" : "Our story",
    description: sv
      ? "Möt Maria och upptäck hur Macmaers skulpturala knutprodukter designas och tillverkas för hand i Göteborg."
      : "Meet Maria and discover how Macmaer's sculptural knot pieces are designed and handmade in Gothenburg, Sweden.",
    alternates: { canonical: "/about" },
  };
}

export default async function AboutPage() {
  const [rawContent, locale] = await Promise.all([
    getHomepage(),
    getStorefrontLocale(),
  ]);
  const content = localizeHomepage(rawContent, locale);
  const swedish = locale === "sv";
  return (
    <>
      <Container className="page-section about-page">
        <header className="about-intro">
          <p className="eyebrow">{swedish ? "Vår berättelse" : "Our story"}</p>
          <h1>
            {swedish
              ? "Handgjort. Format av nyfikenhet."
              : "Made by hand. Shaped by curiosity."}
          </h1>
          <p>
            {swedish
              ? "Macmaer är en oberoende designstudio i Göteborg, grundad av Maria Botyan. Varje produkt börjar med en enkel tanke: sakerna vi lever med kan vara användbara, vackert tillverkade och fulla av personlighet på samma gång."
              : "Macmaer is an independent design studio in Gothenburg, Sweden, founded by Maria Botyan. Every piece begins with a simple idea: the things we live with can be useful, beautifully made and full of personality at the same time."}
          </p>
        </header>
      </Container>

      {content.story_visible && (
        <section className="story-section about-feature">
          <div className="story-image">
            <Image
              src={resolveImage(content.story_image)}
              alt={content.story_alt}
              fill
              loading="eager"
              fetchPriority="high"
              sizes="(max-width: 800px) 100vw, 50vw"
            />
          </div>
          <div className="story-copy">
            <p className="eyebrow">{content.story_eyebrow}</p>
            <h2>{content.story_title}</h2>
            {content.story_text.split(/\n\s*\n/).map((text, index) => (
              <p key={index}>{text}</p>
            ))}
          </div>
        </section>
      )}

      <Container>
        <div className="about-sections">
          <section>
            <p className="eyebrow">
              {swedish ? "Så började det" : "How it began"}
            </p>
            <h2>
              {swedish
                ? "En knut blev ett nytt sätt att se."
                : "A knot became a new point of view."}
            </h2>
            <p>
              {swedish
                ? "Macmaer tog form 2020 när Maria började utforska hur en knut kunde bli mer än ett dekorativt föremål. Det praktiska experimenterandet växte till vändbara kuddar, mjuka accessoarer och lekfulla former skapade för riktiga hem."
                : "Macmaer took shape in 2020, when Maria began exploring how a knot could become more than a decorative object. That hands-on experimentation grew into reversible pillows, soft accessories and playful forms designed to work in real homes."}
            </p>
            <p>
              {swedish
                ? "Sömnad hade länge varit en personlig passion. Genom Macmaer kunde hantverket bli en liten studio med fokus på genomtänkta detaljer, flexibel design och nära kontakt med varje kund."
                : "Sewing had long been a personal passion. Building Macmaer made it possible to turn that craft into a small studio centred on thoughtful details, adaptable design and close contact with each customer."}
            </p>
          </section>
          <section>
            <p className="eyebrow">{swedish ? "Processen" : "The process"}</p>
            <h2>
              {swedish
                ? "Långsamt skapande, genomtänkt från alla håll."
                : "Slow making, considered from every angle."}
            </h2>
            <p>
              {swedish
                ? "Nya former börjar med skisser, färg- och materialstudier och går sedan vidare till handgjorda experiment i full skala. Proportioner, struktur och mjukhet förfinas tillsammans tills uttryck och komfort är i balans."
                : "New designs start with sketches, colour and material studies, then move to full-scale experiments made by hand. Proportions, structure and softness are refined together until a piece feels expressive and comfortable."}
            </p>
            <p>
              {swedish
                ? "Varje beställning tillverkas individuellt i studion i Göteborg. Sömmar och fogar förstärks, formerna fylls för hand och den färdiga produkten kontrolleras innan den lämnar arbetsbordet."
                : "Each order is made individually in the Gothenburg studio. Seams and joins are reinforced, forms are filled by hand, and the final piece is checked before it leaves the worktable."}
            </p>
          </section>
          <section>
            <p className="eyebrow">
              {swedish ? "Material och skötsel" : "Materials & care"}
            </p>
            <h2>
              {swedish ? "Valda för att användas." : "Chosen to be lived with."}
            </h2>
            <p>
              {swedish
                ? "Tygerna kommer från europeiska leverantörer med fokus på certifierade textilier och giftfri, hypoallergen fyllning. Skötselråd följer med varje produkt så att form och struktur kan bevaras längre."
                : "Fabrics are sourced from European suppliers, with a focus on certified textiles and non-toxic, hypoallergenic filling. Care guidance accompanies each piece so its shape and texture can be enjoyed for longer."}
            </p>
            <p>
              {swedish
                ? "Eftersom tillverkningen sker på beställning kan färg- och materialval bli en del av designen från början."
                : "Because production is made to order, colour and material choices can become part of the design rather than an afterthought."}
            </p>
          </section>
        </div>
        <section className="about-cta">
          <p className="eyebrow">
            {swedish
              ? "Från vår studio till ditt hem"
              : "From our studio to your home"}
          </p>
          <h2>
            {swedish
              ? "Hitta produkten som känns som din."
              : "Find the piece that feels like yours."}
          </h2>
          <Link className="button" href="/shop">
            {swedish ? "Utforska kollektionen" : "Explore the collection"}{" "}
            <ExternalArrow />
          </Link>
        </section>
      </Container>
    </>
  );
}
