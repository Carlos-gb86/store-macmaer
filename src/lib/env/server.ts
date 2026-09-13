import "server-only";
import { parseEnv, serverEnvSchema } from "./schema";
import { publicEnvInput } from "./public";
export function getServerEnv() {
  return parseEnv(serverEnvSchema, {
    ...process.env,
    ...publicEnvInput(),
  });
}
