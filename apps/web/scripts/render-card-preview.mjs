import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'

// Export the real card dialog at desktop/mobile sizes, including a spectator view.
const directory = new URL('../../../docs/previews/', import.meta.url)
await mkdir(directory, { recursive: true })
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.GAME_PREVIEW_BROWSER ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
})
try {
  const captures = []
  for (const mobile of [false, true]) {
    const page = await browser.newPage({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 }, deviceScaleFactor: mobile ? 2 : 1.5 })
    page.on('pageerror', (error) => process.stderr.write(`${error.message}\n`))
    for (const deck of ['chance', 'fate']) {
      const url = new URL(process.argv[2] ?? 'http://127.0.0.1:5173/')
      url.searchParams.set('scene', 'game'); url.searchParams.set('deck', deck)
      if (mobile && deck === 'fate') url.searchParams.set('viewer', 'alan')
      await page.goto(url.href, { waitUntil: 'domcontentloaded' })
      await page.locator('.card-choice-dialog').waitFor({ state: 'visible' })
      await page.evaluate(async () => {
        await document.fonts.ready
        await Promise.all([...document.querySelectorAll('.travel-card-back')].map((img) => img.decode()))
      })
      await page.waitForSelector('.board-scene[data-render-state="idle"] canvas')
      const output = mobile ? await page.screenshot() : await page.locator('.card-choice-dialog').screenshot()
      captures.push({ mobile, image: output.toString('base64') })
    }
    await page.close()
  }
  const compose = await browser.newPage()
  for (const mobile of [false, true]) {
    const encoded = await compose.evaluate(async ({ cards, mobile }) => {
      const images = await Promise.all(cards.map(async (card) => {
        const img = new Image(); img.src = `data:image/png;base64,${card.image}`; await img.decode(); return img
      }))
      const gap = 32, margin = 32, titleHeight = 56
      const widths = images.map((img) => Math.round(img.width / (mobile ? 2 : 1.5)))
      const heights = images.map((img) => Math.round(img.height / (mobile ? 2 : 1.5)))
      const canvas = document.createElement('canvas')
      canvas.width = (widths[0] + widths[1] + margin * 2 + gap) * 2
      canvas.height = (Math.max(...heights) + titleHeight + margin * 2) * 2
      const ctx = canvas.getContext('2d'); ctx.scale(2, 2)
      ctx.fillStyle = '#edf3ef'; ctx.fillRect(0, 0, canvas.width / 2, canvas.height / 2)
      ctx.fillStyle = '#29443d'; ctx.font = '600 20px -apple-system, sans-serif'
      for (let i = 0; i < 2; i++) {
        const x = margin + (i ? widths[0] + gap : 0)
        ctx.fillText(i ? (mobile ? '命运 · 旁观玩家视角' : '命运 · 粉色感叹号') : (mobile ? '机会 · 当前玩家视角' : '机会 · 黄色问号'), x, margin + 25)
        ctx.drawImage(images[i], x, margin + titleHeight, widths[i], heights[i])
      }
      return canvas.toDataURL('image/png').split(',')[1]
    }, { cards: captures.filter((capture) => capture.mobile === mobile), mobile })
    const path = fileURLToPath(new URL(`card-backs-${mobile ? 'mobile' : 'in-game'}.png`, directory))
    await writeFile(path, Buffer.from(encoded, 'base64'))
    process.stdout.write(`${path}\n`)
  }
} finally { await browser.close() }
