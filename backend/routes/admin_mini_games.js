import express from 'express'
import pool from '../db.js'
import { verifyToken, requireManageGames } from '../middleware/auth.js'
import { ensureMiniGamesSettingsDefaults } from '../utils/miniGames.js'

const router = express.Router()

const mapRow = (row) => ({
    gameId: row.game_id,
    slug: row.slug,
    isActive: row.is_active === 1,
    displayOrder: row.display_order
})

router.get('/', verifyToken, requireManageGames, async (_req, res) => {
    try {
        await ensureMiniGamesSettingsDefaults()
        const [rows] = await pool.query(
            'SELECT game_id, slug, is_active, display_order FROM mini_game_settings ORDER BY display_order ASC, game_id ASC'
        )
        res.json(rows.map(mapRow))
    } catch (error) {
        console.error('Erreur récupération statuts mini-jeux (admin):', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

router.patch('/:slug', verifyToken, requireManageGames, async (req, res) => {
    try {
        const { slug } = req.params
        const { isActive, displayOrder } = req.body || {}

        if (typeof isActive !== 'boolean' && typeof displayOrder !== 'number') {
            return res.status(400).json({ message: 'Paramètres manquants' })
        }

        const fields = []
        const values = []

        if (typeof isActive === 'boolean') {
            fields.push('is_active = ?')
            values.push(isActive ? 1 : 0)
        }

        if (typeof displayOrder === 'number') {
            fields.push('display_order = ?')
            values.push(displayOrder)
        }

        values.push(slug)

        const [result] = await pool.query(
            `UPDATE mini_game_settings
             SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
             WHERE slug = ?`,
            values
        )

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Mini-jeu introuvable' })
        }

        const [rows] = await pool.query(
            'SELECT game_id, slug, is_active, display_order FROM mini_game_settings WHERE slug = ? LIMIT 1',
            [slug]
        )

        res.json(mapRow(rows[0]))
    } catch (error) {
        console.error('Erreur mise à jour mini-jeu:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

router.post('/reorder', verifyToken, requireManageGames, async (req, res) => {
    const { orders } = req.body || {}
    if (!Array.isArray(orders) || orders.length === 0) {
        return res.status(400).json({ message: 'Ordre invalide' })
    }

    const connection = await pool.getConnection()
    try {
        await connection.beginTransaction()
        for (const entry of orders) {
            if (!entry || typeof entry.slug !== 'string' || typeof entry.displayOrder !== 'number') {
                throw new Error('Entrée d\'ordre invalide')
            }
            await connection.query(
                `UPDATE mini_game_settings
                 SET display_order = ?, updated_at = CURRENT_TIMESTAMP
                 WHERE slug = ?`,
                [entry.displayOrder, entry.slug]
            )
        }
        await connection.commit()

        const [rows] = await connection.query(
            'SELECT game_id, slug, is_active, display_order FROM mini_game_settings ORDER BY display_order ASC, game_id ASC'
        )
        res.json(rows.map(mapRow))
    } catch (error) {
        await connection.rollback()
        console.error('Erreur réorganisation mini-jeux:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    } finally {
        connection.release()
    }
})

export default router
