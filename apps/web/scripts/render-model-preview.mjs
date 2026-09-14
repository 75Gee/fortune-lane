import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'

// Render the delivered artwork sheet from the shared model gallery.
const url = new URL(process.argv[2] ?? 'http://127.0.0.1:5173/')
url.searchParams.set('scene', 'models')
const directory = new URL('../public/assets/models/', import.meta.url)
await mkdir(directory, { recursive: true })
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.MODEL_PREVIEW_BROWSER ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
})
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1120 }, deviceScaleFactor: 1.5 })
  await page.goto(url.href, { waitUntil: 'networkidle' })
  await page.waitForFunction(() => {
    const canvases = [...document.querySelectorAll('.model-gallery-canvas')]
    return canvases.length > 0 && canvases.every((canvas) => canvas.dataset.ready === 'true')
  })
  await page.evaluate(() => document.fonts.ready)
  await page.locator('.model-gallery').screenshot({ path: fileURLToPath(new URL('preview.png', directory)) })
  process.stdout.write(`${fileURLToPath(new URL('preview.png', directory))}\n`)
} finally { await browser.close() }
