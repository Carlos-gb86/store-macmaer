"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Eye, ExternalLink } from "lucide-react";
import type { Homepage } from "@/modules/content/schema";
import { saveHomepage } from "@/modules/content/actions";
import type { MediaItem } from "@/modules/admin/media";
import type { MutationResult } from "@/modules/admin/result";
import { Field, Result, OrderButtons, move, useEditorReady } from "./fields";
import { MediaPicker } from "./media-picker";
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
      <div className="page-heading">
        <div>
          <h1>Homepage content</h1>
          <p className="section-intro">
            Edit each section below. Your changes go live together when you
            publish.
          </p>
        </div>
        <a href="/" target="_blank" rel="noreferrer" className="text-link">
          <ExternalLink size={16} />
          View published homepage
        </a>
      </div>
      <nav className="editor-jump" aria-label="Homepage sections">
        <a href="#announcement">Announcement</a>
        <a href="#hero">Hero</a>
        <a href="#featured-products">Featured products</a>
        <a href="#featured-collections">Collections</a>
        <a href="#story">Our story</a>
      </nav>
      <fieldset className="editor-lock" disabled={pending}>
        <fieldset id="announcement">
          <legend>Announcement bar</legend>
          <p className="field-note">
            A short message at the top of the shop. Leave blank to hide it.
          </p>
          <Field
            label="Announcement"
            value={c.announcement}
            onChange={(v) => setC({ ...c, announcement: String(v) })}
          />
          <div className="announcement-preview">
            {c.announcement || "Announcement hidden"}
          </div>
        </fieldset>
        {(["hero", "story"] as const).map((section) => {
          const hero = section === "hero";
          return (
            <fieldset id={section} key={section}>
              <legend>
                {hero
                  ? "Hero · first impression"
                  : "Our story · brand introduction"}
              </legend>
              <Field
                label={hero ? "Show hero section" : "Show story section"}
                value={hero ? c.hero_visible : c.story_visible}
                onChange={(v) =>
                  setC({ ...c, [section + "_visible"]: Boolean(v) })
                }
              />
              <div className="editor-columns">
                <div>
                  <Field
                    label={section + " eyebrow"}
                    help="A short introductory line above the main heading."
                    value={hero ? c.hero_eyebrow : c.story_eyebrow}
                    onChange={(v) =>
                      setC({ ...c, [section + "_eyebrow"]: String(v) })
                    }
                  />
                  <Field
                    label={section + " title"}
                    value={hero ? c.hero_title : c.story_title}
                    onChange={(v) =>
                      setC({ ...c, [section + "_title"]: String(v) })
                    }
                  />
                  <Field
                    label={hero ? "Hero subtitle" : "Story text"}
                    value={hero ? c.hero_subtitle : c.story_text}
                    multiline
                    onChange={(v) =>
                      setC({
                        ...c,
                        [hero ? "hero_subtitle" : "story_text"]: String(v),
                      })
                    }
                  />
                  {hero && (
                    <div className="admin-grid">
                      <Field
                        label="Button text"
                        value={c.hero_cta_label}
                        onChange={(v) =>
                          setC({ ...c, hero_cta_label: String(v) })
                        }
                      />
                      <Field
                        label="Button destination"
                        value={c.hero_cta_path}
                        onChange={(v) =>
                          setC({ ...c, hero_cta_path: String(v) })
                        }
                        help="Use a page in this shop, such as /shop or /collections/boucle."
                      />
                    </div>
                  )}
                </div>
                <div>
                  <MediaPicker
                    items={media}
                    clearLabel="Use default image"
                    label={hero ? "Hero image" : "Story image"}
                    value={hero ? c.hero_asset_id : c.story_asset_id}
                    fallbackPath={hero ? c.hero_image : c.story_image}
                    onChange={(id) =>
                      setC({
                        ...c,
                        [section + "_asset_id"]: id,
                        ...(!id
                          ? {
                              [section + "_image"]: hero
                                ? "/images/catalogue/story.jpg"
                                : "/images/catalogue/cotton.jpg",
                            }
                          : {}),
                      })
                    }
                  />
                  <Field
                    label={
                      hero
                        ? "Hero image description"
                        : "Story image description"
                    }
                    value={hero ? c.hero_alt : c.story_alt}
                    onChange={(v) =>
                      setC({ ...c, [section + "_alt"]: String(v) })
                    }
                    help="Describe what is shown in the photo for screen readers."
                  />
                </div>
              </div>
              <details className="copy-preview">
                <summary>
                  <Eye size={16} />
                  Preview this copy
                </summary>
                <div>
                  <small>{hero ? c.hero_eyebrow : c.story_eyebrow}</small>
                  <h2>{hero ? c.hero_title : c.story_title}</h2>
                  <p>{hero ? c.hero_subtitle : c.story_text}</p>
                  {hero && (
                    <span className="preview-cta">{c.hero_cta_label}</span>
                  )}
                </div>
              </details>
            </fieldset>
          );
        })}
        {(["product_ids", "collection_ids"] as const).map((key) => {
          const isProducts = key === "product_ids",
            choices = isProducts
              ? products.map((p) => ({ id: p.id, name: p.title }))
              : collections;
          return (
            <fieldset
              key={key}
              id={isProducts ? "featured-products" : "featured-collections"}
            >
              <legend>
                {isProducts ? "Featured products" : "Featured collections"}
              </legend>
              <p className="field-note">
                Choose what appears on the homepage and arrange it in display
                order. Inactive items are skipped in the shop.
              </p>
              <Field
                label={
                  isProducts
                    ? "Show featured products"
                    : "Show featured collections"
                }
                value={isProducts ? c.featured_visible : c.collections_visible}
                onChange={(v) =>
                  setC({
                    ...c,
                    [isProducts ? "featured_visible" : "collections_visible"]:
                      Boolean(v),
                  })
                }
              />
              <ol className="featured-list">
                {c[key].map((id, i) => (
                  <li key={id}>
                    <span className="sequence-number">{i + 1}</span>
                    <strong>
                      {choices.find((p) => p.id === id)?.name ??
                        "Inactive or missing item"}
                    </strong>
                    <div className="admin-actions">
                      <OrderButtons
                        index={i}
                        length={c[key].length}
                        onMove={(d) =>
                          setC({ ...c, [key]: move(c[key], i, d) })
                        }
                      />
                      <button
                        type="button"
                        className="secondary icon-button danger"
                        aria-label={
                          "Remove " +
                          (choices.find((p) => p.id === id)?.name ?? "item")
                        }
                        title="Remove from homepage"
                        onClick={() =>
                          setC({ ...c, [key]: c[key].filter((v) => v !== id) })
                        }
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </li>
                ))}
              </ol>
              {!c[key].length && (
                <p className="empty-state">
                  No {isProducts ? "products" : "collections"} selected yet.
                </p>
              )}
              <label>
                {isProducts
                  ? "Add featured product"
                  : "Add featured collection"}
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value)
                      setC({ ...c, [key]: [...c[key], e.target.value] });
                  }}
                >
                  <option value="">
                    Choose {isProducts ? "a product" : "a collection"}…
                  </option>
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
      </fieldset>
      <div className="admin-save">
        <Result result={result} />
        <button disabled={pending}>
          {pending ? "Publishing…" : "Publish homepage"}
        </button>
        <span className="field-note">
          All section changes become public together.
        </span>
      </div>
    </form>
  );
}
