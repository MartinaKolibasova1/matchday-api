export default async function refereesRoutes(app) {
  // GET /api/referees
  app.get('/', async () => {
    const { rows } = await app.pg.query(
      `SELECT
         r.id, r.name, r.nationality,
         rs.matches_officiated,
         ROUND(rs.yellow_cards::numeric     / NULLIF(rs.matches_officiated, 0), 2) AS yellow_cards_avg,
         ROUND(rs.red_cards::numeric        / NULLIF(rs.matches_officiated, 0), 2) AS red_cards_avg,
         ROUND(rs.yellow_red_cards::numeric / NULLIF(rs.matches_officiated, 0), 2) AS yellow_red_avg,
         ROUND(rs.penalties_awarded::numeric / NULLIF(rs.matches_officiated, 0), 2) AS penalties_avg
       FROM referees r
       LEFT JOIN referee_stats rs ON rs.referee_id = r.id
       ORDER BY r.name`
    )
    return rows
  })

  // GET /api/referees/:id
  app.get('/:id', async (req, reply) => {
    const { rows: refRows } = await app.pg.query(
      `SELECT
         r.id, r.name, r.nationality,
         rs.matches_officiated,
         ROUND(rs.yellow_cards::numeric     / NULLIF(rs.matches_officiated, 0), 2) AS yellow_cards_avg,
         ROUND(rs.red_cards::numeric        / NULLIF(rs.matches_officiated, 0), 2) AS red_cards_avg,
         ROUND(rs.yellow_red_cards::numeric / NULLIF(rs.matches_officiated, 0), 2) AS yellow_red_avg,
         ROUND(rs.penalties_awarded::numeric / NULLIF(rs.matches_officiated, 0), 2) AS penalties_avg
       FROM referees r
       LEFT JOIN referee_stats rs ON rs.referee_id = r.id
       WHERE r.id = $1`,
      [req.params.id]
    )
    if (!refRows.length) return reply.status(404).send({ error: 'Referee not found' })

    const { rows: recentMatches } = await app.pg.query(
      `SELECT
         m.id, m.utc_date, m.status, m.full_time_home, m.full_time_away,
         ht.name AS home_team, at.name AS away_team,
         c.name  AS competition
       FROM matches m
       JOIN teams ht        ON ht.id = m.home_team_id
       JOIN teams at        ON at.id = m.away_team_id
       JOIN seasons s       ON s.id  = m.season_id
       JOIN competitions c  ON c.id  = s.competition_id
       WHERE m.referee_id = $1 AND m.status = 'FINISHED'
       ORDER BY m.utc_date DESC
       LIMIT 10`,
      [req.params.id]
    )

    return { ...refRows[0], recent_matches: recentMatches }
  })
}
