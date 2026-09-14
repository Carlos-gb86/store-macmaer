import { ArrowUpRight } from "lucide-react";

export function ExternalArrow({ size = 16 }: { size?: number }) {
  return (
    <ArrowUpRight
      className="external-arrow"
      aria-hidden="true"
      focusable="false"
      size={size}
      strokeWidth={1.5}
    />
  );
}
