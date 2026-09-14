"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";

type Tag = { slug: string; name: string; name_sv?: string | null };

export function TagSelector({
  tags,
  selected,
  onChange,
}: {
  tags: Tag[];
  selected: string[];
  onChange: (selected: string[]) => void;
}) {
  const [search, setSearch] = useState("");
  const visible = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase("en");
    return [...tags]
      .filter(
        (tag) =>
          !needle ||
          `${tag.name} ${tag.name_sv ?? ""} ${tag.slug}`
            .toLocaleLowerCase("en")
            .includes(needle),
      )
      .sort(
        (a, b) =>
          Number(selected.includes(b.slug)) -
            Number(selected.includes(a.slug)) || a.name.localeCompare(b.name),
      );
  }, [search, selected, tags]);

  return (
    <div className="admin-tag-selector">
      <label className="admin-tag-search">
        <span>Search tags</span>
        <span className="admin-tag-search-input">
          <Search size={17} aria-hidden="true" />
          <input
            type="search"
            value={search}
            placeholder="Type a tag name…"
            onChange={(event) => setSearch(event.target.value)}
          />
        </span>
      </label>
      <p className="field-note">
        {selected.length} {selected.length === 1 ? "tag" : "tags"} selected
      </p>
      <div className="admin-tag-badges" aria-label="Product tags">
        {visible.map((tag) => {
          const active = selected.includes(tag.slug);
          return (
            <button
              key={tag.slug}
              type="button"
              className={active ? "selected" : ""}
              aria-pressed={active}
              onClick={() =>
                onChange(
                  active
                    ? selected.filter((slug) => slug !== tag.slug)
                    : [...selected, tag.slug],
                )
              }
            >
              {tag.name}
              {tag.name_sv && (
                <small className="admin-tag-translation">{tag.name_sv}</small>
              )}
              <span aria-hidden="true">{active ? "×" : "+"}</span>
            </button>
          );
        })}
        {!visible.length && <p>No tags match “{search}”.</p>}
      </div>
    </div>
  );
}
