// Runs the Next dev server against a locally-built Go backend instead of the deployed one.
//
// Two things make this more than `npm run dev`: the Go server reads real environment variables
// rather than .env.local, and the browser needs NEXT_PUBLIC_GO_BACKEND_URL pointed at the local
// server or its websocket dial goes to Cloud Run. Vercel rewrites cannot proxy a websocket
// upgrade, so /api/realtime is reached directly rather than through Next's /api/* rewrite.

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
  GO_BACKEND_URL: backendUrl,
  NEXT_PUBLIC_GO_BACKEND_URL: backendUrl
}

// The Go server rejects websocket upgrades from any origin not listed here, and browsers send no
// CORS preflight for a websocket, so a missing entry surfaces as a bare 403 on connect.
const origin = `http://localhost:${NEXT_PORT}`
if (!(env.ALLOWED_ORIGINS ?? '').split(',').some(allowed => allowed.trim() === origin)) {
  env.ALLOWED_ORIGINS = [env.ALLOWED_ORIGINS, origin].filter(Boolean).join(',')
  console.log(`dev-local: added ${origin} to ALLOWED_ORIGINS for this run`)
}

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
