// Runs the Next dev server against a locally-built Go backend instead of the deployed one.
//
// More than `npm run dev` because the Go server reads real environment variables rather than
// .env.local, and Next's /api/* rewrite has to point at the local server instead of Cloud Run.

import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const GO_PORT = process.env.GO_PORT ?? '8080'
const NEXT_PORT = process.env.NEXT_PORT ?? '3000'
const backendUrl = `http://localhost:${GO_PORT}`

const readEnvFile = () => {
  const entries = {}
  let contents
  try {
    contents = readFileSync(resolve(root, '.env.local'), 'utf8')
  } catch {
    console.error('dev-local: .env.local not found; the Go server needs it for AGS credentials')
    process.exit(1)
  }

  for (const line of contents.split('\n')) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/)
    if (match) entries[match[1]] = match[2].trim().replace(/^["']|["']$/g, '')
  }
  return entries
}

const env = {
  ...process.env,
  ...readEnvFile(),
  PORT: GO_PORT,
  GO_BACKEND_URL: backendUrl
}

const origin = `http://localhost:${NEXT_PORT}`

const children = []

const run = (label, command, args, cwd) => {
  const child = spawn(command, args, { cwd, env, shell: true })
  child.stdout.on('data', data => process.stdout.write(`[${label}] ${data}`))
  child.stderr.on('data', data => process.stderr.write(`[${label}] ${data}`))
  child.on('exit', code => {
    console.log(`[${label}] exited with code ${code}`)
    shutdown()
  })
  children.push(child)
}

let shuttingDown = false
const shutdown = () => {
  if (shuttingDown) return
  shuttingDown = true
  children.forEach(child => child.kill())
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

console.log(`dev-local: Go on ${backendUrl}, Next on ${origin}`)
run('go', 'go', ['run', '.'], resolve(root, 'server'))
run('next', 'npx', ['next', 'dev', '--port', NEXT_PORT], root)
