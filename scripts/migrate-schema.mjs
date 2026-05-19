import { getConfig, runSQL } from './env.mjs'

const { url, key } = getConfig()

const tables = await runSQL(url, key, `
  SELECT tablename AS table_name
  FROM pg_tables
  WHERE schemaname = 'public'
  ORDER BY tablename
`)

if (!Array.isArray(tables) || tables.length === 0) {
  console.log('No tables found in public schema')
  process.exit(0)
}

for (const { table_name } of tables) {
  const columns = await runSQL(url, key, `
    SELECT
      column_name,
      data_type,
      udt_name,
      is_nullable,
      column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = '${table_name}'
    ORDER BY ordinal_position
  `)

  console.log(`── ${table_name}`)
  console.log(`${'   Column'.padEnd(30)} ${'Type'.padEnd(20)} ${'Nullable'.padEnd(10)} Default`)
  console.log(`   ${'─'.repeat(75)}`)

  for (const col of columns) {
    const type = col.data_type === 'USER-DEFINED' ? col.udt_name : col.data_type
    const nullable = col.is_nullable === 'YES' ? 'YES' : 'NO'
    const def = col.column_default ? col.column_default.substring(0, 30) : ''
    console.log(`   ${col.column_name.padEnd(27)} ${type.padEnd(20)} ${nullable.padEnd(10)} ${def}`)
  }
  console.log('')
}
