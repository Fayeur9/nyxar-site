import express from 'express'
import pool from '../db.js'
import { verifyToken, requireManageGames } from '../middleware/auth.js'

const router = express.Router()

// Supprimer le score d'un utilisateur pour un jeu spécifique
router.delete('/:game/:userId', verifyToken, requireManageGames, async (req, res) => {
    try {
        const { game, userId } = req.params
        if (!game || !userId) {
            return res.status(400).json({ message: 'Paramètres manquants' })
        }

        await pool.query('DELETE FROM scores WHERE game = ? AND user_id = ?', [game, userId])
        res.json({ success: true })
    } catch (error) {
        console.error('Erreur suppression score joueur:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// Reset tous les scores d'un jeu
router.delete('/:game', verifyToken, requireManageGames, async (req, res) => {
    try {
        const { game } = req.params
        if (!game) {
            return res.status(400).json({ message: 'Jeu requis' })
        }
        await pool.query('DELETE FROM scores WHERE game = ?', [game])
        res.json({ success: true })
    } catch (error) {
        console.error('Erreur reset scores jeu:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// Reset tous les scores (tous jeux)
router.delete('/', verifyToken, requireManageGames, async (_req, res) => {
    try {
        await pool.query('DELETE FROM scores')
        res.json({ success: true })
    } catch (error) {
        console.error('Erreur reset scores:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

export default router
