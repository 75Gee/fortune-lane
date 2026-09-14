import * as THREE from 'three'

/** A small local puff, with no camera shake or full-screen flash. */
export function bombExplosion() {
  const group = new THREE.Group(); group.visible = false
  const flashMaterial = new THREE.MeshBasicMaterial({ color: '#efbd66', transparent: true, opacity: 0, depthWrite: false })
  const flash = new THREE.Mesh(new THREE.IcosahedronGeometry(.3, 1), flashMaterial)
  flash.position.y = .46; group.add(flash)
  const ringMaterial = new THREE.MeshBasicMaterial({ color: '#d99d5b', transparent: true, opacity: 0, depthWrite: false })
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.62, .035, 6, 32), ringMaterial)
  ring.rotation.x = -Math.PI / 2; ring.position.y = .025; group.add(ring)
  const sparkGeometry = new THREE.OctahedronGeometry(.075)
  const sparkMaterial = new THREE.MeshBasicMaterial({ color: '#e8a24f', transparent: true, opacity: 0, depthWrite: false })
  const sparks = Array.from({ length: 10 }, () => { const mesh = new THREE.Mesh(sparkGeometry, sparkMaterial); group.add(mesh); return mesh })
  const smokeGeometry = new THREE.IcosahedronGeometry(.18, 1)
  const smokeMaterial = new THREE.MeshBasicMaterial({ color: '#a7aaa0', transparent: true, opacity: 0, depthWrite: false })
  const smoke = Array.from({ length: 7 }, () => { const mesh = new THREE.Mesh(smokeGeometry, smokeMaterial); group.add(mesh); return mesh })
  return {
    group,
    update(progress: number, reduced: boolean) {
      group.visible = progress >= 0 && progress < 1
      if (!group.visible) return
      flash.visible = !reduced; sparks.forEach((mesh) => { mesh.visible = !reduced }); smoke.forEach((mesh) => { mesh.visible = !reduced })
      ring.scale.setScalar(reduced ? 1.25 : .3 + 1.65 * progress)
      ringMaterial.opacity = reduced ? .35 : .55 * (1 - progress)
      if (reduced) return
      flash.scale.setScalar(.7 + Math.min(progress * 8, 1.5))
      flashMaterial.opacity = .5 * Math.max(0, 1 - progress / .28)
      sparkMaterial.opacity = .85 * Math.max(0, 1 - progress / .65)
      sparks.forEach((mesh, i) => {
        const angle = i / sparks.length * Math.PI * 2, distance = (.65 + (i % 3) * .16) * Math.sin(progress * Math.PI / 2)
        mesh.position.set(Math.sin(angle) * distance, .3 + progress * (1.2 + i % 2 * .25) - progress * progress, Math.cos(angle) * distance)
        mesh.rotation.set(progress * 4 + i, progress * 3, i)
      })
      const puff = Math.max(0, (progress - .08) / .92)
      smokeMaterial.opacity = .32 * Math.sin(puff * Math.PI)
      smoke.forEach((mesh, i) => {
        const angle = i / smoke.length * Math.PI * 2, distance = .15 + puff * .43
        mesh.position.set(Math.sin(angle) * distance, .3 + puff * (.65 + i % 3 * .12), Math.cos(angle) * distance)
        mesh.scale.setScalar(.5 + puff * 1.6)
      })
    },
  }
}
