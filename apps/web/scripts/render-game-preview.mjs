import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'

// Export the requested interface artwork directly from the actual game components.
const url = new URL(process.argv[2] ?? 'http://127.0.0.1:5173/')
url.searchParams.set('scene', 'game')
const directory = new URL('../../../docs/previews/', import.meta.url)
await mkdir(directory, { recursive: true })
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.GAME_PREVIEW_BROWSER ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
})
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5 })
  page.on('pageerror', (error) => process.stderr.write(`${error.message}\n`))
  page.on('console', (message) => { if (message.type() === 'error') process.stderr.write(`${message.text()}\n`) })
  await page.goto(url.href, { waitUntil: 'networkidle' })
  await page.waitForSelector('.board-scene[data-render-state="idle"] canvas')
  await page.getByRole('button', { name: '拉近', exact: true }).click()
  await page.waitForSelector('.board-scene[data-render-state="idle"] canvas')
  await page.evaluate(() => document.fonts.ready)
  const output = fileURLToPath(new URL('game-contact-shadows.png', directory))
  await page.locator('.game-screen').screenshot({ path: output })
  process.stdout.write(`${output}\n`)
} finally { await browser.close() }
