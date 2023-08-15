export default async function (fastify, opts) {
  fastify.post('/user', async function (request, reply) {
    const { username, password } = request.body
    const res = await fastify.user.createUser(username, password)
    return res
  })


  fastify.route({
    method: 'POST',
    url: '/user/login',
    preHandler: fastify.auth([
      fastify.verifyUserAndPassword
    ]),
    handler: (req, reply) => {
      return {
        ...req.user,
      }
    }
  })

  fastify.route({
    method: 'GET',
    url: '/user/me',
    preHandler: fastify.auth([
      fastify.verifyJWT
    ]),
    handler: (req, reply) => {
      return {
        user: req.user
      }
    }
  })

  fastify.get('/user/:id', async function (request, reply) {
    const res = await fastify.pg.query(
      'SELECT id, username, hash, salt FROM users WHERE id=$1',
      [request.params.id]
    )
    return res
  })
}
