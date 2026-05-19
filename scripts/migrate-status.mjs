import fs from 'fs'
import path from 'path'
import { getConfig, runSQL } from './env.mjs'

const { url, key } = getConfig()
const MIGRATIONS_DIR = path.resolve('supabase/migrations')

const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort()

let applied = []
try {
  const result = await runSQL(url, key, `SELECT name, applied_at FROM _migrations ORDER BY name`)
  applied = Array.isArray(result) ? result : []
} catch {
  // table doesn't exist yet
}

const appliedNames = applied.map((r) => r.name)

console.log('Migration Status:\n')
for (const file of files) {
  const match = applied.find((r) => r.name === file)
  if (match) {
    console.log(`  ✓ ${file}  (applied ${new Date(match.applied_at).toLocaleDateString()})`)
  } else {
    console.log(`  ○ ${file}  (pending)`)
  }
}

const pending = files.filter((f) => !appliedNames.includes(f))
console.log(`\n${applied.length} applied, ${pending.length} pending\n`)
