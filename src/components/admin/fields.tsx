"use client";
import { useSyncExternalStore } from "react";
const subscribe = () => () => {};
export function useEditorReady() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
import type { MutationResult } from "@/modules/admin/result";
export function Field({
  label,
  value,
  onChange,
  options,
  multiline = false,
  numeric = false,
  nullable = false,
}: {
  label: string;
  value: string | number | boolean | null | undefined;
  onChange: (value: string | number | boolean | null) => void;
  options?: readonly string[];
  multiline?: boolean;
  numeric?: boolean;
  nullable?: boolean;
}) {
  if (typeof value === "boolean")
    return (
      <label>
        <input
          type="checkbox"
          checked={value}
          onChange={(e) => onChange(e.target.checked)}
        />
        {label}
      </label>
    );
  const update = (text: string) =>
    onChange(nullable && text === "" ? null : numeric ? Number(text) : text);
  return (
    <label>
      {label}
      {options ? (
        <select
          value={String(value ?? "")}
          onChange={(e) => update(e.target.value)}
        >
          {nullable && <option value="">None</option>}
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : multiline ? (
        <textarea
          value={String(value ?? "")}
          onChange={(e) => update(e.target.value)}
        />
      ) : (
        <input
          type={numeric ? "number" : "text"}
          step={numeric ? "any" : undefined}
          value={value ?? ""}
          onChange={(e) => update(e.target.value)}
        />
      )}
    </label>
  );
}
export function Result({ result }: { result: MutationResult | null }) {
  return result ? (
    <div role={result.ok ? "status" : "alert"}>
      {result.message}
      {!result.ok && result.fields && (
        <ul>
          {Object.entries(result.fields).map(([field, message]) => (
            <li key={field}>
              <strong>{field}</strong>: {message}
            </li>
          ))}
        </ul>
      )}
    </div>
  ) : null;
}
export function move<T>(items: T[], index: number, offset: number): T[] {
  const target = index + offset;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target]!, next[index]!];
  return next;
}
export function OrderButtons({
  index,
  length,
  onMove,
}: {
  index: number;
  length: number;
  onMove: (offset: number) => void;
}) {
  return (
    <>
      <button
        type="button"
        className="secondary"
        aria-label="Move up"
        disabled={index === 0}
        onClick={() => onMove(-1)}
      >
        ↑
      </button>
      <button
        type="button"
        className="secondary"
        aria-label="Move down"
        disabled={index === length - 1}
        onClick={() => onMove(1)}
      >
        ↓
      </button>
    </>
  );
}
