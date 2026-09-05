import "server-only";
import { parseEnv, serverEnvSchema } from "./schema";
export function getServerEnv() {
  return parseEnv(serverEnvSchema, process.env);
}
