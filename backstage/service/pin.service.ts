import 'server-only'
import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { deleteSetting, getSetting, setSetting } from '../model/settings.model'

const scrypt = promisify(scryptCallback)
const KEY_LENGTH = 32

export const PIN_HASH_KEY = 'pin.hash'
export const PIN_EPOCH_KEY = 'pin.epoch'
export const PIN_UPDATED_AT_KEY = 'pin.updatedAt'

export type PinStatus = {
  configured: boolean
  updatedAt: string | null
}

export async function isPinConfigured(): Promise<boolean> {
  const hash = await getSetting(PIN_HASH_KEY)
  return Boolean(hash)
}

export async function getPinEpoch(): Promise<string | null> {
  return getSetting(PIN_EPOCH_KEY)
}

export async function getPinStatus(): Promise<PinStatus> {
  const [hash, updatedAt] = await Promise.all([
    getSetting(PIN_HASH_KEY),
    getSetting(PIN_UPDATED_AT_KEY),
  ])
  return {
    configured: Boolean(hash),
    updatedAt,
  }
}

export async function savePin(pin: string): Promise<string> {
  const hash = await hashPin(pin)
  const epoch = randomUUID()
  const updatedAt = new Date().toISOString()
  await setSetting(PIN_HASH_KEY, hash)
  await setSetting(PIN_EPOCH_KEY, epoch)
  await setSetting(PIN_UPDATED_AT_KEY, updatedAt)
  return epoch
}

export async function verifyStoredPin(pin: string): Promise<boolean> {
  const stored = await getSetting(PIN_HASH_KEY)
  if (!stored) return false
  return pinMatches(pin, stored)
}

export async function clearStoredPin(): Promise<void> {
  await deleteSetting(PIN_HASH_KEY)
  await deleteSetting(PIN_EPOCH_KEY)
  await deleteSetting(PIN_UPDATED_AT_KEY)
}

async function hashPin(pin: string): Promise<string> {
  const salt = randomBytes(16)
  const derived = (await scrypt(pin, salt, KEY_LENGTH)) as Buffer
  return `scrypt$${salt.toString('hex')}$${derived.toString('hex')}`
}

async function pinMatches(pin: string, stored: string): Promise<boolean> {
  const [scheme, saltHex, hashHex] = stored.split('$')
  if (scheme !== 'scrypt' || !saltHex || !hashHex) return false
  const salt = Buffer.from(saltHex, 'hex')
  const expected = Buffer.from(hashHex, 'hex')
  const derived = (await scrypt(pin, salt, expected.length)) as Buffer
  if (derived.length !== expected.length) return false
  return timingSafeEqual(derived, expected)
}
