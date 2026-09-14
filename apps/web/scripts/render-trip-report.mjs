import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'

// Artwork exports of the real UI. The result scene intentionally uses sample statistics.
const directory = new URL('../../../docs/previews/', import.meta.url)
await mkdir(directory, { recursive: true })
const browser = await chromium.launch({ headless: true, executablePath: process.env.GAME_PREVIEW_BROWSER ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' })
try {
  for (const mobile of [false, true]) {
    const page = await browser.newPage({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 }, deviceScaleFactor: 2 })
    page.on('pageerror', (error) => process.stderr.write(`${error.message}\n`))
    const url = new URL(process.argv[2] ?? 'http://127.0.0.1:5173/')
    url.searchParams.set('scene', 'game'); url.searchParams.set('result', '1')
    await page.goto(url.href, { waitUntil: 'domcontentloaded' })
    await page.locator('.trip-report').waitFor({ state: 'visible' })
    await page.evaluate(async () => {
      await document.fonts.ready
      await Promise.all([...document.querySelectorAll('.trip-report img')].map((img) => img.decode()))
    })
    await page.waitForSelector('.board-scene[data-render-state="idle"] canvas')
    const output = fileURLToPath(new URL(`trip-report-${mobile ? 'mobile' : 'desktop'}.png`, directory))
    await page.screenshot({ path: output })
    process.stdout.write(`${output}\n`)
    if (!mobile) {
      await page.evaluate(() => { document.querySelector('.trip-player').open = true; document.querySelector('.trip-highlights').open = true; document.querySelector('.trip-report').style.maxHeight = 'none' })
      const details = fileURLToPath(new URL('trip-report-details.png', directory))
      await page.locator('.trip-report').screenshot({ path: details })
      process.stdout.write(`${details}\n`)
    }
    await page.close()
  }
  const page = await browser.newPage({ viewport: { width: 1100, height: 850 }, deviceScaleFactor: 2 })
  for (const card of ['chance-renovate', 'fate-turtle', 'chance-bomb']) {
    const url = new URL(process.argv[2] ?? 'http://127.0.0.1:5173/')
    url.searchParams.set('scene', 'game'); url.searchParams.set('card', card)
    await page.goto(url.href, { waitUntil: 'domcontentloaded' })
    await page.locator('.card-reveal').waitFor({ state: 'visible' })
    await page.locator('.card-reveal').getByRole('button', { name: '停留阅读', exact: true }).click()
    await page.evaluate(async () => {
      await document.fonts.ready
      await Promise.all([...document.querySelectorAll('.card-reveal img')].map((img) => img.decode()))
    })
    const output = fileURLToPath(new URL(`${card}-result.png`, directory))
    await page.locator('.card-reveal').screenshot({ path: output })
    process.stdout.write(`${output}\n`)
  }
  await page.close()
} finally { await browser.close() }
