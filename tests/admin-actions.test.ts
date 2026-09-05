import { it, expect, vi } from "vitest";
import { AccessError } from "@/modules/admin/result";
vi.mock("@/modules/admin/auth", () => ({ requireAdmin: vi.fn() }));
vi.mock("next/cache", () => ({ updateTag: vi.fn() }));
import { requireAdmin } from "@/modules/admin/auth";
import {
  saveProduct,
  saveCollection,
  mutateTag,
} from "@/modules/admin/actions";
import { saveHomepage } from "@/modules/content/actions";
import {
  beginUpload,
  finishUpload,
  removeMedia,
  retryMediaCleanup,
} from "@/modules/admin/media-actions";
it.each(["unauthorized", "forbidden"] as const)(
  "checks %s access before parsing every direct mutation call",
  async (code) => {
    vi.mocked(requireAdmin).mockRejectedValue(new AccessError(code));
    for (const operation of [
      () => saveProduct({}),
      () => saveCollection({}),
      () => mutateTag("save", {}),
      () => saveHomepage({}),
      () => beginUpload({}),
      () => finishUpload("invalid"),
      () => removeMedia("invalid"),
      () => retryMediaCleanup(),
    ])
      expect(await operation()).toMatchObject({ ok: false, code });
  },
);
