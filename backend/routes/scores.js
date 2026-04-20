import express from 'express'
import pool from '../db.js'
import { verifyToken } from '../middleware/auth.js'

const router = express.Router()
const lowerIsBetterGames = new Set()

// Récupérer le meilleur score de l'utilisateur pour un jeu
router.get('/me/:game', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id
        const { game } = req.params
        if (!game) {
            return res.status(400).json({ message: 'Jeu requis' })
        }

        const [rows] = await pool.query(
            'SELECT score FROM scores WHERE user_id = ? AND game = ? LIMIT 1',
            [userId, game]
        )

        if (rows.length === 0) {
            return res.json({ score: 0 })
        }

        res.json({ score: Number(rows[0].score) })
    } catch (err) {
        console.error(err)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// Enregistrer ou mettre à jour le meilleur score d'un utilisateur pour un jeu
router.post('/', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id
        const { game, score } = req.body
        if (!game || typeof score !== 'number') {
            return res.status(400).json({ message: 'Paramètres manquants' })
        }
        // Vérifier s'il existe déjà un score pour cet utilisateur et ce jeu
        const [rows] = await pool.query(
            'SELECT * FROM scores WHERE user_id = ? AND game = ?',
            [userId, game]
        )
        const prefersLowerScore = lowerIsBetterGames.has(game)
        if (rows.length === 0) {
            // Pas encore de score, on insère
            await pool.query(
                'INSERT INTO scores (user_id, game, score) VALUES (?, ?, ?)',
                [userId, game, score]
            )
        } else if (
            (prefersLowerScore && score < rows[0].score) ||
            (!prefersLowerScore && score > rows[0].score)
        ) {
            // Nouveau meilleur score, on met à jour
            await pool.query(
                'UPDATE scores SET score = ?, created_at = CURRENT_TIMESTAMP WHERE id = ?',
                [score, rows[0].id]
            )
        }
        res.json({ success: true })
    } catch (err) {
        console.error(err)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

export default router
