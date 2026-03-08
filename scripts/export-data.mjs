#!/usr/bin/env node

/**
 * Export all Supabase data to timestamped JSON files.
 * Zero dependencies — uses only Node built-ins + native fetch.
 *
 * Usage:
 *   node scripts/export-data.mjs
 *
 * Credentials are read from 1Password (op CLI) with env var fallback.
 * Output goes to exports/<timestamp>/ with one JSON file per table.
 */

import { execSync } from "child_process";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";

// ── Secrets ──

function getSecret(opPath, envFallback) {
  try {
    return execSync(`op read "${opPath}"`, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
  } catch {
    return process.env[envFallback] || null;
  }
}

const SUPABASE_URL = getSecret("op://Greenway Dev/Supabase/url", "VITE_SUPABASE_URL");
const SUPABASE_KEY = getSecret("op://Greenway Dev/Supabase/service_role_key", "SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    "Missing Supabase credentials.\n" +
    "Either install the 1Password CLI (op) and sign in, or set these env vars:\n" +
    "  VITE_SUPABASE_URL\n" +
    "  SUPABASE_SERVICE_ROLE_KEY"
  );
  process.exit(1);
}

// ── Tables (derived from useData.js) ──

const TABLES = [
  "leads",
  "musicians",
  "contacts",
  "gig_assignments",
  "galleries",
  "gallery_photos",
  "social_posts",
  "sms_settings",
  "sms_messages",
  "calendar_events_external",
  "calendar_tokens",
];

// ── Fetch all rows from a table via Supabase REST API ──

async function fetchTable(table) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?select=*`;
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${table}: ${res.status} ${res.statusText} — ${body}`);
  }
  return res.json();
}

// ── Main ──

async function main() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const outDir = join(process.cwd(), "exports", timestamp);
  mkdirSync(outDir, { recursive: true });

  console.log(`Exporting ${TABLES.length} tables to ${outDir}\n`);

  let totalRows = 0;

  for (const table of TABLES) {
    try {
      const rows = await fetchTable(table);
      const filePath = join(outDir, `${table}.json`);
      writeFileSync(filePath, JSON.stringify(rows, null, 2));
      console.log(`  ${table}: ${rows.length} rows`);
      totalRows += rows.length;
    } catch (err) {
      console.error(`  ${table}: FAILED — ${err.message}`);
    }
  }

  console.log(`\nDone. ${totalRows} total rows exported.`);
}

main().catch((err) => {
  console.error("Export failed:", err);
  process.exit(1);
});
