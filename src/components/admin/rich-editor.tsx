"use client";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import type { RichTextDocument } from "@/modules/content/rich-text";
export function RichEditor({
  value,
  onChange,
  label = "Description",
}: {
  value: RichTextDocument;
  onChange: (value: RichTextDocument) => void;
  label?: string;
}) {
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
  if (!editor) return <p>Loading text editor…</p>;
  return (
    <div className="rich-editor">
      <span className="field-label">{label}</span>
      <div
        className="editor-toolbar"
        role="toolbar"
        aria-label={label + " formatting"}
      >
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          aria-label="Bold"
        >
          B
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          aria-label="Italic"
        >
          <em>I</em>
        </button>
        <button
          type="button"
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
        >
          Heading
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          Bullets
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          Numbered list
        </button>
        <button
          type="button"
          onClick={() => {
            const href = window.prompt(
              "Link URL (https://… or /page)",
              String(editor.getAttributes("link").href ?? ""),
            );
            if (href === null) return;
            if (!href) editor.chain().focus().unsetLink().run();
            else editor.chain().focus().setLink({ href }).run();
          }}
        >
          Link
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
