"use client";
import { useId, useState, useSyncExternalStore } from "react";
import { ArrowUp, ArrowDown, CircleHelp } from "lucide-react";
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
  help,
  placeholder,
}: {
  label: string;
  value: string | number | boolean | null | undefined;
  onChange: (value: string | number | boolean | null) => void;
  options?: readonly string[];
  multiline?: boolean;
  numeric?: boolean;
  nullable?: boolean;
  help?: string;
  placeholder?: string;
}) {
  const id = useId();
  const caption = (
    <div className="field-caption">
      <label htmlFor={id}>{label}</label>
      {help && <Help text={help} label={label} />}
    </div>
  );
  if (typeof value === "boolean")
    return (
      <div className="check-field">
        <label htmlFor={id}>
          <input
            id={id}
            type="checkbox"
            checked={value}
            onChange={(e) => onChange(e.target.checked)}
          />
          {label}
        </label>
        {help && <Help text={help} label={label} />}
      </div>
    );
  const update = (text: string) =>
    onChange(nullable && text === "" ? null : numeric ? Number(text) : text);
  return (
    <div className="admin-field">
      {caption}
      {options ? (
        <select
          id={id}
          value={String(value ?? "")}
          onChange={(e) => update(e.target.value)}
        >
          {nullable && <option value="">None</option>}
          {options.map((o) => (
            <option key={o} value={o}>
              {friendlyValue(o)}
            </option>
          ))}
        </select>
      ) : multiline ? (
        <textarea
          id={id}
          placeholder={placeholder}
          value={String(value ?? "")}
          onChange={(e) => update(e.target.value)}
        />
      ) : (
        <input
          id={id}
          placeholder={placeholder}
          type={numeric ? "number" : "text"}
          step={numeric ? "any" : undefined}
          value={value ?? ""}
          onChange={(e) => update(e.target.value)}
        />
      )}
    </div>
  );
}
export function Help({ text, label }: { text: string; label: string }) {
  const id = useId();
  const [position, setPosition] = useState({ left: 16, top: 0 });
  const place = (button: HTMLButtonElement) => {
    const rect = button.getBoundingClientRect();
    setPosition({
      left: Math.max(16, Math.min(rect.left, window.innerWidth - 266)),
      top: rect.bottom + 8,
    });
  };
  return (
    <span className="field-help">
      <button
        type="button"
        className="help-button"
        aria-label={"Help: " + label}
        aria-describedby={id}
        onFocus={(e) => place(e.currentTarget)}
        onPointerEnter={(e) => place(e.currentTarget)}
        onKeyDown={(e) => {
          if (e.key === "Escape") e.currentTarget.blur();
        }}
      >
        <CircleHelp size={16} />
      </button>
      <span
        id={id}
        role="tooltip"
        style={{ position: "fixed", ...position, right: "auto" }}
      >
        {text}
      </span>
    </span>
  );
}
export function friendlyValue(value: string) {
  const labels: Record<string, string> = {
    TRACKED: "Track stock quantities",
    MADE_TO_ORDER: "Made to order",
    UNLIMITED: "Always available",
    UNAVAILABLE: "Unavailable",
    select: "Dropdown",
    radio: "Choice buttons",
    colour_swatch: "Colour swatches",
    image_swatch: "Image swatches",
    checkbox: "Multiple choices (checkboxes)",
    short_text: "Personalisation text",
    number: "Number input",
    repeated_select: "Repeated choices (e.g. a pack of 5)",
    standard: "Standard returns",
    customized: "Customised product",
    final_sale: "Final sale",
  };
  return labels[value] ?? value.replaceAll("_", " ");
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
        <ArrowUp size={16} />
      </button>
      <button
        type="button"
        className="secondary"
        aria-label="Move down"
        disabled={index === length - 1}
        onClick={() => onMove(1)}
      >
        <ArrowDown size={16} />
      </button>
    </>
  );
}
