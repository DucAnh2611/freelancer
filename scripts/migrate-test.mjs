import { getConfig, runSQL } from './env.mjs'

const { url, key } = getConfig()

try {
  const result = await runSQL(url, key, `SELECT current_timestamp AS now, current_database() AS db`)
  const row = Array.isArray(result) ? result[0] : result
  console.log(`✓ Connected successfully`)
  console.log(`  Database: ${row.db}`)
  console.log(`  Time:     ${row.now}`)
  console.log(`  URL:      ${url}`)
} catch (err) {
  if (err.message.includes('exec_sql')) {
    console.error(`✗ Bootstrap required. Run this SQL in your Supabase SQL Editor:\n`)
    console.error(`  → Copy the contents of supabase/migrations/00000_bootstrap.sql`)
    console.error(`  → Paste and run it in: ${url} → SQL Editor\n`)
  } else {
    console.error(`✗ Connection failed: ${err.message}`)
    console.error(`\n  Check your VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY`)
  }
  process.exit(1)
}
