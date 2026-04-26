export default async function competitionsRoutes(app) {
  // GET /api/competitions
  app.get('/', async () => {
    const { rows } = await app.pg.query(
      `SELECT c.*, s.id AS current_season_id, s.current_matchday, s.start_date, s.end_date
       FROM competitions c
       LEFT JOIN seasons s ON s.competition_id = c.id
         AND s.start_date <= CURRENT_DATE
         AND s.end_date   >= CURRENT_DATE
       ORDER BY c.name`
    )
    return rows
  })

  // GET /api/competitions/:id/standings (win/draw/loss aggregated from matches)
  app.get('/:id/standings', async (req) => {
    const { rows } = await app.pg.query(
      `WITH match_results AS (
         SELECT
           m.home_team_id AS team_id,
           CASE WHEN m.home_score > m.away_score THEN 3
                WHEN m.home_score = m.away_score THEN 1 ELSE 0 END AS pts,
           CASE WHEN m.home_score > m.away_score THEN 1 ELSE 0 END AS won,
           CASE WHEN m.home_score = m.away_score THEN 1 ELSE 0 END AS drawn,
           CASE WHEN m.home_score < m.away_score THEN 1 ELSE 0 END AS lost,
           m.home_score AS gf, m.away_score AS ga
         FROM matches m
         JOIN seasons s ON s.id = m.season_id
         WHERE s.competition_id = $1 AND m.status = 'FINISHED'
         UNION ALL
         SELECT
           m.away_team_id,
           CASE WHEN m.away_score > m.home_score THEN 3
                WHEN m.away_score = m.home_score THEN 1 ELSE 0 END,
           CASE WHEN m.away_score > m.home_score THEN 1 ELSE 0 END,
           CASE WHEN m.away_score = m.home_score THEN 1 ELSE 0 END,
           CASE WHEN m.away_score < m.home_score THEN 1 ELSE 0 END,
           m.away_score, m.home_score
         FROM matches m
         JOIN seasons s ON s.id = m.season_id
         WHERE s.competition_id = $1 AND m.status = 'FINISHED'
       )
       SELECT
         ROW_NUMBER() OVER (ORDER BY SUM(pts) DESC, SUM(gf - ga) DESC, SUM(gf) DESC) AS position,
         t.id, t.name, t.short_name, t.tla, t.crest_url,
         COUNT(*)::int     AS played,
         SUM(won)::int     AS won,
         SUM(drawn)::int   AS drawn,
         SUM(lost)::int    AS lost,
         SUM(gf)::int      AS goals_for,
         SUM(ga)::int      AS goals_against,
         (SUM(gf) - SUM(ga))::int AS goal_diff,
         SUM(pts)::int     AS points
       FROM match_results mr
       JOIN teams t ON t.id = mr.team_id
       GROUP BY t.id, t.name, t.short_name, t.tla, t.crest_url
       ORDER BY points DESC, goal_diff DESC, goals_for DESC`,
      [req.params.id]
    )
    return rows
  })
}
