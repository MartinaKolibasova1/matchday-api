export default async function matchesRoutes(app) {
  // GET /api/matches?competition=&status=&dateFrom=&dateTo=&matchday=
  app.get('/', async (req, reply) => {
    const { competition, status, dateFrom, dateTo, matchday } = req.query

    const conditions = []
    const params = []

    if (competition) {
      params.push(competition)
      conditions.push(`c.code = $${params.length}`)
    }
    if (status) {
      params.push(status.toUpperCase())
      conditions.push(`m.status = $${params.length}`)
    }
    if (dateFrom) {
      params.push(dateFrom)
      conditions.push(`m.utc_date >= $${params.length}`)
    }
    if (dateTo) {
      params.push(dateTo)
      conditions.push(`m.utc_date <= $${params.length}`)
    }
    if (matchday) {
      params.push(Number(matchday))
      conditions.push(`m.matchday = $${params.length}`)
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const { rows } = await app.pg.query(
      `SELECT
         m.id,
         m.utc_date,
         m.status,
         m.matchday,
         m.stage,
         m.home_score,
         m.away_score,
         m.home_score_ht,
         m.away_score_ht,
         m.minute,
         json_build_object('id', ht.id, 'name', ht.name, 'short_name', ht.short_name, 'tla', ht.tla, 'crest_url', ht.crest_url) AS home_team,
         json_build_object('id', at.id, 'name', at.name, 'short_name', at.short_name, 'tla', at.tla, 'crest_url', at.crest_url) AS away_team,
         json_build_object('id', c.id, 'name', c.name, 'code', c.code, 'country', c.country, 'emblem_url', c.emblem_url) AS competition,
         json_build_object('id', s.id, 'start_date', s.start_date, 'end_date', s.end_date, 'current_matchday', s.current_matchday) AS season,
         json_build_object('id', r.id, 'name', r.name, 'nationality', r.nationality) AS referee
       FROM matches m
       JOIN teams ht         ON ht.id = m.home_team_id
       JOIN teams at         ON at.id = m.away_team_id
       JOIN competitions c   ON c.id  = m.competition_id
       JOIN seasons s        ON s.id  = m.season_id
       LEFT JOIN referees r  ON r.id  = m.referee_id
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
         m.*,
         json_build_object('id', ht.id, 'name', ht.name, 'short_name', ht.short_name, 'tla', ht.tla, 'crest_url', ht.crest_url) AS home_team,
         json_build_object('id', at.id, 'name', at.name, 'short_name', at.short_name, 'tla', at.tla, 'crest_url', at.crest_url) AS away_team,
         json_build_object('id', c.id, 'name', c.name, 'code', c.code, 'country', c.country, 'emblem_url', c.emblem_url) AS competition,
         json_build_object('id', s.id, 'start_date', s.start_date, 'end_date', s.end_date, 'current_matchday', s.current_matchday) AS season,
         json_build_object(
           'id', r.id, 'name', r.name, 'nationality', r.nationality,
           'stats', json_build_object(
             'yellow_cards_avg', ROUND(rs.yellow_cards::numeric / NULLIF(rs.matches_officiated, 0), 2),
             'red_cards_avg',    ROUND(rs.red_cards::numeric    / NULLIF(rs.matches_officiated, 0), 2),
             'penalties_avg',    ROUND(rs.penalties_awarded::numeric / NULLIF(rs.matches_officiated, 0), 2),
             'fouls_avg',        ROUND(rs.fouls_called::numeric / NULLIF(rs.matches_officiated, 0), 2),
             'matches_officiated', rs.matches_officiated
           )
         ) AS referee
       FROM matches m
       JOIN teams ht         ON ht.id = m.home_team_id
       JOIN teams at         ON at.id = m.away_team_id
       JOIN competitions c   ON c.id  = m.competition_id
       JOIN seasons s        ON s.id  = m.season_id
       LEFT JOIN referees r  ON r.id  = m.referee_id
       LEFT JOIN referee_stats rs ON rs.referee_id = r.id AND rs.season_id = m.season_id
       WHERE m.id = $1`,
      [req.params.id]
    )

    if (!rows.length) return reply.status(404).send({ error: 'Match not found' })
    return rows[0]
  })
}
