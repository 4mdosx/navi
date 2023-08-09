import { exec } from 'child_process'
import { promisify } from 'util'

export default async function (fastify, opts) {
  fastify.get('/x/address', async function (request, reply) {
    const { stdout, stderr } = await promisify(exec)('address')
    if (stderr) throw new Error(stderr)
    return { ip: stdout.trim() }
  })
}
