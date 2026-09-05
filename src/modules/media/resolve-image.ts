import { getPublicEnv } from "@/lib/env/public";
export function resolveImage(path: string) {
  if (path.startsWith("/images/")) return path;
  if (
    !path ||
    path.startsWith("/") ||
    path.includes("..") ||
    path.includes("://")
  )
    throw new Error("Invalid catalogue image path.");
  const url = getPublicEnv().NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error("Supabase URL is required for Storage images.");
  return (
    url +
    "/storage/v1/object/public/catalogue/" +
    path.split("/").map(encodeURIComponent).join("/")
  );
}
