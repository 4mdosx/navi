'use server'
import 'server-only'
import { db } from '@/modules/database/service'
import { verifySessionGuard } from '@/modules/auth/service'

export async function getKv(key: string) {
  await verifySessionGuard()

  const kv = await db.kvTable.findUnique({
    where: { key },
  })
  return kv
}

export async function createKv(key: string, value: string) {
  await db.kvTable.create({
    data: { key, value },
  })
}

export async function updateKv(key: string, value: string) {
  await verifySessionGuard()

  const kv = await getKv(key)
  if (kv) {
    await db.kvTable.update({
      where: { key },
      data: { value },
    })
  } else {
    await createKv(key, value)
  }
}
