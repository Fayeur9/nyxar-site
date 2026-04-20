import express from 'express'
import pool from '../db.js'
import { verifyToken, requireManageGames } from '../middleware/auth.js'

const router = express.Router()

// Middlewares importés

// GET tous les nyxariens avec leurs postes
router.get('/', async (req, res) => {
    try {
        const [nyxariens] = await pool.query(`
            SELECT DISTINCT
                n.id,
                n.pseudo,
                n.first_name,
                n.last_name,
                n.image_url,
                n.image_url_hover,
                n.birth_date,
                n.catch_phrase
            FROM nyxariens n
            WHERE n.is_deleted = 0
            ORDER BY n.pseudo
        `)

        // Récupérer les postes pour chaque nyxarien
        for (let i = 0; i < nyxariens.length; i++) {
            const [postes] = await pool.query(`
                SELECT p.id, p.name, p.description, p.color
                FROM poste p
                JOIN poste_nyxarien pn ON p.id = pn.poste_id
                WHERE pn.nyxarien_id = ? AND pn.is_deleted = 0 AND p.is_deleted = 0
            `, [nyxariens[i].id])

            nyxariens[i].postes = postes
        }

        res.json(nyxariens)
    } catch (error) {
        console.error('Erreur récupération nyxariens:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// GET un nyxarien avec ses postes
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params

        const [nyxarien] = await pool.query(`
            SELECT *
            FROM nyxariens
            WHERE id = ? AND is_deleted = 0
        `, [id])

        if (nyxarien.length === 0) {
            return res.status(404).json({ message: 'Nyxarien non trouvé' })
        }

        const [postes] = await pool.query(`
            SELECT p.id, p.name, p.description, p.color
            FROM poste p
            JOIN poste_nyxarien pn ON p.id = pn.poste_id
            WHERE pn.nyxarien_id = ? AND pn.is_deleted = 0 AND p.is_deleted = 0
        `, [id])

        res.json({
            ...nyxarien[0],
            postes
        })
    } catch (error) {
        console.error('Erreur récupération nyxarien:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// GET les nyxariens par poste
router.get('/poste/:posteName', async (req, res) => {
    try {
        const { posteName } = req.params

        const [poste] = await pool.query(`
            SELECT id FROM poste
            WHERE name = ? AND is_deleted = 0
        `, [posteName])

        if (poste.length === 0) {
            return res.status(404).json({ message: 'Poste non trouvé' })
        }

        const [nyxariens] = await pool.query(`
            SELECT
                n.id,
                n.pseudo,
                n.first_name,
                n.last_name,
                n.image_url,
                n.image_url_hover,
                n.birth_date,
                n.catch_phrase,
                pn.joined_at
            FROM nyxariens n
            JOIN poste_nyxarien pn ON n.id = pn.nyxarien_id
            WHERE pn.poste_id = ? AND pn.is_deleted = 0 AND n.is_deleted = 0
            ORDER BY n.pseudo
        `, [poste[0].id])

        res.json(nyxariens)
    } catch (error) {
        console.error('Erreur récupération nyxariens par poste:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// POST assigner un poste à un nyxarien (admin only)
router.post('/:nyxarienId/postes/:posteId', verifyToken, requireManageGames, async (req, res) => {
    try {
        const { nyxarienId, posteId } = req.params

        // Permissions vérifiées par le middleware

        // Vérifier que le nyxarien existe
        const [nyxarien] = await pool.query(
            'SELECT id FROM nyxariens WHERE id = ? AND is_deleted = 0',
            [nyxarienId]
        )
        if (nyxarien.length === 0) {
            return res.status(404).json({ message: 'Nyxarien non trouvé' })
        }

        // Vérifier que le poste existe
        const [poste] = await pool.query(
            'SELECT id FROM poste WHERE id = ? AND is_deleted = 0',
            [posteId]
        )
        if (poste.length === 0) {
            return res.status(404).json({ message: 'Poste non trouvé' })
        }

        // Vérifier si l'association existe déjà
        const [existing] = await pool.query(
            'SELECT id FROM poste_nyxarien WHERE nyxarien_id = ? AND poste_id = ?',
            [nyxarienId, posteId]
        )

        if (existing.length > 0) {
            return res.status(400).json({ message: 'Ce nyxarien a déjà ce poste' })
        }

        // Créer l'association
        await pool.query(
            'INSERT INTO poste_nyxarien (nyxarien_id, poste_id) VALUES (?, ?)',
            [nyxarienId, posteId]
        )

        res.json({ message: 'Poste assigné au nyxarien' })
    } catch (error) {
        console.error('Erreur assignation poste:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// DELETE retirer un poste d'un nyxarien (admin only) - soft delete
router.delete('/:nyxarienId/postes/:posteId', verifyToken, requireManageGames, async (req, res) => {
    try {
        const { nyxarienId, posteId } = req.params

        // Permissions vérifiées par le middleware

        // Vérifier que le nyxarien a au moins un autre poste (ne pas le laisser sans poste)
        const [otherPostes] = await pool.query(`
            SELECT COUNT(*) as count
            FROM poste_nyxarien
            WHERE nyxarien_id = ? AND poste_id != ? AND is_deleted = 0
        `, [nyxarienId, posteId])

        if (otherPostes[0].count === 0) {
            return res.status(400).json({ message: 'Le nyxarien doit avoir au moins un poste' })
        }

        // Soft delete l'association
        const result = await pool.query(
            'UPDATE poste_nyxarien SET is_deleted = 1 WHERE nyxarien_id = ? AND poste_id = ?',
            [nyxarienId, posteId]
        )

        if (result[0].affectedRows === 0) {
            return res.status(404).json({ message: 'Association non trouvée' })
        }

        res.json({ message: 'Poste retiré au nyxarien' })
    } catch (error) {
        console.error('Erreur retrait poste:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// GET tous les postes disponibles
router.get('/master/list', async (req, res) => {
    try {
        const [postes] = await pool.query(`
            SELECT id, name, description, color
            FROM poste
            WHERE is_deleted = 0
            ORDER BY name
        `)

        res.json(postes)
    } catch (error) {
        console.error('Erreur récupération postes:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

export default router
