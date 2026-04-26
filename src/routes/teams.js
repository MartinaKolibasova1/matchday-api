export default async function teamsRoutes(app) {
  // GET /api/teams?competition=
  app.get('/', async (req) => {
    const { competition } = req.query
    const params = []
    let join = ''
    let where = ''

    if (competition) {
      params.push(competition.toUpperCase())
      join  = `JOIN matches m ON (m.home_team_id = t.id OR m.away_team_id = t.id)
               JOIN seasons s ON s.id = m.season_id
               JOIN competitions c ON c.id = s.competition_id`
      where = `WHERE c.code = $1`
    }

    const { rows } = await app.pg.query(
      `SELECT DISTINCT t.id, t.name, t.short_name, t.tla, t.crest_url
       FROM teams t
       ${join}
       ${where}
       ORDER BY t.name`,
      params
    )
    return rows
  })

  // GET /api/teams/:id
  app.get('/:id', async (req, reply) => {
    const { rows } = await app.pg.query(
      `SELECT id, name, short_name, tla, crest_url FROM teams WHERE id = $1`,
      [req.params.id]
    )
    if (!rows.length) return reply.status(404).send({ error: 'Team not found' })
    return rows[0]
  })
}
