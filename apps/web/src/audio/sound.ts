import type { GameEventType } from '@fortune/game'

let context: AudioContext | null = null

function audioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  context ??= new AudioContext()
  if (context.state === 'suspended') void context.resume()
  return context
}

function tone(frequency: number, duration: number, type: OscillatorType = 'sine', gain = 0.05): void {
  const ctx = audioContext()
  if (!ctx) return
  const oscillator = ctx.createOscillator()
  const volume = ctx.createGain()
  oscillator.type = type
  oscillator.frequency.setValueAtTime(frequency, ctx.currentTime)
  volume.gain.setValueAtTime(gain, ctx.currentTime)
  volume.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration)
  oscillator.connect(volume)
  volume.connect(ctx.destination)
  oscillator.start()
  oscillator.stop(ctx.currentTime + duration)
}

export function playEventSound(type: GameEventType, enabled: boolean): void {
  if (!enabled) return
  switch (type) {
    case 'DICE_ROLLED':
      tone(180, 0.08, 'square', 0.035)
      window.setTimeout(() => tone(240, 0.11, 'square', 0.03), 90)
      break
    case 'TOKEN_MOVED':
      tone(420, 0.05, 'triangle', 0.025)
      break
    case 'PROPERTY_PURCHASED':
      tone(520, 0.13, 'triangle')
      window.setTimeout(() => tone(760, 0.18, 'triangle'), 120)
      break
    case 'PROPERTY_UPGRADED':
      tone(300, 0.1, 'square', 0.035)
      window.setTimeout(() => tone(610, 0.2, 'triangle'), 100)
      break
    case 'RENT_PAID':
    case 'MONEY_CHANGED':
      tone(680, 0.08, 'sine', 0.035)
      break
    case 'CARD_DRAWN':
      tone(360, 0.16, 'triangle', 0.035)
      break
    case 'WHEEL_RESOLVED':
      tone(660, 0.2, 'triangle', 0.04)
      break
    case 'PLAYER_SENT_TO_JAIL':
      tone(130, 0.32, 'sawtooth', 0.04)
      break
    case 'PLAYER_BANKRUPT':
      tone(180, 0.5, 'sawtooth', 0.04)
      break
    case 'GAME_FINISHED':
      tone(520, 0.2, 'triangle')
      window.setTimeout(() => tone(660, 0.2, 'triangle'), 180)
      window.setTimeout(() => tone(820, 0.3, 'triangle'), 360)
      break
    default:
      break
  }
}

export function playWheelTick(enabled: boolean): void {
  if (enabled) tone(1100, 0.025, 'triangle', 0.025)
}
