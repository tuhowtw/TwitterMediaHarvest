#!/usr/bin/env node
import { readFile, readdir, writeFile } from 'fs/promises'
import { join, resolve } from 'path'

const localesDir = resolve('locales')
const files = await readdir(localesDir)
const poFiles = files.filter(f => f.endsWith('.po') && f !== 'en.po')

const patches = [
  { id: 'Folder B (optional)', str: 'Folder B (optional)' },
  {
    id: 'Second download folder for button B. Leave empty to fall back to Folder A.',
    str: 'Second download folder for button B. Leave empty to fall back to Folder A.',
  },
  { id: 'Leave empty to use Folder A', str: 'Leave empty to use Folder A' },
]

for (const file of poFiles) {
  const filePath = join(localesDir, file)
  let content = await readFile(filePath, 'utf8')
  let modified = false

  for (const { id, str } of patches) {
    const escaped = id.replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    const pattern = new RegExp('(msgid "' + escaped + '"\\r?\\nmsgstr )""', 'g')
    const newContent = content.replace(pattern, `$1"${str}"`)
    if (newContent !== content) {
      content = newContent
      modified = true
    }
  }

  if (modified) {
    await writeFile(filePath, content)
    console.log('Patched ' + file)
  } else {
    console.log('No change: ' + file)
  }
}
