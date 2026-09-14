import { Body, Box, ContactMaterial, GSSolver, Material, Plane, Vec3, World } from 'cannon-es'

export interface DicePose {
  position: [number, number, number]
  quaternion: [number, number, number, number]
}
export interface DiceFrame { dice: DicePose[] }

function* simulation(seed: string, count: 1 | 2): Generator<void, DiceFrame[]> {
  let state = 2166136261
  for (const character of seed) state = Math.imul(state ^ character.charCodeAt(0), 16777619)
  const random = () => {
    state ^= state << 13; state ^= state >>> 17; state ^= state << 5
    return (state >>> 0) / 4294967296
  }
  const world = new World({ gravity: new Vec3(0, -26, 0), allowSleep: true })
  const solver = new GSSolver(); solver.iterations = 18; world.solver = solver
  const dieMaterial = new Material('die'), tableMaterial = new Material('table')
  world.addContactMaterial(new ContactMaterial(dieMaterial, tableMaterial, { friction: .42, restitution: .32 }))
  world.addContactMaterial(new ContactMaterial(dieMaterial, dieMaterial, { friction: .3, restitution: .4 }))
  const ground = new Body({ mass: 0, material: tableMaterial, shape: new Plane() })
  ground.quaternion.setFromEuler(-Math.PI / 2, 0, 0); world.addBody(ground)
  for (const [x, z, hx, hz] of [[-3.45, 0, .15, 2.35], [3.45, 0, .15, 2.35], [0, -2.2, 3.6, .15], [0, 2.2, 3.6, .15]] as const) {
    world.addBody(new Body({ mass: 0, material: tableMaterial, shape: new Box(new Vec3(hx, 2.5, hz)), position: new Vec3(x, 2.5, z) }))
  }
  const dice = Array.from({ length: count }, (_, index) => {
    const side = index ? 1 : -1
    const body = new Body({ mass: 1, material: dieMaterial, shape: new Box(new Vec3(.6, .6, .6)), linearDamping: .35, angularDamping: .4, allowSleep: true, sleepSpeedLimit: .13, sleepTimeLimit: .18 })
    body.position.set(side * 2.25, 3.1 + index * .35, index ? .15 : -.25)
    body.velocity.set(-side * (5.5 + random()), -1.5, (random() - .5) * 2.5)
    body.angularVelocity.set(7 + random() * 6, side * (5 + random() * 5), side * (7 + random() * 7))
    body.quaternion.setFromEuler(random() * Math.PI, random() * Math.PI, random() * Math.PI)
    world.addBody(body)
    return body
  })
  const frames: DiceFrame[] = []
  const snapshot = () => frames.push({ dice: dice.map(body => ({ position: [body.position.x, body.position.y, body.position.z], quaternion: [body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w] })) })
  snapshot()
  // Simulate first, then orient the face numbering to the server's result. No final-pose snap.
  for (let step = 0; step < 600; step++) {
    world.step(1 / 120); snapshot()
    if (step > 180 && dice.every(body => body.sleepState === Body.SLEEPING)) break
    if (step % 24 === 23) yield
  }
  return frames
}

export function simulateDice(seed: string, count: 1 | 2 = 2): DiceFrame[] {
  const steps = simulation(seed, count)
  let result = steps.next()
  while (!result.done) result = steps.next()
  return result.value
}

export async function simulateDiceAsync(seed: string, count: 1 | 2 = 2): Promise<DiceFrame[]> {
  const steps = simulation(seed, count)
  let result = steps.next()
  while (!result.done) {
    await new Promise(resolve => setTimeout(resolve, 0))
    result = steps.next()
  }
  return result.value
}
