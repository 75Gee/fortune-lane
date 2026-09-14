import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js'
import { MODEL_ASSETS } from '../src/board/ModelAssets.js'
import { disposeScene } from '../src/board/sceneUtils.js'

// These geometry-only models need only FileReader's Blob conversion when exporting in Node.
class BlobReader {
  result: ArrayBuffer | string | null = null
  onloadend: (() => void) | null = null
  readAsArrayBuffer(blob: Blob) {
    void blob.arrayBuffer().then((buffer) => { this.result = buffer; this.onloadend?.() })
  }
  readAsDataURL(blob: Blob) {
    void blob.arrayBuffer().then((buffer) => {
      this.result = `data:${blob.type};base64,${Buffer.from(buffer).toString('base64')}`
      this.onloadend?.()
    })
  }
}
Object.defineProperty(globalThis, 'FileReader', { value: BlobReader, configurable: true })

const directory = new URL('../public/assets/models/', import.meta.url)
await mkdir(directory, { recursive: true })
const exporter = new GLTFExporter()
for (const asset of MODEL_ASSETS) {
  const model = asset.create()
  model.name = asset.title
  try {
    const data = await exporter.parseAsync(model, { binary: true, onlyVisible: true })
    if (!(data instanceof ArrayBuffer)) throw new Error(`Expected binary model: ${asset.id}`)
    const target = new URL(`${asset.id}.glb`, directory)
    await writeFile(target, Buffer.from(data))
    process.stdout.write(`${asset.title}: ${fileURLToPath(target)} (${Math.round(data.byteLength / 1024)} KB)\n`)
  } finally { disposeScene(model) }
}
