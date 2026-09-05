"use client";
/* eslint-disable @next/next/no-img-element -- Private signed previews must bypass the public image optimizer. */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import {
  beginUpload,
  finishUpload,
  removeMedia,
  retryMediaCleanup,
} from "@/modules/admin/media-actions";
import type { MediaItem } from "@/modules/admin/media";
import type { MutationResult } from "@/modules/admin/result";
import { Result, useEditorReady } from "./fields";
export function MediaUpload() {
  const ready = useEditorReady();
  const router = useRouter();
  const [result, setResult] = useState<MutationResult | null>(null),
    [pending, start] = useTransition();
  return (
    <div>
      <label>
        Upload private image
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          disabled={pending || !ready}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            start(async () => {
              const authorization = await beginUpload({
                name: file.name,
                size: file.size,
                type: file.type,
              });
              if (!authorization.ok) {
                setResult(authorization);
                return;
              }
              const { path, token, id } = authorization.data;
              const { error } = await createBrowserSupabaseClient()
                .storage.from("catalogue-drafts")
                .uploadToSignedUrl(path, token, file, {
                  contentType: file.type,
                });
              if (error) {
                setResult({
                  ok: false,
                  code: "unexpected",
                  message: "Upload failed. Please retry.",
                });
                return;
              }
              const finished = await finishUpload(id);
              setResult(finished);
              router.refresh();
            });
          }}
        />
      </label>
      {pending && <p role="status">Uploading and checking image…</p>}
      <Result result={result} />
    </div>
  );
}
export function MediaPicker({
  items,
  value,
  onChange,
  label = "Image",
}: {
  items: MediaItem[];
  value: string | null | undefined;
  onChange: (id: string | null) => void;
  label?: string;
}) {
  const selected = items.find((i) => i.id === value);
  return (
    <div>
      <label>
        {label}
        <select
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
        >
          <option value="">Choose an uploaded image</option>
          {items
            .filter((i) => i.status === "ready")
            .map((i) => (
              <option key={i.id} value={i.id}>
                {i.original_name} · {i.id.slice(0, 8)}
              </option>
            ))}
        </select>
      </label>
      {selected?.preview_url && (
        /* Private signed URLs deliberately bypass Next's public image cache. */ <img
          className="media-thumb"
          src={selected.preview_url}
          alt={selected.original_name}
        />
      )}
    </div>
  );
}
export function MediaManager({ items }: { items: MediaItem[] }) {
  const router = useRouter(),
    [result, setResult] = useState<MutationResult | null>(null),
    [pending, start] = useTransition();
  return (
    <>
      <MediaUpload />
      <button
        disabled={pending}
        onClick={() =>
          start(async () => {
            setResult(await retryMediaCleanup());
            router.refresh();
          })
        }
      >
        Retry pending public-copy cleanup
      </button>
      <Result result={result} />
      <p>
        Only unreferenced files can be deleted. Removing a gallery image takes
        effect when its product is saved.
      </p>
      <div className="admin-grid">
        {items.map((i) => (
          <div className="admin-card" key={i.id}>
            {i.preview_url && i.status === "ready" && (
              <img
                className="media-thumb"
                src={i.preview_url}
                alt={i.original_name}
              />
            )}
            <p>{i.original_name}</p>
            <p>
              {i.status} · {i.width} × {i.height}
              {i.cleanup_pending ? " · cleanup pending" : ""}
            </p>
            <button
              disabled={pending}
              onClick={() =>
                start(async () => {
                  setResult(await removeMedia(i.id));
                  router.refresh();
                })
              }
            >
              Delete unreferenced image
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
