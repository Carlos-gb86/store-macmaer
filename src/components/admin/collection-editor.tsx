"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Collection } from "@/modules/catalog/schema";
import type { MediaItem } from "@/modules/admin/media";
import type { MutationResult } from "@/modules/admin/result";
import { saveCollection } from "@/modules/admin/actions";
import { Field, Result, useEditorReady } from "./fields";
import { RichEditor } from "./rich-editor";
import { MediaPicker } from "./media-picker";
import { textDocument } from "@/modules/content/rich-text";
export function CollectionEditor({
  initial,
  media,
}: {
  initial: Collection;
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
          const r = await saveCollection(c);
          setResult(r);
          if (r.ok) {
            setC({ ...c, updated_at: r.data.updated_at });
            router.replace("/admin/collections/" + c.id);
            router.refresh();
          }
        });
      }}
    >
      <Link className="back-link" href="/admin/collections">
        ← All collections
      </Link>
      <h1>{c.name || "New catalogue group"}</h1>
      <p className="section-intro">
        Manage a customer-facing collection or a product type used for
        filtering.
      </p>
      <fieldset className="editor-lock" disabled={pending}>
        <div className="editor-columns">
          <div>
            <fieldset>
              <legend>Collection details</legend>
              <div className="admin-grid">
                <Field
                  label="Classification"
                  value={c.kind}
                  options={["collection", "product_type"]}
                  onChange={(value) =>
                    setC({
                      ...c,
                      kind: value as Collection["kind"],
                      product_type_key:
                        value === "product_type"
                          ? c.product_type_key || c.slug || null
                          : null,
                    })
                  }
                  help="Collections have landing pages. Product types appear in the catalogue filter."
                />
                <Field
                  label="name"
                  value={c.name}
                  onChange={(v) => setC({ ...c, name: String(v) })}
                />
                {c.kind === "product_type" && (
                  <Field
                    label="Product type grouping key"
                    value={c.product_type_key}
                    nullable
                    onChange={(value) =>
                      setC({
                        ...c,
                        product_type_key: value as string | null,
                      })
                    }
                    help="Entries with the same key appear as one filter, for example reversible-knot-pillows."
                  />
                )}
                <Field
                  label="slug"
                  value={c.slug}
                  onChange={(v) => setC({ ...c, slug: String(v) })}
                  help="The address of this collection, for example /collections/boucle."
                />
              </div>
              <RichEditor
                disabled={pending}
                value={c.description_document ?? textDocument(c.description)}
                onChange={(description_document) =>
                  setC({ ...c, description_document })
                }
              />
              <details className="advanced-fields">
                <summary>Swedish storefront copy</summary>
                <Field
                  label="Swedish name"
                  value={c.name_sv}
                  nullable
                  onChange={(v) => setC({ ...c, name_sv: v as string | null })}
                  help="Optional. Empty fields use the English copy."
                />
                <RichEditor
                  label="Swedish description"
                  disabled={pending}
                  value={
                    c.description_document_sv ??
                    textDocument(c.description_sv ?? "")
                  }
                  onChange={(description_document_sv) =>
                    setC({ ...c, description_document_sv })
                  }
                />
              </details>
            </fieldset>
            <details className="admin-disclosure">
              <summary>Search engine listing</summary>
              <Field
                label="SEO title"
                value={c.seo_title}
                nullable
                onChange={(v) => setC({ ...c, seo_title: v as string | null })}
              />
              <Field
                label="SEO description"
                value={c.seo_description}
                multiline
                nullable
                onChange={(v) =>
                  setC({ ...c, seo_description: v as string | null })
                }
              />
              <Field
                label="Swedish SEO title"
                value={c.seo_title_sv}
                nullable
                onChange={(v) =>
                  setC({ ...c, seo_title_sv: v as string | null })
                }
              />
              <Field
                label="Swedish SEO description"
                value={c.seo_description_sv}
                multiline
                nullable
                onChange={(v) =>
                  setC({ ...c, seo_description_sv: v as string | null })
                }
              />
            </details>
          </div>
          <div>
            <fieldset>
              <legend>Cover image</legend>
              <MediaPicker
                items={media}
                value={c.asset_id}
                fallbackPath={c.image_path}
                label="Collection image"
                onChange={(asset_id) =>
                  setC({
                    ...c,
                    asset_id,
                    image_path: asset_id ? c.image_path : null,
                  })
                }
              />
              <Field
                label="Image description"
                value={c.image_alt}
                onChange={(v) => setC({ ...c, image_alt: String(v) })}
                help="Describe the cover photo for screen readers."
              />
              <Field
                label="Swedish image description"
                value={c.image_alt_sv}
                nullable
                onChange={(v) =>
                  setC({ ...c, image_alt_sv: v as string | null })
                }
              />
            </fieldset>
            <fieldset>
              <legend>Visibility & order</legend>
              <Field
                label="active"
                value={c.active}
                onChange={(v) => setC({ ...c, active: Boolean(v) })}
                help="Active collections are visible in the shop. Turn this off to hide the collection."
              />
              <Field
                label="Display order"
                value={c.sort_order}
                numeric
                onChange={(v) => setC({ ...c, sort_order: Number(v) })}
                help="Lower numbers appear first."
              />
            </fieldset>
          </div>
        </div>
      </fieldset>
      <div className="admin-save">
        <Result result={result} />
        <button disabled={pending}>
          {pending ? "Saving…" : "Save collection"}
        </button>
        <span className="field-note">
          Saving an active collection updates the shop immediately.
        </span>
      </div>
    </form>
  );
}
