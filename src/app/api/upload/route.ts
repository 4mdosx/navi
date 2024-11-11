'use server'
import { NextResponse } from 'next/server'
import { verifySessionInAPI } from '@/lib/dal'
import fs from 'fs/promises'
import path from 'path'

export async function POST(request: Request) {
  const { userId, isAuth } = await verifySessionInAPI()
  if (!isAuth) {
    return NextResponse.json({
      message: 'Unauthorized',
    }, { status: 401 })
  }

  const formData = await request.formData()
  const name = formData.get('name')
  const file = formData.get('file') as File
  if (!file) {
    return NextResponse.json({
      message: 'No file uploaded',
    }, { status: 400 })
  }

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  // create uploads folder if not exists
  const uploadsDir = path.join(process.cwd(), '/public/uploads', userId as string)
  if (!(await fs.access(uploadsDir).then(() => true).catch(() => false))) {
    await fs.mkdir(uploadsDir)
  }

  // @ts-ignore
  const filePath = path.join(uploadsDir, name || file.name as string)
  await fs.writeFile(filePath, buffer)

  return Response.json({ name })
}
