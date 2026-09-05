import type { ReactNode } from "react";
import {
  richTextSchema,
  type RichNode,
  type RichTextDocument,
} from "@/modules/content/rich-text";
function render(node: RichNode, key: number): ReactNode {
  let children: ReactNode =
    node.type === "text" ? node.text : node.content?.map(render);
  for (const [index, mark] of (node.marks ?? []).entries()) {
    if (mark.type === "bold")
      children = <strong key={index}>{children}</strong>;
    if (mark.type === "italic") children = <em key={index}>{children}</em>;
    if (mark.type === "link")
      children = (
        <a key={index} href={mark.attrs?.href} rel="noopener noreferrer">
          {children}
        </a>
      );
  }
  switch (node.type) {
    case "doc":
      return <div key={key}>{children}</div>;
    case "paragraph":
      return <p key={key}>{children}</p>;
    case "heading":
      return node.attrs?.level === 2 ? (
        <h2 key={key}>{children}</h2>
      ) : (
        <h3 key={key}>{children}</h3>
      );
    case "bulletList":
      return <ul key={key}>{children}</ul>;
    case "orderedList":
      return (
        <ol key={key} start={node.attrs?.start}>
          {children}
        </ol>
      );
    case "listItem":
      return <li key={key}>{children}</li>;
    case "hardBreak":
      return <br key={key} />;
    default:
      return <span key={key}>{children}</span>;
  }
}
export function RichText({
  document,
  fallback,
}: {
  document?: RichTextDocument | null;
  fallback: string;
}) {
  const result = richTextSchema.safeParse(document);
  return (
    <div className="rich-content">
      {result.success
        ? render(result.data, 0)
        : fallback.split("\n").map((text, i) => <p key={i}>{text}</p>)}
    </div>
  );
}
