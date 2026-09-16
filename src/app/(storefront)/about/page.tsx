import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Play } from "lucide-react";
import { AboutRevealMotion } from "@/components/about/about-reveal-motion";
import { Container } from "@/components/ui/container";
import { getStorefrontLocale } from "@/modules/i18n/server";

const copy = {
  en: {
    title: "About us",
    subtitle: "MACMAER — Contemporary home decor",
    intro: [
      "Our studio is based in Göteborg, Sweden. We offer a wide range of high quality 100% handmade products. All the items are made to order especially for you! We are regularly adding new products, new colours and fabrics to our catalogue.",
      "We are devoted to provide an exceptional customer service and products of the highest quality. Our customers are at the heart of our business.",
    ],
    storyTitle: "Our story",
    story: [
      "I established MACMAER studio in 2020 when I designed our first line of reversible knot products.",
      "As a mother of two kids I always liked multifunctional objects that can be used in different ways or be easily transformed into another object to give them second life, especially when the babies grow up so quickly that sometimes we don’t even have time to use all the things we get for them. Then, I realised, that I wanted to create my own knot pillow in a “multiknot” way, to make it versatile, beautiful and useful at the same time.",
      "That realisation and my passion for sewing inspired me to create my own line of reversible knots pillows. After testing different fabrics and trying multiple sizes and combinations of knots, I finally came up with several models of reversible knot pillows, reversible baby nests and braided crib bumpers.",
      "Most of the knot pillows in our store are reversible, have multiple uses and can be easily transformed into different knots with the help of our tutorials. But we also have the collections of non reversible – traditional knot pillows and other handmade accessories!",
    ],
    supportBefore:
      "If you have any further questions about products, services, or need additional information please feel free to reach out to our ",
    supportLink: "customer support",
    quote:
      "Thank you for choosing MACMAER! I invite you to explore our website, and hope you will find here what you are looking for!",
    founder: "Maria",
    role: "Owner & Designer of MACMAER",
    materialsTitle: "Fabrics & Materials",
    materialsSubtitle:
      "High-quality materials are essential for creating an exclusive product.",
    materials: [
      "At MACMAER we take pride in our handmade products and the materials we use to produce them.",
      "All our fabrics are sourced from EU suppliers, who specialize in high-quality Oeko Tex certified textiles, and we only use non-toxic hypoallergenic stuffing to ensure a comfortable experience for people with allergies.",
      "We provide our customers with the necessary information how to take care of our knot pillows. Each product comes with detailed care instructions to help to keep the knot pillow looking its best for years to come. The reversible knot pillows come with QR code on the label (with the link to our video tutorials).",
    ],
    processTitle: "Design & Working process",
    processSubtitle:
      "Handmade products offer a personal connection between the artisan and the consumer.",
    process: [
      "From the moment we conceptualize a new design to the final stitch, every step of the process is executed with dedication and passion.",
      "To bring a concept to life we consider the trends, functionality, and the desires of our customers. Through sketches, mood boards, and many hours of manual work with different knots, we refine our ideas and lay the groundwork for our designs.",
      "To ensure the longevity of our knot pillows, we employ strong and durable threads in their construction. We use specifically designed threads and wadding for high-stress areas to reinforce certain knots and seams. The perfect knot pillow requires a delicate balance of firmness and softness, that’s why we stuff each pillow by hand, which makes it retain its shape over time. Creating a high-end product requires a significant investment of time and effort.",
      "We believe that our handmade products add a touch of luxury and personality to any space. The finely textured fabrics, vibrant colours, and timeless knot patterns make our products the statement pieces that elevate any room’s ambiance, creating a cozy and stylish atmosphere in any space.",
    ],
    collectionCaption: "Bouclé collection",
    materialImages: [
      ["/images/about/velvet-fabrics.webp", "Our softest velvet fabrics"],
      [
        "/images/about/gemma-reversible-knot.webp",
        "Reversible knot pillow “Gemma” 2-in-1",
      ],
      ["/images/about/mini-velvet-ball-knot.webp", "Mini velvet ball knot"],
      ["/images/about/boucle-fabric.webp", "Our trendy teddy bouclé fabric"],
      ["/images/about/boucle-ball-knot.webp", "Our original bouclé ball knot"],
      ["/images/about/boucle-colours.webp", "Bouclé collection in 24 colours"],
    ],
    processAlt: [
      "Neutral Macmaer knot pillows displayed on woven shelves",
      "A collection of colourful velvet Macmaer knot pillows",
      "A handmade neutral Macmaer knot pillow",
    ],
  },
  sv: {
    title: "Om oss",
    subtitle: "MACMAER — samtida heminredning",
    intro: [
      "Vår studio finns i Göteborg, Sverige. Vi erbjuder ett brett utbud av högkvalitativa, helt handgjorda produkter. Alla produkter tillverkas på beställning särskilt för dig! Vi lägger regelbundet till nya produkter, färger och tyger i vårt sortiment.",
      "Vi brinner för att erbjuda exceptionell kundservice och produkter av högsta kvalitet. Våra kunder står i centrum för vår verksamhet.",
    ],
    storyTitle: "Vår berättelse",
    story: [
      "Jag grundade MACMAER-studion 2020 när jag formgav vår första kollektion av vändbara knutprodukter.",
      "Som tvåbarnsmamma har jag alltid tyckt om multifunktionella föremål som kan användas på olika sätt eller enkelt förvandlas till något annat och få ett nytt liv—särskilt när barn växer upp så fort att vi ibland inte ens hinner använda allt vi skaffar till dem. Då insåg jag att jag ville skapa min egen knutkudde på ett ”multiknut”-sätt, så att den kunde vara mångsidig, vacker och användbar på samma gång.",
      "Den insikten och min passion för sömnad inspirerade mig att skapa min egen serie av vändbara knutkuddar. Efter att ha provat olika tyger, storlekar och kombinationer av knutar tog jag till slut fram flera modeller av vändbara knutkuddar, vändbara babynest och flätade spjälskydd.",
      "De flesta knutkuddarna i vår butik är vändbara, har flera användningsområden och kan enkelt formas om till olika knutar med hjälp av våra guider. Men vi har också kollektioner med traditionella, icke-vändbara knutkuddar och andra handgjorda accessoarer!",
    ],
    supportBefore:
      "Om du har fler frågor om våra produkter eller tjänster, eller behöver ytterligare information, är du varmt välkommen att kontakta vår ",
    supportLink: "kundservice",
    quote:
      "Tack för att du väljer MACMAER! Jag bjuder in dig att utforska vår webbplats och hoppas att du hittar det du söker här!",
    founder: "Maria",
    role: "Ägare och designer på MACMAER",
    materialsTitle: "Tyger & material",
    materialsSubtitle:
      "Material av hög kvalitet är avgörande för att skapa en exklusiv produkt.",
    materials: [
      "På MACMAER är vi stolta över våra handgjorda produkter och materialen vi använder för att tillverka dem.",
      "Alla våra tyger kommer från EU-leverantörer som är specialiserade på högkvalitativa, Oeko-Tex®-certifierade textilier. Vi använder endast giftfri, hypoallergen fyllning för att ge även allergiker en behaglig upplevelse.",
      "Vi ger våra kunder den information de behöver för att ta hand om sina knutkuddar. Varje produkt levereras med detaljerade skötselråd som hjälper kudden att behålla sitt fina utseende i många år. De vändbara knutkuddarna har en QR-kod på etiketten med en länk till våra videoguider.",
    ],
    processTitle: "Design & arbetsprocess",
    processSubtitle:
      "Handgjorda produkter skapar en personlig koppling mellan hantverkaren och kunden.",
    process: [
      "Från den första idén till det sista stygnet genomförs varje steg i processen med engagemang och passion.",
      "För att ge liv åt ett koncept tar vi hänsyn till trender, funktion och våra kunders önskemål. Genom skisser, moodboards och många timmars manuellt arbete med olika knutar förfinar vi våra idéer och lägger grunden för designen.",
      "För att våra knutkuddar ska hålla länge använder vi starka och slitstarka trådar i tillverkningen. Vi använder särskilt utformad tråd och vadd på hårt belastade områden för att förstärka vissa knutar och sömmar. Den perfekta knutkudden kräver en fin balans mellan fasthet och mjukhet. Därför fyller vi varje kudde för hand, vilket hjälper den att behålla formen över tid. Att skapa en exklusiv produkt kräver en betydande investering av tid och arbete.",
      "Vi tror att våra handgjorda produkter tillför en känsla av lyx och personlighet till varje rum. De fint strukturerade tygerna, livfulla färgerna och tidlösa knutmönstren gör våra produkter till blickfång som lyfter rummets atmosfär och skapar en ombonad och stilfull känsla.",
    ],
    collectionCaption: "Bouclékollektionen",
    materialImages: [
      ["/images/about/velvet-fabrics.webp", "Våra mjukaste sammetstyger"],
      [
        "/images/about/gemma-reversible-knot.webp",
        "Vändbar knutkudde “Gemma” 2-i-1",
      ],
      ["/images/about/mini-velvet-ball-knot.webp", "Mini-knut i sammet"],
      ["/images/about/boucle-fabric.webp", "Vårt trendiga teddy-bouclétyg"],
      ["/images/about/boucle-ball-knot.webp", "Vår ursprungliga boucléknut"],
      ["/images/about/boucle-colours.webp", "Bouclékollektionen i 24 färger"],
    ],
    processAlt: [
      "Neutrala Macmaer-knutkuddar på flätade hyllor",
      "En samling färgstarka Macmaer-knutkuddar i sammet",
      "En handgjord neutral Macmaer-knutkudde",
    ],
  },
} as const;

const processImages = [
  "/images/about/process-stitching.webp",
  "/images/about/process-shaping.webp",
  "/images/about/process-finishing.webp",
] as const;

export async function generateMetadata(): Promise<Metadata> {
  const swedish = (await getStorefrontLocale()) === "sv";
  return {
    title: swedish ? "Om oss" : "About us",
    description: swedish
      ? "Lär känna Maria och Macmaers material, designprocess och handgjorda knutprodukter från Göteborg."
      : "Meet Maria and discover Macmaer's materials, design process and handmade knot pieces from Gothenburg, Sweden.",
    alternates: { canonical: "/about" },
  };
}

function EditorialImage({
  src,
  alt,
  eager = false,
}: {
  src: string;
  alt: string;
  eager?: boolean;
}) {
  return (
    <div className="about-image-frame">
      <Image
        src={src}
        alt={alt}
        fill
        loading={eager ? "eager" : "lazy"}
        fetchPriority={eager ? "high" : "auto"}
        sizes="(max-width: 600px) 100vw, (max-width: 1000px) 50vw, 33vw"
      />
    </div>
  );
}

export default async function AboutPage() {
  const locale = await getStorefrontLocale();
  const content = copy[locale];
  const videoLabel =
    locale === "sv" ? "Video kommer snart" : "Video coming soon";

  return (
    <Container className="page-section about-page about-page-redesign">
      <AboutRevealMotion />
      <section className="about-block about-text-block about-opening">
        <h1>{content.title}</h1>
        <div className="about-block-content">
          <p className="about-block-lead">{content.subtitle}</p>
          {content.intro.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </section>

      <section
        className="about-block about-visual-block"
        aria-label={videoLabel}
      >
        <div className="about-video-grid">
          {[1, 2, 3].map((video) => (
            <div className="about-video-placeholder" key={video}>
              <span className="about-video-play">
                <Play aria-hidden="true" fill="currentColor" />
              </span>
              <span className="visually-hidden">{videoLabel}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="about-block about-text-block about-story-block">
        <h2>{content.storyTitle}</h2>
        <div className="about-block-content">
          {content.story.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          <p>
            {content.supportBefore}
            <Link href="/contact">{content.supportLink}</Link>.
          </p>
          <div className="about-signature">
            <blockquote>“{content.quote}”</blockquote>
            <div className="about-signature-person">
              <div className="about-signature-avatar">
                <Image
                  src="/images/about/maria.webp"
                  alt=""
                  fill
                  sizes="72px"
                />
              </div>
              <p>
                <strong>{content.founder}</strong>
                <span>{content.role}</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        className="about-block about-visual-block"
        aria-label={content.collectionCaption}
      >
        <div className="about-image-grid about-boucle-triptych">
          <figure>
            <EditorialImage
              src="/images/about/boucle-white.webp"
              alt={content.collectionCaption}
            />
            <figcaption>{content.collectionCaption}</figcaption>
          </figure>
          <figure className="about-boucle-founder">
            <EditorialImage
              src="/images/about/maria.webp"
              alt={`${content.founder}, ${content.role}`}
            />
            <figcaption>
              {content.founder} — {content.role}
            </figcaption>
          </figure>
          <figure>
            <EditorialImage
              src="/images/about/boucle-collection.webp"
              alt={content.collectionCaption}
            />
            <figcaption>{content.collectionCaption}</figcaption>
          </figure>
        </div>
      </section>

      <section className="about-block about-text-block">
        <h2>{content.materialsTitle}</h2>
        <div className="about-block-content">
          <p className="about-block-lead">{content.materialsSubtitle}</p>
          {content.materials.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </section>

      <section className="about-block about-visual-block">
        <div className="about-image-grid about-material-gallery">
          {content.materialImages.map(([src, caption]) => (
            <figure key={src}>
              <EditorialImage src={src} alt={caption} />
              <figcaption>{caption}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="about-block about-text-block">
        <h2>{content.processTitle}</h2>
        <div className="about-block-content">
          <p className="about-block-lead">{content.processSubtitle}</p>
          {content.process.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </section>

      <section className="about-block about-visual-block about-final-gallery">
        <div className="about-image-grid about-process-gallery">
          {processImages.map((src, index) => (
            <figure key={src}>
              <EditorialImage src={src} alt={content.processAlt[index]!} />
            </figure>
          ))}
        </div>
      </section>
    </Container>
  );
}
