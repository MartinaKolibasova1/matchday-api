import Fastify from 'fastify'
import cors from '@fastify/cors'
import pg from '@fastify/postgres'

import matchesRoutes      from './routes/matches.js'
import teamsRoutes        from './routes/teams.js'
import competitionsRoutes from './routes/competitions.js'
import refereesRoutes     from './routes/referees.js'

const app = Fastify({ logger: true })

await app.register(cors, {
  origin: process.env.FRONTEND_URL || '*',
})

await app.register(pg, {
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

await app.register(matchesRoutes,      { prefix: '/api/matches' })
await app.register(teamsRoutes,        { prefix: '/api/teams' })
await app.register(competitionsRoutes, { prefix: '/api/competitions' })
await app.register(refereesRoutes,     { prefix: '/api/referees' })

app.get('/health', async () => ({ status: 'ok' }))

const port = Number(process.env.PORT) || 3000
await app.listen({ port, host: '0.0.0.0' })
