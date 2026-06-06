import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const repoRoot = process.cwd()
const envFilePath = path.resolve(repoRoot, '.env.signing.local')
const sourceDir = path.resolve(repoRoot, 'build', 'firefox-signed')

const signingEnv = loadEnvFile(envFilePath)
const apiKey = signingEnv.AMO_JWT_ISSUER ?? process.env.AMO_JWT_ISSUER
const apiSecret = signingEnv.AMO_JWT_SECRET ?? process.env.AMO_JWT_SECRET

if (!apiKey || !apiSecret) {
  console.error(
    'Missing AMO signing credentials. Expected AMO_JWT_ISSUER and AMO_JWT_SECRET in .env.signing.local or environment variables.'
  )
  process.exit(1)
}

if (!fs.existsSync(sourceDir)) {
  console.error(
    `Missing Firefox build output at ${sourceDir}. Run "yarn build:firefox:all:self-sign" first.`
  )
  process.exit(1)
}

const npxCommand = 'npx'
const child = spawn(
  npxCommand,
  [
    '-y',
    'web-ext@latest',
    'sign',
    '--source-dir',
    sourceDir,
    '--api-key',
    apiKey,
    '--api-secret',
    apiSecret,
    '--channel',
    'unlisted',
    '--verbose',
  ],
  {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  }
)

child.on('exit', code => {
  process.exit(code ?? 1)
})

child.on('error', error => {
  console.error('Failed to start web-ext signing command.', error)
  process.exit(1)
})

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {}

  const content = fs.readFileSync(filePath, 'utf8')
  const entries = content
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.startsWith('#'))
    .map(line => {
      const separatorIndex = line.indexOf('=')
      if (separatorIndex === -1) return undefined

      const key = line.slice(0, separatorIndex).trim()
      const rawValue = line.slice(separatorIndex + 1).trim()
      const value = rawValue.replace(/^['"]|['"]$/g, '')
      return [key, value]
    })
    .filter(Boolean)

  return Object.fromEntries(entries)
}
