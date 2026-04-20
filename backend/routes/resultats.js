import express from 'express'
import path from 'path'
import pool from '../db.js'
import { verifyToken, requireManageGames } from '../middleware/auth.js'
import { ensureUploadDir, deleteImageFile, sanitizeFilename } from '../utils/imageUpload.js'

const router = express.Router()

// Valider et assainir une URL d'image (undefined = non modifié, null = supprimé)
const validateUrl = (url) => {
    if (url === undefined) return undefined
    if (!url) return null
    if (url.includes('..') || url.includes('\\')) {
        throw new Error('Chemin d\'image invalide')
    }
    return url
}

// S'assurer que le dossier uploads existe
const uploadsDir = ensureUploadDir('resultats')

// GET tous les résultats (public - actifs uniquement)
router.get('/', async (req, res) => {
    try {
        const [resultats] = await pool.query(`
            SELECT id, title, description, image_url, url_page, trackmania_exchange, trackmania_io, google_sheet, e_circuit_mania, rule_book, website, tm_event, liquipedia, created_at, updated_at
            FROM resultats
            WHERE is_deleted = 0 AND is_active = 1
            ORDER BY created_at DESC
        `)
        res.json(resultats)
    } catch (error) {
        console.error('Erreur récupération résultats:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// GET tous les résultats (admin - tous)
router.get('/admin', verifyToken, requireManageGames, async (req, res) => {
    try {
        const [resultats] = await pool.query(`
            SELECT id, title, description, image_url, url_page, trackmania_exchange, trackmania_io, google_sheet, e_circuit_mania, rule_book, website, tm_event, liquipedia, is_active, created_at, updated_at
            FROM resultats
            WHERE is_deleted = 0
            ORDER BY created_at DESC
        `)
        res.json(resultats)
    } catch (error) {
        console.error('Erreur récupération résultats admin:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// GET un résultat par ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params
        const [resultat] = await pool.query(
            'SELECT * FROM resultats WHERE id = ? AND is_deleted = 0',
            [id]
        )

        if (resultat.length === 0) {
            return res.status(404).json({ message: 'Résultat non trouvé' })
        }

        res.json(resultat[0])
    } catch (error) {
        console.error('Erreur récupération résultat:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// POST créer un résultat (admin seulement)
router.post('/', verifyToken, requireManageGames, async (req, res) => {
    try {
        const { title, description, image_url, url_page, trackmania_exchange, trackmania_io, google_sheet, e_circuit_mania, rule_book, website, tm_event, liquipedia } = req.body

        if (!title) {
            return res.status(400).json({ message: 'Le titre est requis' })
        }

        let sanitizedUrlImage = null
        try {
            sanitizedUrlImage = validateUrl(image_url)
        } catch (e) {
            return res.status(400).json({ message: e.message })
        }

        const [result] = await pool.query(
            'INSERT INTO resultats (title, description, image_url, url_page, trackmania_exchange, trackmania_io, google_sheet, e_circuit_mania, rule_book, website, tm_event, liquipedia) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [title, description || null, sanitizedUrlImage, url_page || null, trackmania_exchange || null, trackmania_io || null, google_sheet || null, e_circuit_mania || null, rule_book || null, website || null, tm_event || null, liquipedia || null]
        )

        const [newResultat] = await pool.query(
            'SELECT * FROM resultats WHERE id = ?',
            [result.insertId]
        )

        res.json(newResultat[0])
    } catch (error) {
        console.error('Erreur création résultat:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// PUT modifier un résultat (admin seulement)
router.put('/:id', verifyToken, requireManageGames, async (req, res) => {
    try {
        const { id } = req.params
        const { title, description, image_url, url_page, trackmania_exchange, trackmania_io, google_sheet, e_circuit_mania, rule_book, website, tm_event, liquipedia } = req.body

        // Vérifier que le résultat existe et récupérer l'ancienne image
        const [existing] = await pool.query(
            'SELECT id, image_url FROM resultats WHERE id = ? AND is_deleted = 0',
            [id]
        )

        if (existing.length === 0) {
            return res.status(404).json({ message: 'Résultat non trouvé' })
        }

        let sanitizedUrlImage
        try {
            sanitizedUrlImage = validateUrl(image_url)
        } catch (e) {
            return res.status(400).json({ message: e.message })
        }

        // Supprimer l'ancienne image si elle change
        const oldUrlImage = existing[0].image_url
        if (sanitizedUrlImage !== undefined && oldUrlImage && oldUrlImage !== sanitizedUrlImage) {
            deleteImageFile(oldUrlImage, 'resultats')
        }

        await pool.query(
            `UPDATE resultats SET
                title = COALESCE(?, title),
                description = ?,
                image_url = COALESCE(?, image_url),
                url_page = ?,
                trackmania_exchange = COALESCE(?, trackmania_exchange),
                trackmania_io = COALESCE(?, trackmania_io),
                google_sheet = COALESCE(?, google_sheet),
                e_circuit_mania = COALESCE(?, e_circuit_mania),
                rule_book = ?,
                website = ?,
                tm_event = ?,
                liquipedia = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
            [title, description, sanitizedUrlImage, url_page, trackmania_exchange || null, trackmania_io || null, google_sheet || null, e_circuit_mania || null, rule_book || null, website || null, tm_event || null, liquipedia || null, id]
        )

        const [updatedResultat] = await pool.query(
            'SELECT * FROM resultats WHERE id = ?',
            [id]
        )

        res.json(updatedResultat[0])
    } catch (error) {
        console.error('Erreur modification résultat:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// DELETE supprimer un résultat (soft delete)
router.delete('/:id', verifyToken, requireManageGames, async (req, res) => {
    try {
        const { id } = req.params

        // Vérifier que le résultat existe et récupérer l'image
        const [existing] = await pool.query(
            'SELECT id, image_url FROM resultats WHERE id = ? AND is_deleted = 0',
            [id]
        )

        if (existing.length === 0) {
            return res.status(404).json({ message: 'Résultat non trouvé' })
        }

        // Soft delete
        await pool.query(
            'UPDATE resultats SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [id]
        )

        // Supprimer l'image du serveur
        if (existing[0].image_url) {
            deleteImageFile(existing[0].image_url, 'resultats')
        }

        res.json({ message: 'Résultat supprimé' })
    } catch (error) {
        console.error('Erreur suppression résultat:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// PATCH toggle active status
router.patch('/:id/toggle', verifyToken, requireManageGames, async (req, res) => {
    try {
        const { id } = req.params

        // Récupérer l'état actuel
        const [resultat] = await pool.query(
            'SELECT is_active FROM resultats WHERE id = ? AND is_deleted = 0',
            [id]
        )

        if (resultat.length === 0) {
            return res.status(404).json({ message: 'Résultat non trouvé' })
        }

        // Inverser le statut
        const newStatus = resultat[0].is_active ? 0 : 1

        await pool.query(
            'UPDATE resultats SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [newStatus, id]
        )

        // Retourner le résultat mis à jour
        const [updatedResultat] = await pool.query(
            'SELECT id, title, description, image_url, url_page, is_active, created_at, updated_at FROM resultats WHERE id = ?',
            [id]
        )

        res.json(updatedResultat[0])
    } catch (error) {
        console.error('Erreur toggle résultat:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// POST upload une image de résultat
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
                url: `/uploads/resultats/${filename}`
            })
        })
    } catch (error) {
        console.error('Erreur upload:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

export default router
