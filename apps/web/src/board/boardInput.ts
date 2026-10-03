import * as THREE from 'three'

/** Finds the board tile under a canvas point (CSS pixels), through batched and instanced meshes. */
export function tilePicker(canvas: HTMLCanvasElement, camera: THREE.Camera, objects: () => THREE.Object3D[]) {
  const raycaster = new THREE.Raycaster(),
    pointer = new THREE.Vector2()
  return (x: number, y: number): number | null => {
    pointer.set((x / canvas.clientWidth) * 2 - 1, (-y / canvas.clientHeight) * 2 + 1)
    raycaster.setFromCamera(pointer, camera)
    const hit = raycaster.intersectObjects(objects(), true)[0]
    if (!hit) return null
    const instanceId = hit.batchId ?? hit.instanceId
    let tileIndex =
      instanceId === undefined
        ? hit.object.userData.tileIndex
        : (hit.object.userData.tileIndices?.[instanceId] ?? hit.object.userData.tileIndex)
    const ranges = hit.object.userData.tileFaceRanges as { end: number; tileIndex: number }[] | undefined
    if (ranges && hit.faceIndex !== undefined && hit.faceIndex !== null) {
      let low = 0,
        high = ranges.length
      while (low < high) {
        const middle = (low + high) >>> 1
        if (hit.faceIndex < ranges[middle]!.end) high = middle
        else low = middle + 1
      }
      tileIndex = ranges[low]?.tileIndex
    }
    return Number.isInteger(tileIndex) ? tileIndex : null
  }
}
