import * as THREE from 'three'
export function bindBoardInput(container: HTMLElement, canvas: HTMLCanvasElement, camera: THREE.Camera, objects: () => THREE.Object3D[], onSelectTile: (index: number) => void): () => void {
    const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2()
    let downX = 0, downY = 0, downId = -1
    const down = (event: PointerEvent) => { if (!event.isPrimary) { downId = -1; return }; downId = event.pointerId; downX = event.clientX; downY = event.clientY }
    const up = (event: PointerEvent) => {
      if (event.pointerId !== downId || Math.hypot(event.clientX - downX, event.clientY - downY) > 6) return
      downId = -1
      const rect = container.getBoundingClientRect()
      pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1)
      raycaster.setFromCamera(pointer, camera)
      const hit = raycaster.intersectObjects(objects(), true)[0]
      if (hit && Number.isInteger(hit.object.userData.tileIndex)) onSelectTile(hit.object.userData.tileIndex)
    }
    const cancel = () => { downId = -1 }
    canvas.addEventListener('pointerdown', down); canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', cancel)
  return () => { canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointerup', up); canvas.removeEventListener('pointercancel', cancel) }
}
