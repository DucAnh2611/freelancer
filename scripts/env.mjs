import fs from 'fs'
import path from 'path'

export function loadEnv() {
  const envFile = process.env.ENV_FILE || '.env.dev'
  const envPath = path.resolve(envFile)

  try {
    const content = fs.readFileSync(envPath, 'utf-8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx === -1) continue
      const key = trimmed.slice(0, eqIdx).trim()
      const val = trimmed.slice(eqIdx + 1).trim()
      if (!process.env[key]) process.env[key] = val
    }
    console.log(`Using ${envFile}\n`)
  } catch {
    console.error(`✗ Could not read ${envFile}`)
    process.exit(1)
  }
}

export function getConfig() {
  loadEnv()

  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    console.error('✗ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  return { url, key }
}

// Run SQL via pg-meta (self-hosted direct access)
async function runViaPgMeta(url, key, sql) {
  const res = await fetch(`${url}/pg/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: key },
    body: JSON.stringify({ query: sql }),
  })
  if (!res.ok) return null
  return res.json()
}

// Run SQL via RPC exec_sql function
async function runViaRPC(url, key, sql) {
  const res = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ query: sql }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`SQL failed (${res.status}): ${text}`)
  }
  return res.json()
}

const BOOTSTRAP_SQL = `
  CREATE OR REPLACE FUNCTION exec_sql(query text)
  RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
  DECLARE
    result json;
    normalized text;
  BEGIN
    normalized := LTRIM(query, E' \\t\\n\\r');
    IF LOWER(normalized) LIKE 'select%' OR LOWER(normalized) LIKE 'with%' THEN
      EXECUTE 'SELECT COALESCE(json_agg(t), ''[]''::json) FROM (' || normalized || ') t' INTO result;
      RETURN result;
    END IF;
    EXECUTE query;
    RETURN '[]'::json;
  END;
  $$;
  REVOKE EXECUTE ON FUNCTION exec_sql(text) FROM public;
  REVOKE EXECUTE ON FUNCTION exec_sql(text) FROM anon;
  REVOKE EXECUTE ON FUNCTION exec_sql(text) FROM authenticated;
  CREATE TABLE IF NOT EXISTS _migrations (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
`

// Detect mode and auto-bootstrap if needed
let _mode = null

export async function runSQL(url, key, sql) {
  // If we already know the mode, use it
  if (_mode === 'pgmeta') return runViaPgMeta(url, key, sql)
  if (_mode === 'rpc') return runViaRPC(url, key, sql)

  // Try pg-meta first (self-hosted)
  const pgResult = await runViaPgMeta(url, key, sql)
  if (pgResult !== null) {
    _mode = 'pgmeta'
    console.log('  [pg-meta] Connected\n')
    // Auto-bootstrap/upgrade exec_sql
    await runViaPgMeta(url, key, BOOTSTRAP_SQL)
    return pgResult
  }

  // Try RPC (cloud or already bootstrapped)
  try {
    const rpcResult = await runViaRPC(url, key, sql)
    _mode = 'rpc'
    console.log('  [rpc] Connected\n')
    return rpcResult
  } catch {
    // RPC failed — exec_sql doesn't exist yet, can't auto-bootstrap on cloud
    console.error('✗ Cannot connect to database.\n')
    console.error('  For Supabase Cloud: run this once in your SQL Editor:')
    console.error('  → Dashboard → SQL Editor → paste contents of:')
    console.error('    supabase/migrations/00000_bootstrap.sql\n')
    console.error('  For self-hosted: check that pg-meta is accessible at /pg/')
    process.exit(1)
  }
}
