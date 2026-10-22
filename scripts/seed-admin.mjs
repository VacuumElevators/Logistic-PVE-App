// One-off seed: creates an auth.users entry + matching public."User" row so
// you can log into the app after the Supabase Auth swap.
//
// Run with:  node --env-file=.env.local scripts/seed-admin.mjs

import { createClient } from "@supabase/supabase-js";

const SEED_EMAIL = "admin@pve.com";
const SEED_PASSWORD = "admin123";
const SEED_NAME = "Admin";
const SEED_ROLE = "SUPER_ADMIN";
const SEED_LOCATION = "USA";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log(`Creating auth user ${SEED_EMAIL}…`);

  // Look up by listing — admin.getUserByEmail doesn't exist in this SDK
  // version, so we either create or update through the unified path.
  const { data: list } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  const existing = list?.users?.find((u) => u.email === SEED_EMAIL);

  let userId;
  if (existing) {
    console.log(`  already exists (id=${existing.id}); updating password`);
    const { error } = await supabase.auth.admin.updateUserById(existing.id, {
      password: SEED_PASSWORD,
      email_confirm: true,
    });
    if (error) throw error;
    userId = existing.id;
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email: SEED_EMAIL,
      password: SEED_PASSWORD,
      email_confirm: true,
    });
    if (error) throw error;
    userId = data.user.id;
    console.log(`  created (id=${userId})`);
  }

  console.log(`Upserting public.User row for ${SEED_EMAIL}…`);
  const { error: upsertErr } = await supabase
    .from("User")
    .upsert(
      {
        id: userId,
        name: SEED_NAME,
        email: SEED_EMAIL,
        role: SEED_ROLE,
        locationId: SEED_LOCATION,
        status: "ACTIVE",
      },
      { onConflict: "id" },
    );
  if (upsertErr) throw upsertErr;

  console.log("Done.");
  console.log(`  Email:    ${SEED_EMAIL}`);
  console.log(`  Password: ${SEED_PASSWORD}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
