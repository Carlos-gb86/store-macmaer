"use client";
/* eslint-disable @next/next/no-img-element -- Signed private previews bypass the public image optimizer. */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  UploadCloud,
  ImagePlus,
  Image as ImageIcon,
  Trash2,
  Search,
  RefreshCw,
} from "lucide-react";
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
import { Dialog } from "./dialog";
import { resolveImage } from "@/modules/media/resolve-image";
export function MediaUpload({
  onUploaded,
}: {
  onUploaded?: (item: MediaItem) => void;
}) {
  const ready = useEditorReady(),
    router = useRouter();
  const [result, setResult] = useState<MutationResult | null>(null),
    [pending, start] = useTransition();
  const upload = (files: File[]) => {
    if (pending || !ready || !files.length) return;
    setResult(null);
    start(async () => {
      try {
        for (const file of files) {
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
            .uploadToSignedUrl(path, token, file, { contentType: file.type });
          if (error) throw error;
          const finished = await finishUpload(id);
          setResult(finished);
          if (!finished.ok) return;
          onUploaded?.(finished.data);
        }
      } catch {
        setResult({
          ok: false,
          code: "unexpected",
          message: "Upload failed. Please retry.",
        });
      } finally {
        router.refresh();
      }
    });
  };
  return (
    <div className="upload-panel">
      <label
        className="upload-zone"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          upload(Array.from(e.dataTransfer.files));
        }}
      >
        <UploadCloud size={28} aria-hidden="true" />
        <strong>
          {pending
            ? "Uploading and optimising…"
            : "Choose images or drop them here"}
        </strong>
        <span>JPEG, PNG, WebP or AVIF · Up to 10 MiB each</span>
        <input
          className="visually-hidden"
          aria-label="Upload private image"
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/avif"
          disabled={pending || !ready}
          onChange={(e) => {
            upload(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />
      </label>
      <p className="field-note">
        Automatically converted to WebP, up to 2400 px. New images stay private
        until published.
      </p>
      {pending && (
        <p role="status">
          Preparing images… You can keep editing when the upload finishes.
        </p>
      )}
      <Result result={result} />
    </div>
  );
}
export function ImageLibraryDialog({
  items,
  onSelect,
  onClose,
}: {
  items: MediaItem[];
  onSelect: (item: MediaItem) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState(""),
    [uploads, setUploads] = useState<MediaItem[]>([]),
    [limit, setLimit] = useState(36);
  const all = [
    ...new Map([...items, ...uploads].map((item) => [item.id, item])).values(),
  ].filter(
    (i) =>
      i.status === "ready" &&
      i.original_name.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <Dialog title="Choose an image" onClose={onClose}>
      <MediaUpload
        onUploaded={(item) => setUploads((current) => [item, ...current])}
      />
      <label className="media-search">
        <Search size={18} aria-hidden="true" />
        <input
          type="search"
          aria-label="Search images"
          placeholder="Search images by filename…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setLimit(36);
          }}
        />
      </label>
      <p className="muted">
        Select a thumbnail to use it. Uploads are added to the library above.
      </p>
      <div className="media-grid picker-grid">
        {all.slice(0, limit).map((item) => (
          <button
            type="button"
            className="media-choice"
            key={item.id}
            onClick={() => {
              onSelect(item);
              onClose();
            }}
            aria-label={"Use " + item.original_name}
          >
            {item.preview_url ? (
              <img src={item.preview_url} alt="" loading="lazy" />
            ) : (
              <ImageIcon size={32} />
            )}
            <span>{item.original_name}</span>
            <small>
              {item.width} × {item.height}
            </small>
          </button>
        ))}
      </div>
      {!all.length && (
        <p className="empty-state">
          No matching images. Upload an image or change your search.
        </p>
      )}
      {all.length > limit && (
        <button
          type="button"
          className="secondary"
          onClick={() => setLimit(limit + 36)}
        >
          Show more images
        </button>
      )}
    </Dialog>
  );
}
export function MediaPicker({
  items,
  value,
  onChange,
  label = "Image",
  fallbackPath,
  clearLabel,
}: {
  items: MediaItem[];
  value: string | null | undefined;
  onChange: (id: string | null) => void;
  label?: string;
  fallbackPath?: string | null;
  clearLabel?: string;
}) {
  const [open, setOpen] = useState(false),
    [chosen, setChosen] = useState<MediaItem | null>(null);
  const selected =
    items.find((i) => i.id === value) ?? (chosen?.id === value ? chosen : null);
  const src =
    selected?.preview_url ??
    (!value && fallbackPath ? resolveImage(fallbackPath) : null);
  return (
    <div className="image-field">
      <span className="field-label">{label}</span>
      {src ? (
        <div className="selected-image">
          <img src={src} alt={selected?.original_name ?? label} />
          <span>{selected?.original_name ?? "Current image"}</span>
        </div>
      ) : (
        <div className="image-placeholder">
          <ImageIcon size={28} />
          <span>No image selected</span>
        </div>
      )}
      <div className="admin-actions">
        <button
          type="button"
          className="secondary"
          onClick={() => setOpen(true)}
        >
          <ImagePlus size={17} />
          {src ? "Change image" : "Choose image"}
        </button>
        {(value || (!clearLabel && fallbackPath)) && (
          <button
            type="button"
            className={
              clearLabel ? "secondary" : "secondary icon-button danger"
            }
            title={clearLabel ?? "Remove image"}
            aria-label={clearLabel ?? "Remove " + label.toLowerCase()}
            onClick={() => onChange(null)}
          >
            {clearLabel ? (
              <>
                <RefreshCw size={17} />
                {clearLabel}
              </>
            ) : (
              <Trash2 size={17} />
            )}
          </button>
        )}
      </div>
      {open && (
        <ImageLibraryDialog
          items={items}
          onClose={() => setOpen(false)}
          onSelect={(item) => {
            setChosen(item);
            onChange(item.id);
          }}
        />
      )}
    </div>
  );
}
export function MediaManager({ items }: { items: MediaItem[] }) {
  const router = useRouter(),
    [query, setQuery] = useState(""),
    [result, setResult] = useState<MutationResult | null>(null),
    [pending, start] = useTransition();
  const filtered = items.filter((i) =>
    i.original_name.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <MediaUpload />
      <div className="media-library-tools">
        <label>
          Search images
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by filename…"
          />
        </label>
        <span className="muted">{filtered.length} images</span>
        <button
          type="button"
          className="secondary icon-button"
          aria-label="Refresh image previews"
          title="Refresh image previews"
          onClick={() => router.refresh()}
        >
          <RefreshCw size={17} />
        </button>
      </div>
      <Result result={result} />
      <p className="field-note">
        Remove an image from its products or content and save those changes
        before deleting it here.
      </p>
      <div className="media-grid">
        {filtered.map((i) => (
          <article className="media-tile" key={i.id}>
            {i.preview_url && i.status === "ready" ? (
              <img src={i.preview_url} alt={i.original_name} loading="lazy" />
            ) : (
              <div className="image-placeholder">
                <ImageIcon size={32} />
                <span>
                  {i.status === "uploading"
                    ? "Upload in progress"
                    : "Image unavailable"}
                </span>
              </div>
            )}
            <div className="media-tile-body">
              <strong title={i.original_name}>{i.original_name}</strong>
              <small>
                {i.width ?? "—"} × {i.height ?? "—"} ·{" "}
                {i.byte_size ? Math.round(i.byte_size / 1024) + " KB" : "—"}
              </small>
              <div className="media-tile-footer">
                <span className="status-badge">
                  {i.public_ready
                    ? "Published"
                    : i.status === "ready"
                      ? "Private"
                      : i.status}
                </span>
                <button
                  type="button"
                  className="secondary icon-button danger"
                  aria-label={"Delete " + i.original_name}
                  title="Delete image"
                  disabled={pending}
                  onClick={() => {
                    if (
                      window.confirm(
                        "Delete “" +
                          i.original_name +
                          "”? Images still in use cannot be deleted.",
                      )
                    )
                      start(async () => {
                        setResult(await removeMedia(i.id));
                        router.refresh();
                      });
                  }}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
      {!filtered.length && (
        <p className="empty-state">
          No images found. Upload your first image or change the search.
        </p>
      )}
      {items.some((i) => i.cleanup_pending) && (
        <details className="admin-disclosure">
          <summary>Storage maintenance</summary>
          <p className="muted">
            Retry removal of unused public copies left by interrupted saves.
          </p>
          <button
            className="secondary"
            disabled={pending}
            onClick={() =>
              start(async () => {
                setResult(await retryMediaCleanup());
                router.refresh();
              })
            }
          >
            <RefreshCw size={16} />
            Retry cleanup
          </button>
        </details>
      )}
    </>
  );
}
