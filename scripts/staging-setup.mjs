import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { parseArgs } from "node:util";
const { values } = parseArgs({
  options: {
    target: { type: "string" },
    "project-ref": { type: "string" },
    "admin-email": { type: "string" },
    seed: { type: "boolean" },
    migrate: { type: "boolean" },
  },
});
const reference = values["project-ref"],
  linked = readFileSync("supabase/.temp/project-ref", "utf8").trim();
if (
  values.target !== "staging" ||
  !reference ||
  reference !== linked ||
  !/^[a-z]{20}$/.test(reference)
)
  throw new Error(
    "Specify --target staging and --project-ref matching the linked staging project.",
  );
process.loadEnvFile(".env.local");
if (
  new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname !==
  reference + ".supabase.co"
)
  throw new Error("The environment URL and project reference do not match.");
const cli = "node_modules/.bin/supabase";
if (values.migrate)
  execFileSync(cli, ["db", "push", "--linked", "--yes"], { stdio: "inherit" });
const statements = [];
if (values["admin-email"]) {
  const email = values["admin-email"];
  if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email))
    throw new Error("Invalid email");
  statements.push(
    `do $$ declare account_id uuid; begin select id into strict account_id from auth.users where lower(email)=lower('${email}'); insert into private.admin_users(user_id) values(account_id) on conflict do nothing; end $$;`,
  );
}
if (values.seed) {
  statements.push(readFileSync("supabase/seed.sql", "utf8"));
  statements.push(
    "insert into public.homepage_products select id,row_number() over(order by sort_order,id)::integer from public.products where status='active' and featured and not exists(select 1 from public.homepage_products) order by sort_order,id limit 4 on conflict do nothing; insert into public.homepage_collections select id,row_number() over(order by sort_order,id)::integer from public.collections where active and not exists(select 1 from public.homepage_collections) on conflict do nothing;",
  );
}
if (statements.length) {
  const directory = mkdtempSync(join(tmpdir(), "macmaer-staging-")),
    file = join(directory, "setup.sql");
  try {
    writeFileSync(
      file,
      "do $macmaer_setup$ begin\n" +
        statements.join("\n") +
        "\nend $macmaer_setup$;\n",
      {
        mode: 0o600,
      },
    );
    execFileSync(cli, ["db", "query", "--linked", "--file", file], {
      stdio: ["ignore", "pipe", "pipe"],
    });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}
console.log(
  "Requested staging setup completed for " +
    reference +
    ". No database reset was performed.",
);
