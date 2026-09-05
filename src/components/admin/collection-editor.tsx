"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Collection } from "@/modules/catalog/schema";
import type { MediaItem } from "@/modules/admin/media";
import type { MutationResult } from "@/modules/admin/result";
import { saveCollection } from "@/modules/admin/actions";
import { Field, Result, useEditorReady } from "./fields";
import { RichEditor } from "./rich-editor";
import { MediaPicker, MediaUpload } from "./media-picker";
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
      <h1>{c.name || "New collection"}</h1>
      <div className="admin-grid">
        {(
          [
            "name",
            "slug",
            "image_alt",
            "active",
            "sort_order",
            "seo_title",
            "seo_description",
          ] as const
        ).map((k) => (
          <Field
            key={k}
            label={k.replaceAll("_", " ")}
            value={c[k]}
            numeric={k === "sort_order"}
            nullable={k.startsWith("seo_")}
            onChange={(v) => setC({ ...c, [k]: v })}
          />
        ))}
      </div>
      <label>Description</label>
      <RichEditor
        value={c.description_document ?? textDocument(c.description)}
        onChange={(description_document) =>
          setC({ ...c, description_document })
        }
      />
      <MediaUpload />
      <MediaPicker
        items={media}
        value={c.asset_id}
        onChange={(asset_id) =>
          setC({ ...c, asset_id, image_path: asset_id ? c.image_path : null })
        }
      />
      <Result result={result} />
      <div className="admin-actions">
        <button disabled={pending}>Save collection</button>
      </div>
    </form>
  );
}
