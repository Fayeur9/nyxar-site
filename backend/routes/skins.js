import express from 'express'
import pool from '../db.js'
import path from 'path'
import { verifyToken, requireManageGames } from '../middleware/auth.js'
import { deleteImageFile, ensureUploadDir, sanitizeFilename } from '../utils/imageUpload.js'

const router = express.Router()

// S'assurer que le dossier uploads existe
const uploadsDir = ensureUploadDir('skins')

// GET tous les skins (public - actifs uniquement)
router.get('/', async (req, res) => {
    try {
        const [skins] = await pool.query(`
            SELECT id, name, description, image_url, image_url_hover, download_url, skin_maker, created_at, updated_at
            FROM skins
            WHERE is_deleted = 0 AND is_active = 1
            ORDER BY created_at DESC
        `)
        res.json(skins)
    } catch (error) {
        console.error('Erreur récupération skins:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// GET tous les skins (admin - tous)
router.get('/admin', verifyToken, requireManageGames, async (req, res) => {
    try {
        const [skins] = await pool.query(`
            SELECT id, name, description, image_url, image_url_hover, download_url, skin_maker, is_active, created_at, updated_at
            FROM skins
            WHERE is_deleted = 0
            ORDER BY created_at DESC
        `)
        res.json(skins)
    } catch (error) {
        console.error('Erreur récupération skins admin:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// GET un skin par ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params
        const [skin] = await pool.query(
            'SELECT * FROM skins WHERE id = ? AND is_deleted = 0',
            [id]
        )

        if (skin.length === 0) {
            return res.status(404).json({ message: 'Skin non trouvé' })
        }

        res.json(skin[0])
    } catch (error) {
        console.error('Erreur récupération skin:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// POST créer un skin (skin_maker ou admin seulement)
router.post('/', verifyToken, requireManageGames, async (req, res) => {
    try {
        const { name, description, image_url, image_url_hover, download_url, skin_maker } = req.body

        if (!name) {
            return res.status(400).json({ message: 'Le nom du skin est requis' })
        }

        // Vérifier que le skin n'existe pas déjà
        const [existing] = await pool.query(
            'SELECT id FROM skins WHERE name = ?',
            [name]
        )

        if (existing.length > 0) {
            return res.status(400).json({ message: 'Un skin avec ce nom existe déjà' })
        }

        // Valider les URLs d'images
        const validateUrl = (url) => {
            if (!url) return null
            if (url.includes('..') || url.includes('\\')) {
                throw new Error('Chemin d\'image invalide')
            }
            return url
        }

        let sanitizedUrlImage = null
        let sanitizedUrlImageHover = null
        try {
            sanitizedUrlImage = validateUrl(image_url)
            sanitizedUrlImageHover = validateUrl(image_url_hover)
        } catch (e) {
            return res.status(400).json({ message: e.message })
        }

        const [result] = await pool.query(
            'INSERT INTO skins (name, description, image_url, image_url_hover, download_url, skin_maker) VALUES (?, ?, ?, ?, ?, ?)',
            [name, description || null, sanitizedUrlImage, sanitizedUrlImageHover, download_url || null, skin_maker || null]
        )

        const [newSkin] = await pool.query(
            'SELECT * FROM skins WHERE id = ?',
            [result.insertId]
        )

        res.json(newSkin[0])
    } catch (error) {
        console.error('Erreur création skin:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// PUT modifier un skin (skin_maker ou admin seulement)
router.put('/:id', verifyToken, requireManageGames, async (req, res) => {
    try {
        const { id } = req.params
        const { name, description, image_url, image_url_hover, download_url, skin_maker } = req.body

        // Vérifier que le skin existe et récupérer les anciennes images
        const [existing] = await pool.query(
            'SELECT id, image_url, image_url_hover FROM skins WHERE id = ? AND is_deleted = 0',
            [id]
        )

        if (existing.length === 0) {
            return res.status(404).json({ message: 'Skin non trouvé' })
        }

        // Vérifier que le nouveau nom n'existe pas (si changé)
        if (name) {
            const [duplicateName] = await pool.query(
                'SELECT id FROM skins WHERE name = ? AND id != ?',
                [name, id]
            )
            if (duplicateName.length > 0) {
                return res.status(400).json({ message: 'Un skin avec ce nom existe déjà' })
            }
        }

        // Valider les URLs d'images
        const validateUrl = (url) => {
            if (url === undefined) return undefined
            if (!url) return null
            if (url.includes('..') || url.includes('\\')) {
                throw new Error('Chemin d\'image invalide')
            }
            return url
        }

        let sanitizedUrlImage, sanitizedUrlImageHover
        try {
            sanitizedUrlImage = validateUrl(image_url)
            sanitizedUrlImageHover = validateUrl(image_url_hover)
        } catch (e) {
            return res.status(400).json({ message: e.message })
        }

        // Supprimer les anciennes images si elles changent
        const oldUrlImage = existing[0].image_url
        const oldUrlImageHover = existing[0].image_url_hover

        if (sanitizedUrlImage !== undefined && oldUrlImage && oldUrlImage !== sanitizedUrlImage) {
            deleteImageFile(oldUrlImage, 'skins')
        }
        if (sanitizedUrlImageHover !== undefined && oldUrlImageHover && oldUrlImageHover !== sanitizedUrlImageHover) {
            deleteImageFile(oldUrlImageHover, 'skins')
        }

        await pool.query(
            `UPDATE skins SET
                name = COALESCE(?, name),
                description = ?,
                image_url = COALESCE(?, image_url),
                image_url_hover = COALESCE(?, image_url_hover),
                download_url = COALESCE(?, download_url),
                skin_maker = COALESCE(?, skin_maker),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
            [name, description, sanitizedUrlImage, sanitizedUrlImageHover, download_url, skin_maker, id]
        )

        const [updatedSkin] = await pool.query(
            'SELECT * FROM skins WHERE id = ?',
            [id]
        )

        res.json(updatedSkin[0])
    } catch (error) {
        console.error('Erreur modification skin:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// DELETE supprimer un skin (soft delete)
router.delete('/:id', verifyToken, requireManageGames, async (req, res) => {
    try {
        const { id } = req.params

        // Vérifier que le skin existe et récupérer les images
        const [existing] = await pool.query(
            'SELECT id, image_url, image_url_hover FROM skins WHERE id = ? AND is_deleted = 0',
            [id]
        )

        if (existing.length === 0) {
            return res.status(404).json({ message: 'Skin non trouvé' })
        }

        // Soft delete
        await pool.query(
            'UPDATE skins SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [id]
        )

        // Supprimer les images du serveur
        if (existing[0].image_url) {
            deleteImageFile(existing[0].image_url, 'skins')
        }
        if (existing[0].image_url_hover) {
            deleteImageFile(existing[0].image_url_hover, 'skins')
        }

        res.json({ message: 'Skin supprimé' })
    } catch (error) {
        console.error('Erreur suppression skin:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// PATCH toggle active status
router.patch('/:id/toggle', verifyToken, requireManageGames, async (req, res) => {
    try {
        const { id } = req.params

        // Récupérer l'état actuel
        const [skin] = await pool.query(
            'SELECT is_active FROM skins WHERE id = ? AND is_deleted = 0',
            [id]
        )

        if (skin.length === 0) {
            return res.status(404).json({ message: 'Skin non trouvé' })
        }

        // Inverser le statut
        const newStatus = skin[0].is_active ? 0 : 1

        await pool.query(
            'UPDATE skins SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [newStatus, id]
        )

        // Retourner le skin mis à jour
        const [updatedSkin] = await pool.query(
            'SELECT id, name, description, image_url, image_url_hover, download_url, skin_maker, is_active, created_at, updated_at FROM skins WHERE id = ?',
            [id]
        )

        res.json(updatedSkin[0])
    } catch (error) {
        console.error('Erreur toggle skin:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// POST upload une image de skin
router.post('/upload', verifyToken, requireManageGames, (req, res) => {
    try {
        if (!req.files || !req.files.image) {
            return res.status(400).json({ message: 'Aucun fichier trouvé' })
        }

        const image = req.files.image
        const ext = path.extname(image.name)
        const baseFilename = sanitizeFilename(path.basename(image.name, ext))
        const filename = `${baseFilename}-${Date.now()}${ext}`
        const uploadPath = path.join(uploadsDir, filename)

        image.mv(uploadPath, (err) => {
            if (err) {
                return res.status(500).json({ message: 'Erreur upload' })
            }

            res.json({
                message: 'Image uploadée',
                filename: filename,
                url: `/uploads/skins/${filename}`
            })
        })
    } catch (error) {
        console.error('Erreur upload:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

export default router
