"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Homepage } from "@/modules/content/schema";
import { saveHomepage } from "@/modules/content/actions";
import type { MediaItem } from "@/modules/admin/media";
import type { MutationResult } from "@/modules/admin/result";
import { Field, Result, OrderButtons, move, useEditorReady } from "./fields";
import { MediaPicker, MediaUpload } from "./media-picker";
export function ContentEditor({
  initial,
  products,
  collections,
  media,
}: {
  initial: Homepage;
  products: { id: string; title: string }[];
  collections: { id: string; name: string }[];
  media: MediaItem[];
}) {
  const [c, setC] = useState(initial),
    [result, setResult] = useState<MutationResult | null>(null),
    [pending, start] = useTransition(),
    router = useRouter();
  const ready = useEditorReady();
  if (!ready) return <p role="status">Loading editor…</p>;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await saveHomepage(c);
          setResult(r);
          if (r.ok) {
            setC({ ...c, updated_at: r.data.updated_at! });
            router.refresh();
          }
        });
      }}
    >
      <h1>Homepage content</h1>
      <p>Changes become public when you publish this form.</p>
      <Field
        label="Announcement"
        value={c.announcement}
        onChange={(v) => setC({ ...c, announcement: String(v) })}
      />
      {(["hero", "story"] as const).map((section) => (
        <fieldset key={section}>
          <legend>{section}</legend>
          <div className="admin-grid">
            {Object.entries(c)
              .filter(
                ([key]) =>
                  key.startsWith(section + "_") &&
                  !key.endsWith("asset_id") &&
                  !key.endsWith("image"),
              )
              .map(([key, value]) => (
                <Field
                  key={key}
                  label={key.replaceAll("_", " ")}
                  value={value as string | boolean}
                  multiline={key.endsWith("text") || key.endsWith("subtitle")}
                  onChange={(v) => setC({ ...c, [key]: v })}
                />
              ))}
          </div>
          <MediaPicker
            items={media}
            value={
              c[(section + "_asset_id") as "hero_asset_id" | "story_asset_id"]
            }
            onChange={(id) =>
              setC({
                ...c,
                [section + "_asset_id"]: id,
                ...(!id
                  ? {
                      [section + "_image"]:
                        section === "hero"
                          ? "/images/catalogue/story.jpg"
                          : "/images/catalogue/cotton.jpg",
                    }
                  : {}),
              })
            }
          />
        </fieldset>
      ))}
      <MediaUpload />
      {(["product_ids", "collection_ids"] as const).map((key) => {
        const choices =
          key === "product_ids"
            ? products.map((p) => ({ id: p.id, name: p.title }))
            : collections;
        return (
          <fieldset key={key}>
            <legend>
              {key === "product_ids"
                ? "Featured products"
                : "Featured collections"}
            </legend>
            <Field
              label="Section visible"
              value={
                key === "product_ids"
                  ? c.featured_visible
                  : c.collections_visible
              }
              onChange={(v) =>
                setC({
                  ...c,
                  [key === "product_ids"
                    ? "featured_visible"
                    : "collections_visible"]: v,
                })
              }
            />
            {c[key].map((id, i) => (
              <div className="admin-actions" key={id}>
                <span>
                  {choices.find((p) => p.id === id)?.name ??
                    "Inactive or missing record"}
                </span>
                <OrderButtons
                  index={i}
                  length={c[key].length}
                  onMove={(d) => setC({ ...c, [key]: move(c[key], i, d) })}
                />
                <button
                  type="button"
                  className="secondary"
                  onClick={() =>
                    setC({ ...c, [key]: c[key].filter((v) => v !== id) })
                  }
                >
                  Remove
                </button>
              </div>
            ))}
            <label>
              Add selection
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value)
                    setC({ ...c, [key]: [...c[key], e.target.value] });
                }}
              >
                <option value="">Choose a record</option>
                {choices
                  .filter((p) => !c[key].includes(p.id))
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </label>
          </fieldset>
        );
      })}
      <div className="admin-save">
        <Result result={result} />
        <button disabled={pending}>Publish homepage</button>
      </div>
    </form>
  );
}
