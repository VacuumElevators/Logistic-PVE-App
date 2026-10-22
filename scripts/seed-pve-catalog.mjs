// Seed the PVE catalog (8 ElevatorModel rows + ~870 Part rows) from the
// JSON fixtures committed under scripts/data/. Idempotent — upserts by the
// natural unique keys (modelCode for ElevatorModel, sku for Part).
//
// DO NOT RUN AGAINST PRODUCTION. As of 2026-05-28 the production parts
// catalog is owned by the customer's Google Sheet (uploaded via the /parts
// "Import CSV" button). This script is preserved only for local dev seeds.
//
// Run with:  node --env-file=.env.local scripts/seed-pve-catalog.mjs

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const here = dirname(fileURLToPath(import.meta.url));
const models = JSON.parse(readFileSync(resolve(here, "data/pve-models.json"), "utf8"));
const parts = JSON.parse(readFileSync(resolve(here, "data/pve-parts.json"), "utf8"));

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log(
    "Note: ElevatorModel.capacity is set to 4 as a placeholder. Real per-config\n" +
    "      cylinder counts are pending PVE confirmation.\n",
  );

  console.log(`Upserting ${models.length} ElevatorModel rows…`);
  const { error: mErr } = await supabase
    .from("ElevatorModel")
    .upsert(models, { onConflict: "modelCode" });
  if (mErr) throw mErr;
  const activeCount = models.filter((m) => m.isActive).length;
  console.log(`  ${models.length} models upserted (${activeCount} active, ${models.length - activeCount} hidden)`);

  console.log(`Upserting ${parts.length} Part rows…`);
  // Supabase has a payload size limit; chunk to be safe.
  const CHUNK = 500;
  for (let i = 0; i < parts.length; i += CHUNK) {
    const slice = parts.slice(i, i + CHUNK);
    const { error: pErr } = await supabase
      .from("Part")
      .upsert(slice, { onConflict: "sku" });
    if (pErr) {
      console.error(`Failed chunk ${i}-${i + slice.length}:`, pErr.message);
      throw pErr;
    }
    console.log(`  ${Math.min(i + CHUNK, parts.length)} / ${parts.length}`);
  }

  // Summary counts from DB
  const { count: modelCount } = await supabase
    .from("ElevatorModel").select("*", { count: "exact", head: true });
  const { count: activeModelCount } = await supabase
    .from("ElevatorModel").select("*", { count: "exact", head: true }).eq("isActive", true);
  const { count: partCount } = await supabase
    .from("Part").select("*", { count: "exact", head: true });

  console.log("\nDone.");
  console.log(`  ElevatorModel: ${modelCount} total (${activeModelCount} active)`);
  console.log(`  Part:          ${partCount}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
