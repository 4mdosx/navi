import { z } from 'zod'
import { User } from '@/modules/database/schema'
export type Role = {
  admin?: boolean
  user?: boolean
}

export type createUserDto = Omit<User, 'id'>
