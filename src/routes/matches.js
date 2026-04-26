export default async function matchesRoutes(app) {
  // GET /api/matches?competition=&status=&matchday=&dateFrom=&dateTo=
  app.get('/', async (req) => {
    const { competition, status, matchday, dateFrom, dateTo } = req.query

    const conditions = []
    const params = []

    if (competition) {
      params.push(competition.toUpperCase())
      conditions.push(`c.code = $${params.length}`)
    }
    if (status) {
      params.push(status.toUpperCase())
      conditions.push(`m.status = $${params.length}`)
    }
    if (matchday) {
      params.push(Number(matchday))
      conditions.push(`m.matchday = $${params.length}`)
    }
    if (dateFrom) {
      params.push(dateFrom)
      conditions.push(`m.utc_date >= $${params.length}`)
    }
    if (dateTo) {
      params.push(dateTo)
      conditions.push(`m.utc_date <= $${params.length}`)
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const { rows } = await app.pg.query(
      `SELECT
         m.id,
         m.utc_date,
         m.status,
         m.matchday,
         m.stage,
         m.winner,
         m.duration,
         m.full_time_home,
         m.full_time_away,
         m.half_time_home,
         m.half_time_away,
         json_build_object('id', ht.id, 'name', ht.name, 'short_name', ht.short_name, 'tla', ht.tla, 'crest_url', ht.crest_url) AS home_team,
         json_build_object('id', at.id, 'name', at.name, 'short_name', at.short_name, 'tla', at.tla, 'crest_url', at.crest_url) AS away_team,
         json_build_object('id', c.id, 'name', c.name, 'code', c.code, 'emblem_url', c.emblem_url) AS competition,
         json_build_object('id', s.id, 'current_matchday', s.current_matchday, 'start_date', s.start_date, 'end_date', s.end_date) AS season,
         json_build_object('id', r.id, 'name', r.name, 'nationality', r.nationality) AS referee
       FROM matches m
       JOIN seasons s       ON s.id  = m.season_id
       JOIN competitions c  ON c.id  = s.competition_id
       JOIN teams ht        ON ht.id = m.home_team_id
       JOIN teams at        ON at.id = m.away_team_id
       LEFT JOIN referees r ON r.id  = m.referee_id
       ${where}
       ORDER BY m.utc_date ASC`,
      params
    )

    return rows
  })

  // GET /api/matches/:id
  app.get('/:id', async (req, reply) => {
    const { rows } = await app.pg.query(
      `SELECT
         m.id,
         m.utc_date,
         m.status,
         m.matchday,
         m.stage,
         m.winner,
         m.duration,
         m.full_time_home,
         m.full_time_away,
         m.half_time_home,
         m.half_time_away,
         json_build_object('id', ht.id, 'name', ht.name, 'short_name', ht.short_name, 'tla', ht.tla, 'crest_url', ht.crest_url) AS home_team,
         json_build_object('id', at.id, 'name', at.name, 'short_name', at.short_name, 'tla', at.tla, 'crest_url', at.crest_url) AS away_team,
         json_build_object('id', c.id, 'name', c.name, 'code', c.code, 'emblem_url', c.emblem_url) AS competition,
         json_build_object('id', s.id, 'current_matchday', s.current_matchday) AS season,
         json_build_object(
           'id', r.id, 'name', r.name, 'nationality', r.nationality,
           'stats', json_build_object(
             'matches_officiated', rs.matches_officiated,
             'yellow_cards_avg',   ROUND(rs.yellow_cards::numeric     / NULLIF(rs.matches_officiated, 0), 2),
             'red_cards_avg',      ROUND(rs.red_cards::numeric        / NULLIF(rs.matches_officiated, 0), 2),
             'yellow_red_avg',     ROUND(rs.yellow_red_cards::numeric / NULLIF(rs.matches_officiated, 0), 2),
             'penalties_avg',      ROUND(rs.penalties_awarded::numeric / NULLIF(rs.matches_officiated, 0), 2)
           )
         ) AS referee
       FROM matches m
       JOIN seasons s        ON s.id  = m.season_id
       JOIN competitions c   ON c.id  = s.competition_id
       JOIN teams ht         ON ht.id = m.home_team_id
       JOIN teams at         ON at.id = m.away_team_id
       LEFT JOIN referees r  ON r.id  = m.referee_id
       LEFT JOIN referee_stats rs ON rs.referee_id = r.id
       WHERE m.id = $1`,
      [req.params.id]
    )

    if (!rows.length) return reply.status(404).send({ error: 'Match not found' })
    return rows[0]
  })
}
