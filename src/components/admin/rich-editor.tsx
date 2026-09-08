"use client";
import { useEffect, useState } from "react";
import { useEditor, useEditorState, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Link2,
  Unlink,
  Undo2,
  Redo2,
} from "lucide-react";
import { safeLink, type RichTextDocument } from "@/modules/content/rich-text";
export function RichEditor({
  value,
  onChange,
  label = "Description",
  disabled = false,
}: {
  value: RichTextDocument;
  onChange: (value: RichTextDocument) => void;
  label?: string;
  disabled?: boolean;
}) {
  const [linkOpen, setLinkOpen] = useState(false),
    [href, setHref] = useState("");
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        blockquote: false,
        code: false,
        codeBlock: false,
        strike: false,
        horizontalRule: false,
        underline: false,
        link: { openOnClick: false },
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        "aria-label": label,
        role: "textbox",
        "aria-multiline": "true",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getJSON() as RichTextDocument),
  });
  useEffect(() => {
    editor?.setEditable(!disabled, false);
  }, [editor, disabled]);
  const state = useEditorState({
    editor,
    selector: ({ editor }) =>
      editor
        ? {
            bold: editor.isActive("bold"),
            italic: editor.isActive("italic"),
            bullets: editor.isActive("bulletList"),
            ordered: editor.isActive("orderedList"),
            link: editor.isActive("link"),
            heading: editor.isActive("heading", { level: 2 })
              ? "2"
              : editor.isActive("heading", { level: 3 })
                ? "3"
                : "p",
            undo: editor.can().undo(),
            redo: editor.can().redo(),
          }
        : null,
  });
  if (!editor) return <p>Loading text editor…</p>;
  // The subscription can initially retain its null-editor snapshot until the
  // first transaction. Mount EditorContent so that transaction can occur.
  const current = state ?? {
    bold: editor.isActive("bold"),
    italic: editor.isActive("italic"),
    bullets: editor.isActive("bulletList"),
    ordered: editor.isActive("orderedList"),
    link: editor.isActive("link"),
    heading: editor.isActive("heading", { level: 2 })
      ? "2"
      : editor.isActive("heading", { level: 3 })
        ? "3"
        : "p",
    undo: editor.can().undo(),
    redo: editor.can().redo(),
  };
  return (
    <div className="rich-field">
      <span className="field-label">{label}</span>
      <div className="rich-editor">
        <div
          className="editor-toolbar"
          role="group"
          aria-label={label + " formatting"}
        >
          <select
            aria-label="Text style"
            value={current.heading}
            onChange={(e) =>
              e.target.value === "p"
                ? editor.chain().focus().setParagraph().run()
                : editor
                    .chain()
                    .focus()
                    .setHeading({ level: Number(e.target.value) as 2 | 3 })
                    .run()
            }
          >
            <option value="p">Paragraph</option>
            <option value="2">Heading</option>
            <option value="3">Subheading</option>
          </select>
          <span className="toolbar-group">
            <button
              type="button"
              title="Bold"
              aria-label="Bold"
              aria-pressed={current.bold}
              onClick={() => editor.chain().focus().toggleBold().run()}
            >
              <Bold size={18} />
            </button>
            <button
              type="button"
              title="Italic"
              aria-label="Italic"
              aria-pressed={current.italic}
              onClick={() => editor.chain().focus().toggleItalic().run()}
            >
              <Italic size={18} />
            </button>
          </span>
          <span className="toolbar-group">
            <button
              type="button"
              title="Bulleted list"
              aria-label="Bulleted list"
              aria-pressed={current.bullets}
              onClick={() => editor.chain().focus().toggleBulletList().run()}
            >
              <List size={18} />
            </button>
            <button
              type="button"
              title="Numbered list"
              aria-label="Numbered list"
              aria-pressed={current.ordered}
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
            >
              <ListOrdered size={18} />
            </button>
          </span>
          <span className="toolbar-group">
            <button
              type="button"
              title="Add or edit link"
              aria-label="Add or edit link"
              aria-pressed={current.link}
              onClick={() => {
                setHref(String(editor.getAttributes("link").href ?? ""));
                setLinkOpen(!linkOpen);
              }}
            >
              <Link2 size={18} />
            </button>
            <button
              type="button"
              title="Remove link"
              aria-label="Remove link"
              disabled={!current.link}
              onClick={() => editor.chain().focus().unsetLink().run()}
            >
              <Unlink size={18} />
            </button>
          </span>
          <span className="toolbar-group">
            <button
              type="button"
              title="Undo"
              aria-label="Undo"
              disabled={!current.undo}
              onClick={() => editor.chain().focus().undo().run()}
            >
              <Undo2 size={18} />
            </button>
            <button
              type="button"
              title="Redo"
              aria-label="Redo"
              disabled={!current.redo}
              onClick={() => editor.chain().focus().redo().run()}
            >
              <Redo2 size={18} />
            </button>
          </span>
        </div>
        {linkOpen && (
          <div className="link-controls">
            <label>
              Link address
              <input
                value={href}
                onChange={(e) => setHref(e.target.value)}
                placeholder="https://example.com or /shop"
              />
            </label>
            <button
              type="button"
              disabled={!safeLink(href)}
              onClick={() => {
                editor
                  .chain()
                  .focus()
                  .extendMarkRange("link")
                  .setLink({ href })
                  .run();
                setLinkOpen(false);
              }}
            >
              Apply link
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => setLinkOpen(false)}
            >
              Cancel
            </button>
            {href && !safeLink(href) && (
              <small>
                Use an http(s) address or a local path such as /shop.
              </small>
            )}
          </div>
        )}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
