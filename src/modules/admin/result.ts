export type MutationResult<T = { id?: string; updated_at?: string }> =
  | { ok: true; data: T; message: string }
  | {
      ok: false;
      code:
        "validation" | "unauthorized" | "forbidden" | "conflict" | "unexpected";
      message: string;
      fields?: Record<string, string[]>;
    };
export class AccessError extends Error {
  constructor(public code: "unauthorized" | "forbidden") {
    super(
      code === "unauthorized"
        ? "Please sign in."
        : "Administrator access is required.",
    );
  }
}
