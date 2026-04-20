import express from 'express'
import pool from '../db.js'

const router = express.Router()
const lowerIsBetterGames = new Set()
const guessMapRewards = new Map([[1, 600], [2, 400], [3, 200]])

// Récupérer le classement pour un jeu donné (meilleurs scores)
router.get('/:game', async (req, res) => {
    try {
        const { game } = req.params
        const prefersLowerScore = lowerIsBetterGames.has(game)
        const aggregateFn = prefersLowerScore ? 'MIN' : 'MAX'
        const requestedOrder = req.query.order?.toLowerCase()
        const orderDirection = requestedOrder === 'asc'
            ? 'ASC'
            : requestedOrder === 'desc'
                ? 'DESC'
                : (prefersLowerScore ? 'ASC' : 'DESC')
        if (game === 'guess_map') {
            const [[latestChallenge]] = await pool.query(
                `SELECT id
                 FROM guess_map_challenges
                 WHERE challenge_date <= CURDATE()
                 ORDER BY challenge_date DESC, created_at DESC
                 LIMIT 1`
            )

            let attemptInfoMap = new Map()
            if (latestChallenge) {
                const [attemptRows] = await pool.query(
                    `SELECT user_id, COUNT(*) AS attempts, SUM(is_correct) AS win_count
                     FROM guess_map_attempts
                     WHERE challenge_id = ?
                     GROUP BY user_id
                     HAVING win_count > 0`,
                    [latestChallenge.id]
                )

                attemptInfoMap = new Map(attemptRows.map(row => {
                    const attempts = Number(row.attempts)
                    const reward = guessMapRewards.get(attempts) ?? 0
                    return [row.user_id, { attempts, latest_points: reward }]
                }))
            }

            const [rows] = await pool.query(
                `SELECT best.score, u.username, u.id AS user_id
                 FROM (
                    SELECT user_id, ${aggregateFn}(score) AS score
                    FROM scores
                    WHERE game = ? AND user_id IS NOT NULL
                    GROUP BY user_id
                 ) AS best
                 LEFT JOIN users u ON best.user_id = u.id
                 ORDER BY best.score ${orderDirection}, u.username ASC
                 LIMIT 100`,
                [game]
            )

            const enriched = rows.map((row) => {
                const attemptInfo = attemptInfoMap.get(row.user_id)
                return {
                    ...row,
                    attempts: attemptInfo?.attempts ?? null,
                    latest_points: attemptInfo?.latest_points ?? null
                }
            })
            res.json(enriched)
            return
        }

        const [rows] = await pool.query(
            `SELECT best.score, u.username, u.id AS user_id
             FROM (
                SELECT user_id, ${aggregateFn}(score) AS score
                FROM scores
                WHERE game = ? AND user_id IS NOT NULL
                GROUP BY user_id
             ) AS best
             LEFT JOIN users u ON best.user_id = u.id
             ORDER BY best.score ${orderDirection}, u.username ASC
             LIMIT 100`,
            [game]
        )
        res.json(rows)
    } catch (err) {
        console.error(err)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

export default router
