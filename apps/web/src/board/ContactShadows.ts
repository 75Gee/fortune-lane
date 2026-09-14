import * as THREE from 'three'

interface Footprint {
  x: number
  y: number
  z: number
  width: number
  depth: number
  opacity: number
  rotation?: number
  shape?: 'oval' | 'rounded'
}

/** Soft grounding marks, batched into one draw. No lights, textures or shadow passes. */
export function contactShadows(scene: THREE.Scene, capacity = 256) {
  const geometry = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2)
  const opacity = new THREE.InstancedBufferAttribute(new Float32Array(capacity), 1).setUsage(THREE.DynamicDrawUsage)
  const rounded = new THREE.InstancedBufferAttribute(new Float32Array(capacity), 1)
  geometry.setAttribute('contactOpacity', opacity); geometry.setAttribute('contactRounded', rounded)
  const material = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { ink: { value: new THREE.Color('#355345') } },
    vertexShader: `
      attribute float contactOpacity;
      attribute float contactRounded;
      varying vec2 contactUv;
      varying float strength;
      varying float cornerShape;
      void main() {
        contactUv = uv; strength = contactOpacity; cornerShape = contactRounded;
        gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 ink;
      varying vec2 contactUv;
      varying float strength;
      varying float cornerShape;
      void main() {
        vec2 p = abs(contactUv * 2.0 - 1.0);
        float oval = 1.0 - smoothstep(0.05, 1.0, length(p));
        float box = 1.0 - smoothstep(0.58, 1.0, length(max(p - 0.55, 0.0)) + 0.55);
        float alpha = mix(oval, box, cornerShape) * strength;
        if (alpha < 0.002) discard;
        gl_FragColor = vec4(ink, alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  })
  const mesh = new THREE.InstancedMesh(geometry, material, capacity)
  mesh.name = '柔和接地投影'; mesh.count = 0; mesh.frustumCulled = false
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  // Draw underneath transparent labels, never darkening their lettering.
  mesh.renderOrder = -1; scene.add(mesh)
  const transform = new THREE.Object3D(), free: number[] = []
  return {
    add(initial: Footprint) {
      const index = free.length ? free.pop()! : mesh.count
      if (index >= capacity) throw new Error('Contact shadow capacity exceeded')
      mesh.count = Math.max(mesh.count, index + 1)
      let removed = false
      const current = { rotation: 0, shape: 'oval' as const, ...initial }
      const write = () => {
        transform.position.set(current.x, current.y, current.z)
        transform.rotation.set(0, current.rotation, 0)
        transform.scale.set(current.width, 1, current.depth); transform.updateMatrix()
        mesh.setMatrixAt(index, transform.matrix); mesh.instanceMatrix.needsUpdate = true
        opacity.setX(index, current.opacity); opacity.needsUpdate = true
        rounded.setX(index, current.shape === 'rounded' ? 1 : 0); rounded.needsUpdate = true
      }
      write()
      return {
        set(next: Partial<Footprint>) {
          if (removed || !Object.entries(next).some(([key, value]) => current[key as keyof Footprint] !== value)) return
          Object.assign(current, next); write()
        },
        remove() { if (removed) return; removed = true; opacity.setX(index, 0); opacity.needsUpdate = true; free.push(index) },
      }
    },
  }
}

export type ContactShadows = ReturnType<typeof contactShadows>
