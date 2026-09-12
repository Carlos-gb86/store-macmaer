import { homepageDefaults, type Homepage } from "./schema";

export async function resolveHomepage(
  load: () => Promise<Homepage>,
  lastKnown: Homepage | null,
) {
  try {
    return { value: await load(), fallbackUsed: false as const };
  } catch {
    return {
      value: lastKnown ?? homepageDefaults,
      fallbackUsed: true as const,
    };
  }
}
