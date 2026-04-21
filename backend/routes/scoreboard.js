import express from 'express'
import pool from '../db.js'

const router = express.Router()
const lowerIsBetterGames = new Set()

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
