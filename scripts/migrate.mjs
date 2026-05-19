import fs from 'fs'
import path from 'path'
import { getConfig, runSQL } from './env.mjs'

const { url, key } = getConfig()
const MIGRATIONS_DIR = path.resolve('supabase/migrations')

async function main() {
  // Ensure _migrations table exists
  await runSQL(url, key, `
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `)

  const result = await runSQL(url, key, `SELECT name FROM _migrations ORDER BY name`)
  const applied = Array.isArray(result) ? result.map((r) => r.name) : []

  const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort()
  const pending = files.filter((f) => !applied.includes(f))

  if (pending.length === 0) {
    console.log('✓ No pending migrations')
    return
  }

  console.log(`Running ${pending.length} migration(s)...\n`)

  for (const file of pending) {
    console.log(`→ ${file}`)
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8')

    try {
      await runSQL(url, key, sql)
      await runSQL(url, key, `INSERT INTO _migrations (name) VALUES ('${file}')`)
      console.log(`  ✓ Applied\n`)
    } catch (err) {
      console.error(`  ✗ Failed: ${err.message}\n`)
      process.exit(1)
    }
  }

  console.log('✓ All migrations applied')
}

main()
