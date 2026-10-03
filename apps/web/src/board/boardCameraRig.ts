import * as THREE from 'three'
import { TILE_SIZE, TILE_TOP, WORLD_SIZE } from './worldRoute.js'

/**
 * Map-style board camera. The view is fully described by where it looks on the ground, how far
 * away it sits and which way it faces; tilt follows distance (low and 3D up close, near top-down
 * when the whole world is in view), so no combination of inputs produces an awkward angle.
 *
 * The HUD covers parts of the canvas, so the lens is shifted (`setViewOffset`) to put the focus in
 * the middle of the uncovered area rather than the middle of the canvas.
 */

export interface ViewInsets {
  top: number
  right: number
  bottom: number
  left: number
}

interface View {
  x: number
  z: number
  distance: number
  yaw: number
}

const FOCUS_Y = 0.8
/** The followed view looks a little past the token, toward the landmark behind its tile. */
const FOLLOW_LEAD = 0.85
const MIN_DISTANCE = 9
const NEAR_PITCH = THREE.MathUtils.degToRad(34)
const FOLLOW_PITCH = THREE.MathUtils.degToRad(40)
const FAR_PITCH = THREE.MathUtils.degToRad(78)
/** Focus may wander a little past the world edge while dragging; it springs back on release. */
const BOUND = WORLD_SIZE / 2
const RUBBER = 0.3
const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), -TILE_TOP)

const smoothstep = (t: number) => t * t * (3 - 2 * t)
const shortestAngle = (from: number, to: number) => {
  const turn = Math.PI * 2
  return ((((to - from) % turn) + turn * 1.5) % turn) - Math.PI
}

export function boardCameraRig(camera: THREE.PerspectiveCamera) {
  const current: View = { x: 0, z: 0, distance: 30, yaw: 0 }
  const goal: View = { ...current }
  const velocity = new THREE.Vector2()
  const insets: ViewInsets = { top: 0, right: 0, bottom: 0, left: 0 },
    insetGoal: ViewInsets = { ...insets }
  const edges = Object.keys(insets) as (keyof ViewInsets)[]
  let width = 1,
    height = 1,
    virtualHeight = 1,
    following = true,
    zoomChosen = false,
    holding = false,
    settled = false
  const raycaster = new THREE.Raycaster(),
    ndc = new THREE.Vector2(),
    hit = new THREE.Vector3()

  const safe = () => ({
    width: Math.max(1, width - insets.left - insets.right),
    height: Math.max(1, height - insets.top - insets.bottom),
  })
  const tanHalf = () => Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
  /** Distance at which the whole world fits the uncovered area. */
  const fitDistance = () => {
    const area = safe()
    return (WORLD_SIZE * 1.05 * virtualHeight) / (2 * tanHalf() * Math.min(area.width, area.height))
  }
  const compact = () => width < 700
  const followDistance = () => (compact() ? 30 : 26)
  const maxDistance = () => Math.max(fitDistance() * 1.2, followDistance() * 1.5)
  const pitchAt = (distance: number) => {
    const follow = compact() ? 30 : 26
    if (distance <= follow)
      return THREE.MathUtils.lerp(
        NEAR_PITCH,
        FOLLOW_PITCH,
        THREE.MathUtils.clamp((distance - MIN_DISTANCE) / (follow - MIN_DISTANCE), 0, 1),
      )
    const t = THREE.MathUtils.clamp((distance - follow) / Math.max(1, fitDistance() - follow), 0, 1)
    return THREE.MathUtils.lerp(FOLLOW_PITCH, FAR_PITCH, smoothstep(t))
  }

  const place = (view: View) => {
    const pitch = pitchAt(view.distance)
    const flat = Math.cos(pitch) * view.distance
    camera.position.set(
      view.x + Math.sin(view.yaw) * flat,
      FOCUS_Y + Math.sin(pitch) * view.distance,
      view.z + Math.cos(view.yaw) * flat,
    )
    camera.lookAt(view.x, FOCUS_Y, view.z)
    // Millimetre-thin board details z-fight at overview distance unless near scales with it.
    const near = THREE.MathUtils.clamp(view.distance * 0.05, 0.1, 10)
    if (Math.abs(camera.near - near) > camera.near * 0.01) {
      camera.near = near
      camera.updateProjectionMatrix()
    }
    camera.updateMatrixWorld()
  }

  /** Where a canvas point (CSS pixels) lands on the board surface. */
  const groundAt = (px: number, py: number, out = hit) => {
    ndc.set((px / width) * 2 - 1, -(py / height) * 2 + 1)
    raycaster.setFromCamera(ndc, camera)
    return raycaster.ray.intersectPlane(ground, out)
  }

  /** Moves the view so that `anchor` (on the ground) sits under canvas point px/py. */
  const anchorTo = (anchor: THREE.Vector3, px: number, py: number, resist: boolean) => {
    place(current)
    const under = groundAt(px, py)
    if (!under) return
    let dx = anchor.x - under.x,
      dz = anchor.z - under.z
    if (resist) {
      if ((current.x > BOUND && dx > 0) || (current.x < -BOUND && dx < 0)) dx *= RUBBER
      if ((current.z > BOUND && dz > 0) || (current.z < -BOUND && dz < 0)) dz *= RUBBER
    }
    current.x += dx
    current.z += dz
    goal.x = current.x
    goal.z = current.z
    place(current)
  }

  const clampDistance = (distance: number) => THREE.MathUtils.clamp(distance, MIN_DISTANCE, maxDistance())

  const release = () => {
    following = false
    settled = false
  }

  const applyLens = () => {
    const area = safe()
    const centreX = insets.left + area.width / 2,
      centreY = insets.top + area.height / 2
    const dx = centreX - width / 2,
      dy = centreY - height / 2
    const virtualWidth = width + 2 * Math.abs(dx)
    virtualHeight = height + 2 * Math.abs(dy)
    camera.aspect = virtualWidth / virtualHeight
    camera.setViewOffset(
      virtualWidth,
      virtualHeight,
      virtualWidth / 2 - centreX,
      virtualHeight / 2 - centreY,
      width,
      height,
    )
    camera.updateProjectionMatrix()
  }

  return {
    get following() {
      return following
    },
    /** Canvas size changed. */
    resize(w: number, h: number) {
      width = w
      height = h
      applyLens()
      settled = false
    },
    /** HUD coverage changed; the lens glides to the new centre unless `snap`. */
    setInsets(next: ViewInsets, snap: boolean) {
      Object.assign(insetGoal, next)
      if (snap) {
        Object.assign(insets, next)
        applyLens()
      }
      settled = false
    },
    /** Height of the full lens frame, for sizing screen-constant sprites. */
    get lensHeight() {
      return virtualHeight
    },
    /** The board view a following camera wants for this anchor and facing. */
    follow(anchor: THREE.Vector3, inward: THREE.Vector3, snap: boolean) {
      if (!following) return
      goal.x = anchor.x - inward.x * TILE_SIZE * FOLLOW_LEAD
      goal.z = anchor.z - inward.z * TILE_SIZE * FOLLOW_LEAD
      goal.yaw = current.yaw + shortestAngle(current.yaw, Math.atan2(inward.x, inward.z))
      // Zoom is the player's own: following only pans and turns. The default applies until they first zoom.
      if (!zoomChosen) goal.distance = followDistance()
      if (snap) Object.assign(current, goal)
    },
    startFollowing() {
      following = true
      settled = false
      velocity.set(0, 0)
    },
    overview() {
      release()
      velocity.set(0, 0)
      goal.x = 0
      goal.z = 0
      goal.distance = fitDistance()
      zoomChosen = true
      // Square the board to the screen so the whole loop reads at a glance.
      goal.yaw = Math.round(current.yaw / (Math.PI / 2)) * (Math.PI / 2)
    },
    /** Quarter turn around the current focus. */
    rotate(direction: 1 | -1) {
      release()
      velocity.set(0, 0)
      goal.yaw = Math.round(goal.yaw / (Math.PI / 2)) * (Math.PI / 2) + (direction * Math.PI) / 2
    },
    /** Button zoom: keeps following if it was, and centres on the focus. */
    zoomBy(factor: number) {
      settled = false
      zoomChosen = true
      goal.distance = clampDistance(goal.distance * factor)
    },

    // ---- direct manipulation: state moves with the fingers, no easing ----
    grab() {
      holding = true
      velocity.set(0, 0)
      release()
      Object.assign(goal, current)
    },
    groundAt(px: number, py: number) {
      place(current)
      return groundAt(px, py, new THREE.Vector3())
    },
    drag(anchor: THREE.Vector3, px: number, py: number) {
      const beforeX = current.x,
        beforeZ = current.z
      anchorTo(anchor, px, py, true)
      return { dx: current.x - beforeX, dz: current.z - beforeZ }
    },
    /** Zoom so the ground under (px, py) stays put. */
    zoomAt(distance: number, anchor: THREE.Vector3, px: number, py: number) {
      zoomChosen = true
      current.distance = goal.distance = clampDistance(distance)
      anchorTo(anchor, px, py, false)
    },
    get distance() {
      return current.distance
    },
    get gliding() {
      return velocity.lengthSq() > 0
    },
    /** Finger lifted: keep gliding at the last drag speed (world units per second). */
    fling(vx: number, vz: number) {
      holding = false
      const speed = Math.hypot(vx, vz)
      if (speed > 2) velocity.set(vx, vz).multiplyScalar(Math.min(1, 60 / speed))
      settled = false
    },
    letGo() {
      holding = false
      settled = false
    },

    /** Advances easing, glide and edge spring; returns true while still moving. */
    step(dt: number, instant: boolean) {
      let lensMoving = false
      if (edges.some((edge) => insets[edge] !== insetGoal[edge])) {
        const ease = instant ? 1 : 1 - Math.exp(-9 * dt)
        for (const edge of edges) {
          insets[edge] += (insetGoal[edge] - insets[edge]) * ease
          if (Math.abs(insetGoal[edge] - insets[edge]) < 0.5) insets[edge] = insetGoal[edge]
          else lensMoving = true
        }
        applyLens()
        settled = false
      }
      if (holding) {
        place(current)
        return false
      }
      if (!following) {
        if (velocity.lengthSq() > 0) {
          goal.x += velocity.x * dt
          goal.z += velocity.y * dt
          current.x = goal.x
          current.z = goal.z
          // A glide that reaches the edge stops there and the spring below eases it back.
          if (Math.abs(goal.x) > BOUND) velocity.x = 0
          if (Math.abs(goal.z) > BOUND) velocity.y = 0
          velocity.multiplyScalar(Math.exp(-4.5 * dt))
          if (velocity.lengthSq() < 0.04) velocity.set(0, 0)
        }
        goal.x = THREE.MathUtils.clamp(goal.x, -BOUND, BOUND)
        goal.z = THREE.MathUtils.clamp(goal.z, -BOUND, BOUND)
        goal.distance = clampDistance(goal.distance)
      }
      const easing = instant ? 1 : 1 - Math.exp(-(following ? 6.5 : 7) * dt)
      current.x += (goal.x - current.x) * easing
      current.z += (goal.z - current.z) * easing
      current.distance += (goal.distance - current.distance) * easing
      current.yaw += shortestAngle(current.yaw, goal.yaw) * easing
      const moving =
        lensMoving ||
        velocity.lengthSq() > 0 ||
        Math.abs(goal.x - current.x) > 0.005 ||
        Math.abs(goal.z - current.z) > 0.005 ||
        Math.abs(goal.distance - current.distance) > 0.005 ||
        Math.abs(shortestAngle(current.yaw, goal.yaw)) > 0.0005
      if (!moving) Object.assign(current, goal)
      if (!moving && settled) return false
      settled = !moving
      place(current)
      return moving
    },
  }
}
export type BoardCameraRig = ReturnType<typeof boardCameraRig>
