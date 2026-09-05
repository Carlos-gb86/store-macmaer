"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { mutateTag } from "@/modules/admin/actions";
import type { MutationResult } from "@/modules/admin/result";
import { Field, Result, useEditorReady } from "./fields";
type Tag = { id: string; name: string; slug: string; updated_at?: string };
export function TagEditor({
  initial,
  targets,
}: {
  initial: Tag;
  targets: Tag[];
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
        router.push("/admin/tags");
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
      <h1>{tag.name || "New tag"}</h1>
      <Field
        label="Name"
        value={tag.name}
        onChange={(v) => setTag({ ...tag, name: String(v) })}
      />
      <Field
        label="Slug"
        value={tag.slug}
        onChange={(v) => setTag({ ...tag, slug: String(v) })}
      />
      <Result result={result} />
      <div className="admin-actions">
        <button disabled={pending}>Save tag</button>
        {tag.updated_at && (
          <button
            type="button"
            disabled={pending}
            onClick={() => save("delete")}
          >
            Delete unused tag
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
            onClick={() => save("merge")}
          >
            Merge into selected tag
          </button>
        </fieldset>
      )}
    </form>
  );
}
