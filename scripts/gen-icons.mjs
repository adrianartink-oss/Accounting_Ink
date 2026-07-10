// Rendert public/favicon.svg zu den PWA-PNG-Icons via vorinstalliertem Chromium.
// Aufruf: node scripts/gen-icons.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { chromium } from 'playwright'

const here = dirname(fileURLToPath(import.meta.url))
const publicDir = join(here, '..', 'public')
const svg = readFileSync(join(publicDir, 'favicon.svg'), 'utf8')

const targets = [
  { file: 'pwa-192.png', size: 192 },
  { file: 'pwa-512.png', size: 512 },
  { file: 'apple-touch-icon.png', size: 180 },
]

// Vorinstalliertes Chromium im Agent-Environment; Fallback auf Playwright-Default.
const execPath = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const browser = await chromium.launch({ executablePath: execPath })
try {
  for (const { file, size } of targets) {
    const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 })
    const html = `<!doctype html><html><head><style>
      *{margin:0;padding:0}html,body{width:${size}px;height:${size}px;overflow:hidden}
      svg{width:${size}px;height:${size}px;display:block}
    </style></head><body>${svg}</body></html>`
    await page.setContent(html, { waitUntil: 'networkidle' })
    const buf = await page.screenshot({ omitBackground: true })
    writeFileSync(join(publicDir, file), buf)
    await page.close()
    console.log('geschrieben:', file, `(${size}x${size})`)
  }
} finally {
  await browser.close()
}
