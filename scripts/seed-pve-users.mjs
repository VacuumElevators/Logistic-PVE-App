// One-off seed: creates the PVE client team — auth.users entries + matching
// public."User" rows — so they can log into the portal.
//
// Idempotent: re-running updates the password + profile for existing emails.
//
// Run with:  node --env-file=.env.local scripts/seed-pve-users.mjs

import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";

const USERS = [
  { name: "John Castellanos", email: "castellanosj@vacuumelevators.com", role: "SUPER_ADMIN", location: "USA" },
  { name: "Frank Reyes", email: "reyesf@vacuumelevators.com", role: "STAFF", location: "USA" },
  { name: "Gabriel Alvarez", email: "alvarezg@vacuumelevators.com", role: "STAFF", location: "USA" },
  { name: "Syed Abuthahir", email: "syed@vacuumelevators.com", role: "STAFF", location: "INDIA" },
  { name: "Kokila Adhavan", email: "kokila@vacuumelevators.com", role: "STAFF", location: "INDIA" },
  { name: "Eduardo Barbagelata", email: "ebarbagelata@pve-lifts.com", role: "STAFF", location: "SPAIN" },
];

// Strong but typeable temp password: PVE-XXXXXXXX-#### (resets on first login).
function tempPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = randomBytes(8);
  let core = "";
  for (const b of bytes) core += chars[b % chars.length];
  const digits = (randomBytes(2).readUInt16BE(0) % 9000) + 1000;
  return `PVE-${core}-${digits}`;
}

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
  const { data: list } = await supabase.auth.admin.listUsers({ page: 1, perPage: 500 });
  const existingByEmail = new Map((list?.users ?? []).map((u) => [u.email, u]));

  const report = [];

  for (const u of USERS) {
    const email = u.email.toLowerCase().trim();
    const password = tempPassword();
    const existing = existingByEmail.get(email);

    let userId;
    if (existing) {
      const { error } = await supabase.auth.admin.updateUserById(existing.id, {
        password,
        email_confirm: true,
      });
      if (error) throw new Error(`${email}: ${error.message}`);
      userId = existing.id;
    } else {
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (error) throw new Error(`${email}: ${error.message}`);
      userId = data.user.id;
    }

    const { error: upsertErr } = await supabase.from("User").upsert(
      {
        id: userId,
        name: u.name,
        email,
        role: u.role,
        locationId: u.location,
        status: "ACTIVE",
      },
      { onConflict: "id" },
    );
    if (upsertErr) throw new Error(`${email} profile: ${upsertErr.message}`);

    report.push({ name: u.name, email, role: u.role, location: u.location, password, existed: !!existing });
  }

  console.log("\nDone. Credentials to distribute (each user resets on first login):\n");
  for (const r of report) {
    console.log(`  ${r.name}  [${r.role} / ${r.location}]${r.existed ? "  (updated)" : ""}`);
    console.log(`    email:    ${r.email}`);
    console.log(`    password: ${r.password}\n`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
