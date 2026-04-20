import express from 'express'
import pool from '../db.js'
import { verifyToken, requireManageGames } from '../middleware/auth.js'
import { deleteImageFile } from '../utils/imageUpload.js'

const router = express.Router()

// GET tous les jeux (public - actifs uniquement)
router.get('/', async (req, res) => {
    try {
        const [games] = await pool.query(
            'SELECT id, name, color, image_url, image_hover, link, is_active FROM games WHERE is_deleted = 0 AND is_active = 1 ORDER BY name'
        )

        res.json(games)
    } catch (error) {
        console.error('Erreur récupération jeux:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// GET tous les jeux (admin - tous)
router.get('/admin', verifyToken, requireManageGames, async (req, res) => {
    try {
        const [games] = await pool.query(
            'SELECT id, name, color, image_url, image_hover, link, is_active FROM games WHERE is_deleted = 0 ORDER BY name'
        )

        res.json(games)
    } catch (error) {
        console.error('Erreur récupération jeux admin:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// GET un jeu par ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params
        const [games] = await pool.query(
            'SELECT id, name, color, image_url, image_hover, link FROM games WHERE id = ? AND is_deleted = 0',
            [id]
        )
        
        if (games.length === 0) {
            return res.status(404).json({ message: 'Jeu non trouvé' })
        }
        
        res.json(games[0])
    } catch (error) {
        console.error('Erreur récupération jeu:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// POST créer un nouveau jeu
router.post('/', verifyToken, requireManageGames, async (req, res) => {
    try {
        const { name, color, image_url, image_hover, link } = req.body

        if (!name) {
            return res.status(400).json({ message: 'Le nom du jeu est requis' })
        }

        const [result] = await pool.query(
            'INSERT INTO games (name, color, image_url, image_hover, link) VALUES (?, ?, ?, ?, ?)',
            [name, color || '#000000', image_url || '', image_hover || '', link || '']
        )

        res.status(201).json({
            id: result.insertId,
            name,
            color: color || '#000000',
            image_url: image_url || '',
            image_hover: image_hover || '',
            link: link || ''
        })
    } catch (error) {
        console.error('Erreur création jeu:', error)
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'Ce nom de jeu existe déjà' })
        }
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// PUT mettre à jour un jeu
router.put('/:id', verifyToken, requireManageGames, async (req, res) => {
    try {
        const { id } = req.params
        const { name, color, image_url, image_hover, link } = req.body

        if (!name) {
            return res.status(400).json({ message: 'Le nom du jeu est requis' })
        }

        // Récupérer les anciennes images avant mise à jour
        const [currentGame] = await pool.query(
            'SELECT image_url, image_hover FROM games WHERE id = ?',
            [id]
        )

        if (currentGame.length > 0) {
            const oldImageUrl = currentGame[0].image_url
            const oldImageHover = currentGame[0].image_hover

            // Supprimer les anciennes images si elles changent
            if (oldImageUrl && oldImageUrl !== image_url) {
                deleteImageFile(oldImageUrl, 'games')
            }
            if (oldImageHover && oldImageHover !== image_hover) {
                deleteImageFile(oldImageHover, 'games')
            }
        }

        await pool.query(
            'UPDATE games SET name = ?, color = ?, image_url = ?, image_hover = ?, link = ? WHERE id = ?',
            [name, color || '#000000', image_url || '', image_hover || '', link || '', id]
        )

        // Récupérer le jeu mis à jour
        const [games] = await pool.query(
            'SELECT id, name, color, image_url, image_hover, link FROM games WHERE id = ?',
            [id]
        )

        if (games.length === 0) {
            return res.status(404).json({ message: 'Jeu non trouvé' })
        }

        res.json(games[0])
    } catch (error) {
        console.error('Erreur mise à jour jeu:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// DELETE supprimer un jeu (soft delete)
router.delete('/:id', verifyToken, requireManageGames, async (req, res) => {
    try {
        const { id } = req.params

        // Récupérer les images avant suppression
        const [currentGame] = await pool.query(
            'SELECT image_url, image_hover FROM games WHERE id = ?',
            [id]
        )

        await pool.query(
            'UPDATE games SET is_deleted = 1 WHERE id = ?',
            [id]
        )

        // Supprimer les images du serveur
        if (currentGame.length > 0) {
            if (currentGame[0].image_url) {
                deleteImageFile(currentGame[0].image_url, 'games')
            }
            if (currentGame[0].image_hover) {
                deleteImageFile(currentGame[0].image_hover, 'games')
            }
        }

        res.json({ message: 'Jeu supprimé' })
    } catch (error) {
        console.error('Erreur suppression jeu:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// PATCH toggle active status
router.patch('/:id/toggle', verifyToken, requireManageGames, async (req, res) => {
    try {
        const { id } = req.params

        // Récupérer l'état actuel
        const [game] = await pool.query(
            'SELECT is_active FROM games WHERE id = ? AND is_deleted = 0',
            [id]
        )

        if (game.length === 0) {
            return res.status(404).json({ message: 'Jeu non trouvé' })
        }

        // Inverser le statut
        const newStatus = game[0].is_active ? 0 : 1

        await pool.query(
            'UPDATE games SET is_active = ? WHERE id = ?',
            [newStatus, id]
        )

        // Retourner le jeu mis à jour
        const [updatedGame] = await pool.query(
            'SELECT id, name, color, image_url, image_hover, link, is_active FROM games WHERE id = ?',
            [id]
        )

        res.json(updatedGame[0])
    } catch (error) {
        console.error('Erreur toggle jeu:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

export default router
