import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// D-001: only src/supabaseClient.ts may load the Supabase client, and it may expose auth only.
function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? sourceFiles(path) : /\.(ts|tsx)$/.test(name) ? [path] : []
  })
}

describe('browser read path (D-001)', () => {
  const files = sourceFiles(join(__dirname, '..', 'src'))

  it('loads @supabase/supabase-js values only in supabaseClient.ts', () => {
    const offenders = files.filter((file) => {
      const text = readFileSync(file, 'utf8')
      const valueImport = /^import\s+(?!type\b)[^\n]*from\s+['"]@supabase\/supabase-js['"]/m.test(text)
      return valueImport && !file.endsWith('supabaseClient.ts')
    })
    expect(offenders).toEqual([])
  })

  it('exports only auth from supabaseClient.ts', () => {
    const text = readFileSync(join(__dirname, '..', 'src', 'supabaseClient.ts'), 'utf8')
    const exported = [...text.matchAll(/export\s+const\s+(\w+)/g)].map((m) => m[1]).sort()
    expect(exported).toEqual(['auth', 'authConfigError'])
  })

  it('never calls Supabase table or storage APIs', () => {
    const offenders = files.filter((file) => /\.(from|rpc)\(|\.storage\b/.test(readFileSync(file, 'utf8')))
    expect(offenders).toEqual([])
  })
})
