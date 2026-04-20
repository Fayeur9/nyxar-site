import express from 'express'
import pool from '../db.js'
import { verifyToken, requireManageGames } from '../middleware/auth.js'
import { ensureUploadDir, handleImageUpload, deleteImageFile } from '../utils/imageUpload.js'

const router = express.Router()

// S'assurer que le dossier uploads existe
ensureUploadDir('sponsors')

// GET all sponsors (public - pour le footer, actifs uniquement)
router.get('/', async (req, res) => {
    try {
        const [sponsors] = await pool.query(
            'SELECT id, name, image_url FROM sponsors WHERE is_deleted = 0 AND is_active = 1 ORDER BY display_order ASC, created_at ASC'
        )
        res.json(sponsors)
    } catch (error) {
        console.error('Erreur récupération sponsors:', error)
        res.status(500).json({ error: error.message })
    }
})

// GET all sponsors (admin - tous)
router.get('/admin', verifyToken, requireManageGames, async (req, res) => {
    try {
        const [sponsors] = await pool.query(
            'SELECT id, name, image_url, display_order, is_active FROM sponsors WHERE is_deleted = 0 ORDER BY display_order ASC, created_at ASC'
        )
        res.json(sponsors)
    } catch (error) {
        console.error('Erreur récupération sponsors admin:', error)
        res.status(500).json({ error: error.message })
    }
})

// GET one sponsor by ID (admin)
router.get('/:id', verifyToken, requireManageGames, async (req, res) => {
    try {
        const [sponsors] = await pool.query(
            'SELECT * FROM sponsors WHERE id = ? AND is_deleted = 0',
            [req.params.id]
        )
        if (sponsors.length === 0) {
            return res.status(404).json({ error: 'Sponsor non trouvé' })
        }
        res.json(sponsors[0])
    } catch (error) {
        console.error('Erreur récupération sponsor:', error)
        res.status(500).json({ error: error.message })
    }
})

// CREATE sponsor
router.post('/', verifyToken, requireManageGames, async (req, res) => {
    try {
        const { name, image_url, display_order } = req.body

        if (!name || !image_url) {
            return res.status(400).json({ error: 'Nom et image sont obligatoires' })
        }

        const [result] = await pool.query(
            'INSERT INTO sponsors (name, image_url, display_order) VALUES (?, ?, ?)',
            [name, image_url, display_order || 0]
        )

        const [newSponsor] = await pool.query(
            'SELECT * FROM sponsors WHERE id = ?',
            [result.insertId]
        )

        res.status(201).json(newSponsor[0])
    } catch (error) {
        console.error('Erreur création sponsor:', error)
        res.status(500).json({ error: error.message })
    }
})

// UPDATE sponsor
router.put('/:id', verifyToken, requireManageGames, async (req, res) => {
    try {
        const { name, image_url, display_order } = req.body

        if (!name || !image_url) {
            return res.status(400).json({ error: 'Nom et image sont obligatoires' })
        }

        // Supprimer l'ancienne image si elle change
        const [currentSponsor] = await pool.query(
            'SELECT image_url FROM sponsors WHERE id = ?',
            [req.params.id]
        )
        if (currentSponsor.length > 0) {
            const oldImageUrl = currentSponsor[0].image_url
            if (oldImageUrl && oldImageUrl !== image_url) {
                deleteImageFile(oldImageUrl, 'sponsors')
            }
        }

        await pool.query(
            'UPDATE sponsors SET name = ?, image_url = ?, display_order = ? WHERE id = ?',
            [name, image_url, display_order || 0, req.params.id]
        )

        const [updatedSponsor] = await pool.query(
            'SELECT * FROM sponsors WHERE id = ?',
            [req.params.id]
        )

        res.json(updatedSponsor[0])
    } catch (error) {
        console.error('Erreur modification sponsor:', error)
        res.status(500).json({ error: error.message })
    }
})

// DELETE sponsor (soft delete)
router.delete('/:id', verifyToken, requireManageGames, async (req, res) => {
    try {
        // Récupérer l'ancien sponsor pour supprimer l'image
        const [oldSponsor] = await pool.query(
            'SELECT image_url FROM sponsors WHERE id = ?',
            [req.params.id]
        )

        await pool.query(
            'UPDATE sponsors SET is_deleted = 1 WHERE id = ?',
            [req.params.id]
        )

        // Supprimer l'ancienne image du serveur
        if (oldSponsor[0]?.image_url) {
            deleteImageFile(oldSponsor[0].image_url, 'sponsors')
        }

        res.json({ message: 'Sponsor supprimé' })
    } catch (error) {
        console.error('Erreur suppression sponsor:', error)
        res.status(500).json({ error: error.message })
    }
})

// PATCH toggle active status
router.patch('/:id/toggle', verifyToken, requireManageGames, async (req, res) => {
    try {
        const { id } = req.params

        // Récupérer l'état actuel
        const [sponsor] = await pool.query(
            'SELECT is_active FROM sponsors WHERE id = ? AND is_deleted = 0',
            [id]
        )

        if (sponsor.length === 0) {
            return res.status(404).json({ error: 'Sponsor non trouvé' })
        }

        // Inverser le statut
        const newStatus = sponsor[0].is_active ? 0 : 1

        await pool.query(
            'UPDATE sponsors SET is_active = ? WHERE id = ?',
            [newStatus, id]
        )

        // Retourner le sponsor mis à jour
        const [updatedSponsor] = await pool.query(
            'SELECT id, name, image_url, display_order, is_active FROM sponsors WHERE id = ?',
            [id]
        )

        res.json(updatedSponsor[0])
    } catch (error) {
        console.error('Erreur toggle sponsor:', error)
        res.status(500).json({ error: error.message })
    }
})

// POST upload image sponsor
router.post('/upload', verifyToken, requireManageGames, async (req, res) => {
    try {
        const result = await handleImageUpload(req, 'sponsors', 'sponsor')
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
