// UI regression snapshots for the web client.
//
//   node scripts/ui-snapshots.mjs capture <label> [--base http://localhost:5173] [--with-board] [--only name,name]
//   node scripts/ui-snapshots.mjs compare <before-label> <after-label>
//
// Requires `pnpm --filter @fortune/web dev` to be running. Screens come from the
// local `?scene=game` preview, so no game server is needed. The WebGL board is
// hidden and animations are frozen so only the DOM layer is compared.
// Output: docs/previews/ui-<label>/ (gitignored).
import { chromium } from 'playwright-core'
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const outDir = (label) => path.join(root, 'docs/previews', `ui-${label}`)

const viewports = {
  desktop: { width: 1440, height: 900 },
  laptop: { width: 1180, height: 760 },
  mobile: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 1 },
}

const game = '/?scene=game'
const menu = '[aria-label="对局菜单"]'
const scenes = [
  { name: 'home', url: '/' },
  { name: 'game', url: game },
  { name: 'game-settings', url: game, click: [menu] },
  { name: 'game-assets', url: game, click: ['[aria-label="我的资产"]'] },
  { name: 'game-players', url: game, click: [menu, 'role=group[name="对局菜单"] >> text=旅行者'] },
  { name: 'game-activity', url: game, click: [menu, 'role=group[name="对局菜单"] >> text=动态'] },
  { name: 'game-cards', url: game, click: [menu, 'role=group[name="对局菜单"] >> text=牌库'] },
  { name: 'game-items', url: game, click: ['[aria-label^="我的道具"]'] },
  { name: 'game-stocks', url: `${game}&stocks`, click: ['[aria-label^="打开股市"]'] },
  { name: 'game-leave', url: game, click: [menu, 'text=暂离房间'] },
  { name: 'game-surrender', url: game, click: [menu, 'text=投降并观战'] },
  { name: 'debt-bankruptcy', url: `${game}&decision=debt`, click: ['text=放弃筹款，宣告破产'] },
  { name: 'decision-purchase', url: `${game}&decision=purchase` },
  { name: 'decision-upgrade', url: `${game}&decision=upgrade` },
  { name: 'decision-auction', url: `${game}&decision=auction` },
  { name: 'decision-debt', url: `${game}&decision=debt` },
  { name: 'card-chance', url: `${game}&deck=chance` },
  { name: 'card-fate', url: `${game}&deck=fate` },
  { name: 'result', url: `${game}&result` },
]

// Prefer Playwright's bundled browser; fall back to an installed Chrome.
const gpuArgs = [
  '--enable-gpu',
  '--ignore-gpu-blocklist',
  ...(process.platform === 'darwin' ? ['--use-angle=metal'] : []),
]
const launch = () =>
  chromium.launch({ args: gpuArgs }).catch(() => chromium.launch({ channel: 'chrome', args: gpuArgs }))

const hideBoard = `
  canvas { visibility: hidden !important; }
`
const freeze = `
  *, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; }
`

async function capture(label, base, { withBoard = false, only = null } = {}) {
  const dir = outDir(label)
  await mkdir(dir, { recursive: true })
  const browser = await launch()
  const failures = []
  try {
    for (const [viewportName, viewport] of Object.entries(viewports)) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        isMobile: !!viewport.isMobile,
        hasTouch: !!viewport.hasTouch,
        deviceScaleFactor: viewport.deviceScaleFactor ?? 1,
        locale: 'zh-CN',
        timezoneId: 'Asia/Shanghai',
      })
      // Pin the clock so turn timers and "time ago" labels render identically between runs.
      await context.addInitScript(() => {
        const fixed = new Date('2026-01-01T12:00:00+08:00').getTime()
        const start = performance.now()
        Date.now = () => fixed + Math.floor(performance.now() - start)
      })
      for (const scene of scenes.filter((entry) => !only || only.includes(entry.name))) {
        const page = await context.newPage()
        try {
          await page.goto(base + scene.url, { waitUntil: 'load' })
          await page.addStyleTag({ content: withBoard ? freeze : hideBoard + freeze })
          // The WebGL board needs a few seconds to load models when it is kept visible.
          await page.waitForTimeout(withBoard ? 4500 : 1200)
          for (const selector of scene.click ?? []) {
            await page.locator(selector).first().click({ timeout: 4000 })
            await page.waitForTimeout(400)
          }
          await page.screenshot({ path: path.join(dir, `${viewportName}--${scene.name}.png`) })
        } catch (error) {
          failures.push(`${viewportName}/${scene.name}: ${error.message.split('\n')[0]}`)
        } finally {
          await page.close()
        }
      }
      await context.close()
    }
  } finally {
    await browser.close()
  }
  console.log(`Captured into ${path.relative(root, dir)}`)
  if (failures.length) console.log(`Failed:\n  ${failures.join('\n  ')}`)
}

async function compare(before, after) {
  const beforeDir = outDir(before),
    afterDir = outDir(after),
    diffDir = path.join(outDir(after), 'diff')
  await mkdir(diffDir, { recursive: true })
  const files = (await readdir(beforeDir)).filter((file) => file.endsWith('.png'))
  const browser = await launch()
  const page = await browser.newPage()
  const rows = []
  for (const file of files) {
    let afterPng
    try {
      afterPng = await readFile(path.join(afterDir, file))
    } catch {
      rows.push([file, 'missing'])
      continue
    }
    const beforePng = await readFile(path.join(beforeDir, file))
    // Pixel diff in the browser canvas to avoid adding an image dependency.
    const result = await page.evaluate(
      async ([a, b]) => {
        const load = async (base64) => createImageBitmap(await (await fetch(`data:image/png;base64,${base64}`)).blob())
        const [imageA, imageB] = await Promise.all([load(a), load(b)])
        const width = Math.max(imageA.width, imageB.width),
          height = Math.max(imageA.height, imageB.height)
        const read = (image) => {
          const canvas = new OffscreenCanvas(width, height)
          const context = canvas.getContext('2d')
          context.drawImage(image, 0, 0)
          return context.getImageData(0, 0, width, height)
        }
        const dataA = read(imageA),
          dataB = read(imageB)
        const out = new OffscreenCanvas(width, height),
          outContext = out.getContext('2d'),
          diff = outContext.createImageData(width, height)
        let changed = 0
        for (let i = 0; i < dataA.data.length; i += 4) {
          const delta =
            Math.abs(dataA.data[i] - dataB.data[i]) +
            Math.abs(dataA.data[i + 1] - dataB.data[i + 1]) +
            Math.abs(dataA.data[i + 2] - dataB.data[i + 2])
          const gray = (dataB.data[i] + dataB.data[i + 1] + dataB.data[i + 2]) / 3
          if (delta > 24) {
            changed++
            diff.data.set([230, 30, 90, 255], i)
          } else diff.data.set([gray, gray, gray, 70], i)
        }
        outContext.putImageData(diff, 0, 0)
        const reader = new FileReader()
        const url = await new Promise(async (resolve) => {
          reader.onload = () => resolve(reader.result)
          reader.readAsDataURL(await out.convertToBlob())
        })
        return {
          ratio: changed / (width * height),
          sizeChanged: imageA.width !== imageB.width || imageA.height !== imageB.height,
          png: url.split(',')[1],
        }
      },
      [beforePng.toString('base64'), afterPng.toString('base64')],
    )
    if (result.ratio > 0) await writeFile(path.join(diffDir, file), Buffer.from(result.png, 'base64'))
    rows.push([file, `${(result.ratio * 100).toFixed(2)}%${result.sizeChanged ? ' (size changed)' : ''}`])
  }
  await browser.close()
  const width = Math.max(...rows.map(([file]) => file.length))
  for (const [file, value] of rows) console.log(`${file.padEnd(width)}  ${value}`)
  console.log(`Diff images: ${path.relative(root, diffDir)}`)
}

const [command, a, b] = process.argv.slice(2)
const baseIndex = process.argv.indexOf('--base')
const base = baseIndex > 0 ? process.argv[baseIndex + 1] : 'http://localhost:5173'
const onlyIndex = process.argv.indexOf('--only')
const only = onlyIndex > 0 ? process.argv[onlyIndex + 1].split(',') : null
if (command === 'capture' && a) await capture(a, base, { withBoard: process.argv.includes('--with-board'), only })
else if (command === 'compare' && a && b) await compare(a, b)
else console.log('Usage: node scripts/ui-snapshots.mjs capture <label> | compare <before> <after>')
