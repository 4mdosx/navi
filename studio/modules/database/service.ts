import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db = globalForPrisma.prisma ?? new PrismaClient({
  datasourceUrl: process.env.DB_FILE_NAME,
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
