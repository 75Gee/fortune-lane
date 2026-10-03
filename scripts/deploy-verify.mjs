// Deployment availability checks; does not create rooms or run game scenarios.
import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import https from 'node:https'
import { randomBytes, createHash } from 'node:crypto'
import { setTimeout as delay } from 'node:timers/promises'

const [root, base, mode = 'entry', ip] = process.argv.slice(2)
if (!root || !base || !['all', 'entry'].includes(mode)) {
  throw new Error('Usage: node deploy-verify.mjs WEB_DIST URL [all|entry] [IPv4]')
}
const origin = new URL(base)
const transport = origin.protocol === 'https:' ? https : http
const lookup = ip
  ? (_hostname, options, callback) => callback(null, options.all ? [{ address: ip, family: 4 }] : ip, 4)
  : undefined

function get(route) {
  return new Promise((resolve, reject) => {
    const req = transport.get(new URL(route, origin), { lookup, timeout: 10000 }, res => {
      if (res.statusCode !== 200) {
        res.resume()
        reject(new Error(`${route}: HTTP ${res.statusCode}`))
        return
      }
      const chunks = []
      res.on('data', chunk => chunks.push(chunk))
      res.on('end', () => resolve(Buffer.concat(chunks)))
      res.on('error', reject)
    })
    req.on('timeout', () => req.destroy(new Error(`${route}: timeout`)))
    req.on('error', reject)
  })
}

let healthy = false
for (let attempt = 0; attempt < 20; attempt++) {
  try {
    const health = JSON.parse((await get('/health')).toString())
    if (health.ok !== true || health.service !== 'fortune-lane') throw new Error('Unexpected health response')
    healthy = true
    break
  } catch (error) {
    if (attempt === 19) throw error
    await delay(500)
  }
}
if (!healthy) throw new Error('Service not healthy')

function list(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(dir, entry.name)
    return entry.isDirectory() ? list(file) : [path.relative(root, file)]
  })
}
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8')
const files = mode === 'all'
  ? list(root)
  : ['index.html', ...Array.from(html.matchAll(/(?:src|href)="(\/[^\"]+)"/g), match => match[1].slice(1))]
for (const file of files) {
  const route = file === 'index.html' ? '/' : '/' + file.split(path.sep).map(encodeURIComponent).join('/')
  const body = await get(route)
  if (!body.equals(fs.readFileSync(path.join(root, file)))) throw new Error(`Resource differs: ${file}`)
}

// Verify the HTTP upgrade and Engine.IO opening frame through the same proxy.
await new Promise((resolve, reject) => {
  const key = randomBytes(16).toString('base64')
  const accept = createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64')
  let socket
  const timer = setTimeout(() => finish(new Error('WebSocket handshake timeout')), 10000)
  function finish(error) {
    clearTimeout(timer)
    socket?.destroy()
    req.destroy()
    if (error) reject(error)
    else resolve()
  }
  const req = transport.get(new URL('/socket.io/?EIO=4&transport=websocket', origin), {
    lookup,
    headers: { Connection: 'Upgrade', Upgrade: 'websocket', 'Sec-WebSocket-Key': key, 'Sec-WebSocket-Version': '13' },
  })
  req.on('error', finish)
  req.on('response', res => {
    res.resume()
    finish(new Error(`WebSocket upgrade: HTTP ${res.statusCode}`))
  })
  req.on('upgrade', (res, connection, head) => {
    socket = connection
    if (res.statusCode !== 101 || res.headers['sec-websocket-accept'] !== accept) {
      finish(new Error('Invalid WebSocket upgrade'))
      return
    }
    let buffer = Buffer.alloc(0)
    function consume(chunk) {
      buffer = Buffer.concat([buffer, chunk])
      if (buffer.length < 2) return
      let size = buffer[1] & 127
      let offset = 2
      if (size === 126) {
        if (buffer.length < 4) return
        size = buffer.readUInt16BE(2)
        offset = 4
      } else if (size === 127) {
        finish(new Error('Unexpected oversized WebSocket opening frame'))
        return
      }
      if (buffer.length < offset + size) return
      try {
        const payload = buffer.subarray(offset, offset + size).toString()
        if ((buffer[0] & 15) !== 1 || (buffer[1] & 128) || !payload.startsWith('0')) throw new Error('Invalid opening frame')
        if (!JSON.parse(payload.slice(1)).sid) throw new Error('Missing Engine.IO session')
        finish()
      } catch (error) {
        finish(error)
      }
    }
    socket.on('error', finish)
    socket.on('end', () => finish(new Error('WebSocket closed before opening frame')))
    socket.on('data', consume)
    if (head.length) consume(head)
  })
})
console.log(`${base}: health OK, ${files.length} resources matched, WebSocket OK`)
