import express from 'express'
import pool from '../db.js'
import { ensureMiniGamesSettingsDefaults } from '../utils/miniGames.js'

const router = express.Router()

const mapRow = (row) => ({
    gameId: row.game_id,
    slug: row.slug,
    isActive: row.is_active === 1,
    displayOrder: row.display_order
})

router.get('/settings', async (_req, res) => {
    try {
        await ensureMiniGamesSettingsDefaults()
        const [rows] = await pool.query(
            'SELECT game_id, slug, is_active, display_order FROM mini_game_settings ORDER BY display_order ASC, game_id ASC'
        )
        res.json(rows.map(mapRow))
    } catch (error) {
        console.error('Erreur récupération statuts mini-jeux:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

export default router
