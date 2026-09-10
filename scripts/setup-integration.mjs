import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
const cli = "node_modules/.bin/supabase";
const status = JSON.parse(
  execFileSync(cli, ["status", "-o", "json"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }),
);
if (new URL(status.API_URL).hostname !== "127.0.0.1")
  throw new Error("Integration setup requires local Supabase.");
const client = createClient(status.API_URL, status.SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
  // No integration setup path uses Realtime. This bypasses the SDK's eager
  // WebSocket check when the local runner is older than the required Node 22.
  realtime: { transport: class UnusedWebSocketTransport {} },
});
const password = randomBytes(24).toString("base64url");
const users = {};
for (const role of ["admin", "ordinary"]) {
  const email = `${role}@integration.macmaer.test`;
  const { data: list, error: listError } = await client.auth.admin.listUsers();
  if (listError) throw listError;
  const existing = list.users.find((u) => u.email === email);
  const { data, error } = existing
    ? await client.auth.admin.updateUserById(existing.id, {
        password,
        email_confirm: true,
      })
    : await client.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
  if (error) throw error;
  users[role] = { id: data.user.id, email, password };
}
execFileSync(
  cli,
  [
    "db",
    "query",
    "--local",
    `insert into private.admin_users(user_id) values('${users.admin.id}') on conflict do nothing`,
  ],
  { stdio: ["ignore", "pipe", "pipe"] },
);
const env = {
  url: status.API_URL,
  key: status.ANON_KEY,
  serviceKey: status.SERVICE_ROLE_KEY,
  ...users,
};
writeFileSync(".env.integration.json", JSON.stringify(env), { mode: 0o600 });
console.log(
  "Local integration accounts prepared. Credentials saved only in ignored .env.integration.json.",
);
