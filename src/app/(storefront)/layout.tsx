import { getServerEnv } from "@/lib/env/server";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { getHomepage } from "@/modules/content/repository";
export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const content = await getHomepage();
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <div className="announcement">
        {getServerEnv().CATALOG_SOURCE === "demo"
          ? "Sample catalogue · Illustrative products & prices · Ordering opens soon"
          : content.announcement}
      </div>
      <Header />
      <main id="main-content">{children}</main>
      <Footer />
    </>
  );
}
