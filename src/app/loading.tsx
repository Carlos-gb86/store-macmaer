import { getStorefrontLocale } from "@/modules/i18n/server";

export default async function Loading() {
  const sv = (await getStorefrontLocale()) === "sv";
  return (
    <div className="container empty-state" role="status">
      <p>{sv ? "Hämtar kollektionen…" : "Gathering the collection…"}</p>
    </div>
  );
}
