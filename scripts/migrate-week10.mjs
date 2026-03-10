// Week 10 Migration: Add payment_routing, gce_contract_path, gce_confirmed_at to leads
import { execSync } from 'child_process';

const PROJECT_REF = 'xffmrambsjzmbquyqiea';

// Get Supabase access token from 1Password, fall back to env var
function getAccessToken() {
  try {
    return execSync(
      'op read "op://Greenway Dev/Supabase Access Token/credential"',
      { encoding: 'utf-8' }
    ).trim();
  } catch {
    console.log('1Password not available, falling back to SUPABASE_ACCESS_TOKEN env var');
    if (!process.env.SUPABASE_ACCESS_TOKEN) {
      throw new Error('SUPABASE_ACCESS_TOKEN env var is not set and 1Password is unavailable.');
    }
    return process.env.SUPABASE_ACCESS_TOKEN;
  }
}

const statements = [
  {
    label: 'Add payment_routing column (NOT NULL with default)',
    sql: `ALTER TABLE leads ADD COLUMN IF NOT EXISTS payment_routing text NOT NULL DEFAULT 'direct';`,
  },
  {
    label: 'Add gce_contract_path column',
    sql: `ALTER TABLE leads ADD COLUMN IF NOT EXISTS gce_contract_path text;`,
  },
  {
    label: 'Add gce_confirmed_at column',
    sql: `ALTER TABLE leads ADD COLUMN IF NOT EXISTS gce_confirmed_at timestamptz;`,
  },
  {
    label: 'Backfill existing GCE-source leads',
    sql: `UPDATE leads SET payment_routing = 'gce' WHERE source = 'GCE' AND payment_routing = 'direct';`,
  },
];

async function runSQL(token, sql) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return res.json();
}

async function run() {
  const token = getAccessToken();
  console.log('Using Supabase Management API.\n');

  for (const { label, sql } of statements) {
    console.log(`>> ${label}`);
    console.log(`   ${sql}`);
    try {
      const result = await runSQL(token, sql);
      console.log(`   ✓ Success`, Array.isArray(result) ? `(${result.length} rows)` : '', '\n');
    } catch (err) {
      console.error(`   ✗ Failed: ${err.message}\n`);
      throw err;
    }
  }

  console.log('Migration complete.');
}

run().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
