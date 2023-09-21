import { exec } from 'child_process'
import { promisify } from 'util'
import { upload } from '../plugins/multer.mjs'

export default async function (fastify, opts) {
  fastify.get('/x/address', async function (request, reply) {
    const { stdout, stderr } = await promisify(exec)('address')
    if (stderr) throw new Error(stderr)
    return { ip: stdout.trim() }
  })

  fastify.post(
    '/x/upload',
    { preHandler: upload.single('file') },
    function(request, reply) {
      // request.file is the `file` file
      // request.body will hold the text fields, if there were any
      reply.code(200).send('SUCCESS')
    }
  )
}
