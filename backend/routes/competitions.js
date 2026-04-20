import express from 'express'
import pool from '../db.js'
import { verifyToken, requireManageGames } from '../middleware/auth.js'
import { ensureUploadDir, handleImageUpload, deleteImageFile } from '../utils/imageUpload.js'

const router = express.Router()

// S'assurer que le dossier uploads existe
ensureUploadDir('competitions')

// GET all competitions (public - accessible sans authentification, actifs uniquement)
router.get('/public', async (req, res) => {
    try {
        const [competitions] = await pool.query(
            'SELECT id, title, date, prize, format, description, image, game, discord_link, rule_book FROM competitions WHERE is_deleted = 0 AND is_active = 1 ORDER BY created_at DESC'
        )
        res.json(competitions)
    } catch (error) {
        console.error('Erreur récupération compétitions:', error)
        res.status(500).json({ error: error.message })
    }
})

// GET all competitions (admin only - tous)
router.get('/', verifyToken, requireManageGames, async (req, res) => {
    try {
        const [competitions] = await pool.query(
            'SELECT *, is_active FROM competitions WHERE is_deleted = 0 ORDER BY created_at DESC'
        )
        res.json(competitions)
    } catch (error) {
        console.error('Erreur récupération compétitions:', error)
        res.status(500).json({ error: error.message })
    }
})

// GET one competition by ID
router.get('/:id', verifyToken, requireManageGames, async (req, res) => {
    try {
        const [competitions] = await pool.query(
            'SELECT * FROM competitions WHERE id = ? AND is_deleted = 0',
            [req.params.id]
        )
        if (competitions.length === 0) {
            return res.status(404).json({ error: 'Compétition non trouvée' })
        }
        res.json(competitions[0])
    } catch (error) {
        console.error('Erreur récupération compétition:', error)
        res.status(500).json({ error: error.message })
    }
})

// CREATE competition
router.post('/', verifyToken, requireManageGames, async (req, res) => {
    try {
        const { title, date, prize, format, description, image, game, discord_link, rule_book } = req.body

        if (!title || !game) {
            return res.status(400).json({ error: 'Titre et jeu sont obligatoires' })
        }

        const [result] = await pool.query(
            'INSERT INTO competitions (title, date, prize, format, description, image, game, discord_link, rule_book) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [title, date || '', prize || '', format || '', description || '', image || '', game, discord_link || '', rule_book || '']
        )

        const [newCompetition] = await pool.query(
            'SELECT * FROM competitions WHERE id = ?',
            [result.insertId]
        )

        res.status(201).json(newCompetition[0])
    } catch (error) {
        console.error('Erreur création compétition:', error)
        res.status(500).json({ error: error.message })
    }
})

// UPDATE competition
router.put('/:id', verifyToken, requireManageGames, async (req, res) => {
    try {
        const { title, date, prize, format, description, image, game, discord_link, rule_book } = req.body

        if (!title || !game) {
            return res.status(400).json({ error: 'Titre et jeu sont obligatoires' })
        }

        // Supprimer l'ancienne image si elle change
        if (image !== undefined) {
            const [current] = await pool.query('SELECT image FROM competitions WHERE id = ?', [req.params.id])
            const oldImage = current[0]?.image
            if (oldImage && oldImage !== image) {
                deleteImageFile(oldImage, 'competitions')
            }
        }

        await pool.query(
            'UPDATE competitions SET title = ?, date = ?, prize = ?, format = ?, description = ?, image = ?, game = ?, discord_link = ?, rule_book = ? WHERE id = ?',
            [title, date || '', prize || '', format || '', description || '', image || '', game, discord_link || '', rule_book || '', req.params.id]
        )

        const [updatedCompetition] = await pool.query(
            'SELECT * FROM competitions WHERE id = ?',
            [req.params.id]
        )

        res.json(updatedCompetition[0])
    } catch (error) {
        console.error('Erreur modification compétition:', error)
        res.status(500).json({ error: error.message })
    }
})

// DELETE competition (soft delete)
router.delete('/:id', verifyToken, requireManageGames, async (req, res) => {
    try {
        // Récupérer l'image avant suppression
        const [currentCompetition] = await pool.query(
            'SELECT image FROM competitions WHERE id = ?',
            [req.params.id]
        )

        await pool.query(
            'UPDATE competitions SET is_deleted = 1 WHERE id = ?',
            [req.params.id]
        )

        // Supprimer l'image du serveur
        if (currentCompetition.length > 0 && currentCompetition[0].image) {
            deleteImageFile(currentCompetition[0].image, 'competitions')
        }

        res.json({ message: 'Compétition supprimée' })
    } catch (error) {
        console.error('Erreur suppression compétition:', error)
        res.status(500).json({ error: error.message })
    }
})

// PATCH toggle active status
router.patch('/:id/toggle', verifyToken, requireManageGames, async (req, res) => {
    try {
        const { id } = req.params

        // Récupérer l'état actuel
        const [competition] = await pool.query(
            'SELECT is_active FROM competitions WHERE id = ? AND is_deleted = 0',
            [id]
        )

        if (competition.length === 0) {
            return res.status(404).json({ error: 'Compétition non trouvée' })
        }

        // Inverser le statut
        const newStatus = competition[0].is_active ? 0 : 1

        await pool.query(
            'UPDATE competitions SET is_active = ? WHERE id = ?',
            [newStatus, id]
        )

        // Retourner la compétition mise à jour
        const [updatedCompetition] = await pool.query(
            'SELECT * FROM competitions WHERE id = ?',
            [id]
        )

        res.json(updatedCompetition[0])
    } catch (error) {
        console.error('Erreur toggle compétition:', error)
        res.status(500).json({ error: error.message })
    }
})

// POST upload image compétition
router.post('/upload', verifyToken, requireManageGames, async (req, res) => {
    try {
        const result = await handleImageUpload(req, 'competitions', 'competition')
        res.json({
            message: 'Image uploadée',
            ...result
        })
    } catch (error) {
        console.error('Erreur upload:', error)
        res.status(400).json({ message: error.message })
    }
})

export default router
