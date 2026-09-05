import type { ButtonHTMLAttributes } from "react";
export const buttonClass = "button";
export function Button({
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={buttonClass + " " + className} {...props} />;
}
