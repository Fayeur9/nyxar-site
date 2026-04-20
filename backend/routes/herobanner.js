import express from 'express'
import pool from '../db.js'
import { verifyToken, requireManageGames } from '../middleware/auth.js'
import { ensureUploadDir, handleImageUpload, deleteImageFile } from '../utils/imageUpload.js'

const router = express.Router()

// S'assurer que le dossier uploads existe
ensureUploadDir('herobanner')

// GET all active banners (public - pour la homepage)
router.get('/', async (req, res) => {
    try {
        const [banners] = await pool.query(
            'SELECT id, title, image_url FROM hero_banners WHERE is_deleted = 0 AND is_active = 1 ORDER BY display_order ASC, created_at DESC'
        )
        res.json(banners)
    } catch (error) {
        console.error('Erreur récupération hero banners:', error)
        res.status(500).json({ error: error.message })
    }
})

// GET all banners including inactive (admin)
router.get('/admin', verifyToken, requireManageGames, async (req, res) => {
    try {
        const [banners] = await pool.query(
            'SELECT * FROM hero_banners WHERE is_deleted = 0 ORDER BY display_order ASC, created_at DESC'
        )
        res.json(banners)
    } catch (error) {
        console.error('Erreur récupération hero banners:', error)
        res.status(500).json({ error: error.message })
    }
})

// GET one banner by ID (admin)
router.get('/:id', verifyToken, requireManageGames, async (req, res) => {
    try {
        const [banners] = await pool.query(
            'SELECT * FROM hero_banners WHERE id = ? AND is_deleted = 0',
            [req.params.id]
        )
        if (banners.length === 0) {
            return res.status(404).json({ error: 'Banner non trouvé' })
        }
        res.json(banners[0])
    } catch (error) {
        console.error('Erreur récupération banner:', error)
        res.status(500).json({ error: error.message })
    }
})

// CREATE banner
router.post('/', verifyToken, requireManageGames, async (req, res) => {
    try {
        const { title, image_url, display_order, is_active } = req.body

        if (!image_url) {
            return res.status(400).json({ error: 'Image obligatoire' })
        }

        const [result] = await pool.query(
            'INSERT INTO hero_banners (title, image_url, display_order, is_active) VALUES (?, ?, ?, ?)',
            [title || '', image_url, display_order || 0, is_active !== undefined ? is_active : 1]
        )

        const [newBanner] = await pool.query(
            'SELECT * FROM hero_banners WHERE id = ?',
            [result.insertId]
        )

        res.status(201).json(newBanner[0])
    } catch (error) {
        console.error('Erreur création banner:', error)
        res.status(500).json({ error: error.message })
    }
})

// UPDATE banner
router.put('/:id', verifyToken, requireManageGames, async (req, res) => {
    try {
        const { title, image_url, display_order, is_active } = req.body

        if (!image_url) {
            return res.status(400).json({ error: 'Image obligatoire' })
        }

        // Supprimer l'ancienne image si elle change
        const [currentBanner] = await pool.query(
            'SELECT image_url FROM hero_banners WHERE id = ?',
            [req.params.id]
        )
        if (currentBanner.length > 0) {
            const oldImageUrl = currentBanner[0].image_url
            if (oldImageUrl && oldImageUrl !== image_url) {
                deleteImageFile(oldImageUrl, 'herobanner')
            }
        }

        await pool.query(
            'UPDATE hero_banners SET title = ?, image_url = ?, display_order = ?, is_active = ? WHERE id = ?',
            [title || '', image_url, display_order || 0, is_active !== undefined ? is_active : 1, req.params.id]
        )

        const [updatedBanner] = await pool.query(
            'SELECT * FROM hero_banners WHERE id = ?',
            [req.params.id]
        )

        res.json(updatedBanner[0])
    } catch (error) {
        console.error('Erreur modification banner:', error)
        res.status(500).json({ error: error.message })
    }
})

// PATCH toggle active status
router.patch('/:id/toggle', verifyToken, requireManageGames, async (req, res) => {
    try {
        const [banner] = await pool.query(
            'SELECT is_active FROM hero_banners WHERE id = ? AND is_deleted = 0',
            [req.params.id]
        )

        if (banner.length === 0) {
            return res.status(404).json({ error: 'Banner non trouvé' })
        }

        const newStatus = banner[0].is_active ? 0 : 1

        await pool.query(
            'UPDATE hero_banners SET is_active = ? WHERE id = ?',
            [newStatus, req.params.id]
        )

        const [updatedBanner] = await pool.query(
            'SELECT * FROM hero_banners WHERE id = ?',
            [req.params.id]
        )

        res.json(updatedBanner[0])
    } catch (error) {
        console.error('Erreur toggle banner:', error)
        res.status(500).json({ error: error.message })
    }
})

// DELETE banner (soft delete)
router.delete('/:id', verifyToken, requireManageGames, async (req, res) => {
    try {
        // Récupérer l'ancien banner pour supprimer l'image
        const [oldBanner] = await pool.query(
            'SELECT image_url FROM hero_banners WHERE id = ?',
            [req.params.id]
        )

        await pool.query(
            'UPDATE hero_banners SET is_deleted = 1 WHERE id = ?',
            [req.params.id]
        )

        // Supprimer l'ancienne image du serveur
        if (oldBanner[0]?.image_url) {
            deleteImageFile(oldBanner[0].image_url, 'herobanner')
        }

        res.json({ message: 'Banner supprimé' })
    } catch (error) {
        console.error('Erreur suppression banner:', error)
        res.status(500).json({ error: error.message })
    }
})

// POST upload image banner
router.post('/upload', verifyToken, requireManageGames, async (req, res) => {
    try {
        const result = await handleImageUpload(req, 'herobanner', 'herobanner')
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
