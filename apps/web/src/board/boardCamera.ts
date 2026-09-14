import * as THREE from 'three'
import type { CameraMode } from './boardSceneTypes.js'
import { BOARD_SIZE, TILE_SIZE, TILE_TOP, WORLD_SIZE, inwardAt } from './worldRoute.js'
export function cameraDestination(camera: THREE.PerspectiveCamera, cameraMode: CameraMode, viewZoom: number, compact: boolean, index: number, anchor: THREE.Vector3, desired: THREE.Vector3, desiredCamera: THREE.Vector3): void {
      if (cameraMode === 'overview') {
        desired.set(0, 0, 0)
        const distance = WORLD_SIZE * .6 / (Math.min(camera.aspect, 1) * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)))
        desiredCamera.set(0, distance * viewZoom, .001)
      } else {
        const targetIndex = index
        const inward = inwardAt(targetIndex)
        desired.copy(anchor).addScaledVector(inward, -TILE_SIZE * .55); desired.y = .8
        const distance = (compact ? 7.8 : 11.5) * viewZoom
        desiredCamera.copy(anchor).addScaledVector(inward, distance)
        desiredCamera.y = TILE_TOP + (compact ? 6.8 : 9.5) * viewZoom
        // Both end positions stay inside the board, so corner interpolation does too.
        const limit = BOARD_SIZE / 2 - TILE_SIZE
        desiredCamera.x = THREE.MathUtils.clamp(desiredCamera.x, -limit, limit)
        desiredCamera.z = THREE.MathUtils.clamp(desiredCamera.z, -limit, limit)
      }
}
