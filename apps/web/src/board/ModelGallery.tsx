import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { MODEL_ASSETS } from './ModelAssets.js'
import { disposeScene } from './sceneUtils.js'
import { contactShadows } from './ContactShadows.js'

function ModelView({ model }: { model: (typeof MODEL_ASSETS)[number] }) {
  const host = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const container = host.current!
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true })
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.shadowMap.enabled = false
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05
    container.append(renderer.domElement)
    const scene = new THREE.Scene(), camera = new THREE.OrthographicCamera()
    const object = model.create(), bounds = new THREE.Box3().setFromObject(object)
    const size = bounds.getSize(new THREE.Vector3()), center = bounds.getCenter(new THREE.Vector3())
    object.position.sub(center); object.position.y -= bounds.min.y - center.y
    scene.add(object)
    scene.add(new THREE.HemisphereLight('#fffaf0', '#92ad9b', 2.1))
    const sun = new THREE.DirectionalLight('#fff0d8', 3)
    sun.position.set(-4, 8, 5); scene.add(sun)
    const grounding = contactShadows(scene, 3)
    if (model.id === 'hospital') {
      for (const [x, z] of [[0, 0], [-3.2, 0], [0, -3.2]]) grounding.add({ x: x! - center.x, y: -.004, z: z! - center.z, width: 3.5, depth: 3.5, opacity: .2, shape: 'rounded' })
    } else grounding.add({ x: 0, y: -.004, z: 0, width: size.x * 1.2, depth: size.z * 1.2, opacity: .23, shape: model.id === 'bomb' || model.id === 'roadblock' ? 'oval' : 'rounded' })
    const target = new THREE.Vector3(0, size.y * .4, 0)
    camera.position.set(Math.sin(model.angle) * 7, 5.1, Math.cos(model.angle) * 7).add(target)
    camera.near = .1; camera.far = 100
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.target.copy(target); controls.enablePan = false
    controls.minPolarAngle = .2; controls.maxPolarAngle = Math.PI * .48
    controls.minZoom = .65; controls.maxZoom = 2.4
    const draw = () => renderer.render(scene, camera)
    controls.addEventListener('change', draw)
    const resize = () => {
      const { clientWidth: width, clientHeight: height } = container
      if (!width || !height) return
      renderer.setSize(width, height, false)
      const aspect = width / height
      const span = Math.max(size.y + size.z * .55, Math.max(size.x, size.z) * 1.2 / aspect) * .63
      camera.left = -span * aspect; camera.right = span * aspect; camera.top = span; camera.bottom = -span
      camera.updateProjectionMatrix(); controls.update(); draw()
      container.dataset.ready = 'true'
    }
    const observer = new ResizeObserver(resize); observer.observe(container); resize()
    return () => {
      observer.disconnect(); controls.dispose(); disposeScene(scene); renderer.dispose(); renderer.domElement.remove()
    }
  }, [model])
  return <div className="model-gallery-canvas" ref={host} aria-label={`${model.title}，拖动可旋转，滚轮可缩放`} />
}

export default function ModelGallery() {
  return <main className="model-gallery"><header><a href="/">世界之旅</a><span>棋盘模型 · 44格地图扩展</span><h1>旅途中，又有了新的停靠点</h1><p>两处道具补给 · 开罗与香港 · 医院 · 路障与炸弹</p></header>
    <div className="model-gallery-grid">{MODEL_ASSETS.map((model) => <article key={model.id}>
      <ModelView model={model} /><div><h2>{model.title}</h2><p>{model.detail}</p><a href={`/assets/models/${model.id}.glb`} download>下载 GLB 模型</a></div>
    </article>)}</div><footer>拖动模型旋转 · 滚轮缩放 · 与游戏内共用模型</footer>
  </main>
}
