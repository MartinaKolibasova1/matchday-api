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
  options: '-c search_path=public',
})

await app.register(matchesRoutes,      { prefix: '/api/matches' })
await app.register(teamsRoutes,        { prefix: '/api/teams' })
await app.register(competitionsRoutes, { prefix: '/api/competitions' })
await app.register(refereesRoutes,     { prefix: '/api/referees' })

app.get('/health', async () => ({ status: 'ok' }))

app.get('/debug/tables', async () => {
  const { rows } = await app.pg.query(`
    SELECT table_schema, table_name
    FROM information_schema.tables
    WHERE table_type = 'BASE TABLE'
      AND table_schema NOT IN ('pg_catalog', 'information_schema')
    ORDER BY table_schema, table_name
  `)
  return rows
})

app.get('/debug/columns/:table', async (req) => {
  const { rows } = await app.pg.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = $1
    ORDER BY ordinal_position
  `, [req.params.table])
  return rows
})

app.get('/debug/sample', async () => {
  const { rows } = await app.pg.query(`
    SELECT m.id, m.status, m.utc_date, m.season_id, m.home_team_id, m.away_team_id
    FROM matches m
    LIMIT 3
  `)
  return rows
})

app.get('/debug/joins', async () => {
  const { rows } = await app.pg.query(`
    SELECT
      m.id AS match_id,
      m.season_id,
      s.id AS season_found,
      s.competition_id,
      c.id AS competition_found,
      c.name AS competition_name,
      ht.id AS home_team_found,
      at.id AS away_team_found
    FROM matches m
    LEFT JOIN seasons s      ON s.id  = m.season_id
    LEFT JOIN competitions c ON c.id  = s.competition_id
    LEFT JOIN teams ht       ON ht.id = m.home_team_id
    LEFT JOIN teams at       ON at.id = m.away_team_id
    LIMIT 3
  `)
  return rows
})

const port = Number(process.env.PORT) || 3000
await app.listen({ port, host: '0.0.0.0' })
