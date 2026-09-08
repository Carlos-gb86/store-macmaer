"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { mutateTag } from "@/modules/admin/actions";
import type { MutationResult } from "@/modules/admin/result";
import { Field, Result, useEditorReady } from "./fields";
import { Dialog } from "./dialog";
import { Plus, Trash2 } from "lucide-react";
export type Tag = {
  id: string;
  name: string;
  slug: string;
  updated_at?: string;
};
export function TagDialogButton({
  initial,
  targets = [],
  onCreated,
}: {
  initial?: Tag;
  targets?: Tag[];
  onCreated?: (tag: Tag) => void;
}) {
  const [editing, setEditing] = useState<Tag | null>(null);
  return (
    <>
      <button
        type="button"
        className={initial ? "text-button" : "secondary"}
        onClick={() =>
          setEditing(initial ?? { id: crypto.randomUUID(), name: "", slug: "" })
        }
      >
        {!initial && <Plus size={16} />}
        {initial?.name ?? "Create tag"}
      </button>
      {editing && (
        <Dialog
          title={initial ? "Edit tag" : "Create tag"}
          onClose={() => setEditing(null)}
        >
          <TagEditor
            initial={editing}
            targets={targets}
            onSaved={(tag) => {
              onCreated?.(tag);
              setEditing(null);
            }}
          />
        </Dialog>
      )}
    </>
  );
}
export function TagEditor({
  initial,
  targets,
  onSaved,
}: {
  initial: Tag;
  targets: Tag[];
  onSaved?: (tag: Tag) => void;
}) {
  const [tag, setTag] = useState(initial),
    [target, setTarget] = useState(""),
    [result, setResult] = useState<MutationResult | null>(null),
    [pending, start] = useTransition(),
    router = useRouter();
  const save = (op: "save" | "merge" | "delete") =>
    start(async () => {
      const r = await mutateTag(op, tag, target || undefined);
      setResult(r);
      if (r.ok) {
        if (onSaved) onSaved(tag);
        else router.push("/admin/tags");
        router.refresh();
      }
    });
  const ready = useEditorReady();
  if (!ready) return <p role="status">Loading editor…</p>;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save("save");
      }}
    >
      {!onSaved && <h1>{tag.name || "New tag"}</h1>}
      <p className="muted">
        Tags help you organise and find products. For example: handmade,
        neutral, or limited edition.
      </p>
      <Field
        label="Name"
        value={tag.name}
        onChange={(v) =>
          setTag({
            ...tag,
            name: String(v),
            ...(!tag.updated_at && (!tag.slug || tag.slug === slugify(tag.name))
              ? { slug: slugify(String(v)) }
              : {}),
          })
        }
      />
      <Field
        label="Slug"
        help="A unique URL-friendly name. Created automatically from the name; you can change it."
        value={tag.slug}
        onChange={(v) => setTag({ ...tag, slug: String(v) })}
      />
      <Result result={result} />
      <div className="admin-actions">
        <button disabled={pending}>Save tag</button>
        {tag.updated_at && (
          <button
            type="button"
            className="danger secondary"
            disabled={pending}
            onClick={() => {
              if (
                window.confirm(
                  "Delete this tag? It can only be deleted when no products use it.",
                )
              )
                save("delete");
            }}
          >
            <Trash2 size={16} /> Delete unused tag
          </button>
        )}
      </div>
      {tag.updated_at && (
        <fieldset>
          <legend>Merge tag</legend>
          <p>Move all memberships into the selected tag and remove this tag.</p>
          <label>
            Target tag
            <select value={target} onChange={(e) => setTarget(e.target.value)}>
              <option value="">Choose target</option>
              {targets
                .filter((t) => t.id !== tag.id)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
            </select>
          </label>
          <button
            type="button"
            disabled={pending || !target}
            onClick={() => {
              if (
                window.confirm(
                  "Move every product to the selected tag and delete this tag?",
                )
              )
                save("merge");
            }}
          >
            Merge into selected tag
          </button>
        </fieldset>
      )}
    </form>
  );
}
function slugify(name: string) {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
