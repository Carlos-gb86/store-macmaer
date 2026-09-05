import { z } from "zod";
export type RichMark = {
  type: "bold" | "italic" | "link";
  attrs?: {
    href?: string;
    target?: string | null;
    rel?: string | null;
    class?: string | null;
  };
};
export type RichNode = {
  type:
    | "doc"
    | "paragraph"
    | "heading"
    | "bulletList"
    | "orderedList"
    | "listItem"
    | "text"
    | "hardBreak";
  text?: string;
  attrs?: { level?: number; start?: number; type?: string | null };
  marks?: RichMark[];
  content?: RichNode[];
};
export type RichTextDocument = RichNode & { type: "doc" };
export function safeLink(value: string) {
  if (/[\s\\]/.test(value)) return false;
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  try {
    const url = new URL(value);
    return (
      ["http:", "https:"].includes(url.protocol) &&
      !!url.hostname &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}
function validNode(
  value: unknown,
  depth: number,
  count: { n: number },
): value is RichNode {
  if (!value || typeof value !== "object" || depth > 20 || ++count.n > 5000)
    return false;
  const node = value as Record<string, unknown>;
  const types = [
    "doc",
    "paragraph",
    "heading",
    "bulletList",
    "orderedList",
    "listItem",
    "text",
    "hardBreak",
  ];
  if (
    !types.includes(String(node.type)) ||
    Object.keys(node).some(
      (k) => !["type", "text", "attrs", "marks", "content"].includes(k),
    )
  )
    return false;
  if (node.type === "doc" && depth !== 0) return false;
  if (
    node.type === "text" &&
    (typeof node.text !== "string" || node.text.length > 50000)
  )
    return false;
  if (
    node.attrs !== undefined &&
    (typeof node.attrs !== "object" ||
      node.attrs === null ||
      Array.isArray(node.attrs))
  )
    return false;
  const attrs = node.attrs as Record<string, unknown> | undefined;
  if (
    attrs &&
    Object.keys(attrs).some((k) => !["level", "start", "type"].includes(k))
  )
    return false;
  if (node.type === "heading" && ![2, 3].includes(Number(attrs?.level)))
    return false;
  if (
    node.marks !== undefined &&
    (!Array.isArray(node.marks) ||
      !node.marks.every((mark) => {
        if (!mark || typeof mark !== "object") return false;
        const m = mark as Record<string, unknown>;
        return (
          ["bold", "italic"].includes(String(m.type)) ||
          (m.type === "link" &&
            typeof (m.attrs as Record<string, unknown>)?.href === "string" &&
            safeLink(String((m.attrs as Record<string, unknown>).href)))
        );
      }))
  )
    return false;
  return (
    node.content === undefined ||
    (Array.isArray(node.content) &&
      node.content.every((n) => validNode(n, depth + 1, count)))
  );
}
export const richTextSchema = z.custom<RichTextDocument>((value) => {
  try {
    return (
      JSON.stringify(value).length <= 250000 &&
      (value as RichNode)?.type === "doc" &&
      validNode(value, 0, { n: 0 })
    );
  } catch {
    return false;
  }
}, "Use supported text formatting and safe links.");
export function textDocument(text: string): RichTextDocument {
  return {
    type: "doc",
    content: text.split(/\n\s*\n/).map((text) => ({
      type: "paragraph",
      content: text ? [{ type: "text", text }] : [],
    })),
  };
}
export function plainText(doc: RichTextDocument): string {
  const visit = (node: RichNode): string =>
    node.text ??
    node.content
      ?.map(visit)
      .join(
        ["doc", "bulletList", "orderedList"].includes(node.type) ? "\n" : "",
      ) ??
    "";
  return visit(doc);
}
