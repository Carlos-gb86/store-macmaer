import { ZodError } from "zod";
import { AccessError, type MutationResult } from "./result";
export function mutationError(
  error: unknown,
  operation: string,
): MutationResult<never> {
  if (error instanceof AccessError)
    return {
      ok: false,
      code: error.code,
      message: "Administrator access required. Sign in again.",
    };
  if (error instanceof ZodError)
    return {
      ok: false,
      code: "validation",
      message: "Please check the highlighted fields.",
      fields: Object.fromEntries(
        error.issues.map((i) => [i.path.join("."), [i.message]]),
      ),
    };
  const code =
    error && typeof error === "object" && "code" in error
      ? String(error.code)
      : "unknown";
  if (code === "40001" || code === "PT409")
    return {
      ok: false,
      code: "conflict",
      message:
        "Someone changed this record. Your edits are retained; reload in a separate tab to compare before saving again.",
    };
  if (code === "42501")
    return {
      ok: false,
      code: "forbidden",
      message: "Administrator access is no longer available.",
    };
  if (["23505", "23514", "23503", "22023"].includes(code))
    return {
      ok: false,
      code: "validation",
      message:
        code === "23505"
          ? "A key, code, slug, SKU, or option value is already in use."
          : "Check the references, required fields, ranges, and combinations.",
    };
  console.error(
    JSON.stringify({ event: "admin_mutation_failed", operation, code }),
  );
  return {
    ok: false,
    code: "unexpected",
    message:
      "The change could not be saved. Your edits are retained; please retry.",
  };
}
