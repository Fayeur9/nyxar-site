import express from 'express'
import pool from '../db.js'
import { verifyToken, requireAdminFull, requireManageGames } from '../middleware/auth.js'
import { deleteImageFile } from '../utils/imageUpload.js'
import { logAdminAction, optionalRoleContext, hasNyxarOrAdminAccess } from '../utils/noty-helpers.js'

const router = express.Router()

// ============ ROUTE UNIFIÉE: GET /categories ============
// Retourne les catégories en fonction du rôle de l'utilisateur
router.get('/categories', optionalRoleContext, async (req, res) => {
    try {
        const roleDetails = req.roleDetails || []
        const canAccessPrivateCategories = hasNyxarOrAdminAccess(roleDetails)
        const campaignId = req.query.campaign_id

        let query = `
            SELECT
                vc.id,
                vc.title,
                vc.description,
                vc.image_url,
                vc.votes_count,
                vc.display_order,
                vc.nominee_type,
                vc.game_id,
                g.name as game_name,
                g.color as game_color
            FROM voting_categories vc
            LEFT JOIN games g ON vc.game_id = g.id
        `
        const params = []

        query += ' WHERE vc.is_deleted = 0'

        if (campaignId) {
            query += ' AND vc.noty_campaign_id = ?'
            params.push(campaignId)
        }

        // Les visiteurs et users voient uniquement les catégories publiques
        if (!canAccessPrivateCategories) {
            query += ' AND vc.visible_by_nyxar = 1'
        }

        query += ' ORDER BY vc.display_order ASC'

        const [categories] = await pool.query(query, params)
        res.json(categories)
    } catch (error) {
        console.error('Erreur récupération catégories:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// ============ CRUD CATÉGORIES (Admin uniquement) ============

// GET catégorie par ID (pour édition admin)
router.get('/categories/:id', verifyToken, requireAdminFull, async (req, res) => {
    try {
        const { id } = req.params

        const [category] = await pool.query(
            `SELECT id, title, description, image_url, votes_count, game_id, visible_by_nyxar,
                    nominee_type, noty_campaign_id, display_order, is_deleted, created_at, updated_at
             FROM voting_categories WHERE id = ? AND is_deleted = 0`,
            [id]
        )

        if (category.length === 0) {
            return res.status(404).json({ message: 'Catégorie non trouvée' })
        }

        res.json(category[0])
    } catch (error) {
        console.error('Erreur récupération catégorie:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// POST créer une catégorie
router.post('/categories', verifyToken, requireAdminFull, async (req, res) => {
    try {
        const { title, description, image_url, game_id, visible_by_nyxar, nominee_type, noty_campaign_id } = req.body

        if (!title) {
            return res.status(400).json({ message: 'Titre requis' })
        }

        let sanitizedImageUrl = null
        if (image_url) {
            const decodedUrl = decodeURIComponent(image_url)
            if (decodedUrl.includes('..') || decodedUrl.includes('\\')) {
                return res.status(400).json({ message: 'Chemin d\'image invalide' })
            }
            sanitizedImageUrl = image_url
        }

        const [result] = await pool.query(
            `INSERT INTO voting_categories (title, description, image_url, game_id, visible_by_nyxar, nominee_type, noty_campaign_id)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [title, description || null, sanitizedImageUrl, game_id || null, visible_by_nyxar ?? 1, nominee_type || 'player', noty_campaign_id || null]
        )

        const [category] = await pool.query(
            `SELECT id, title, description, image_url, votes_count, game_id, visible_by_nyxar,
                    nominee_type, noty_campaign_id, display_order, is_deleted, created_at, updated_at
             FROM voting_categories WHERE id = ?`,
            [result.insertId]
        )

        res.status(201).json(category[0])
    } catch (error) {
        console.error('Erreur création catégorie:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// PUT mettre à jour une catégorie
router.put('/categories/:id', verifyToken, requireAdminFull, async (req, res) => {
    try {
        const { id } = req.params

        const { title, description, image_url, game_id, visible_by_nyxar, nominee_type, noty_campaign_id } = req.body

        let sanitizedImageUrl = image_url
        if (image_url && (image_url.includes('..') || image_url.includes('\\'))) {
            return res.status(400).json({ message: 'Chemin d\'image invalide' })
        }

        // Récupérer l'ancienne image avant mise à jour
        const [currentCategory] = await pool.query(
            'SELECT image_url FROM voting_categories WHERE id = ?',
            [id]
        )

        if (currentCategory.length > 0) {
            const oldImageUrl = currentCategory[0].image_url
            if (oldImageUrl && oldImageUrl !== image_url) {
                deleteImageFile(oldImageUrl)
            }
        }

        const [result] = await pool.query(
            `UPDATE voting_categories
             SET title = COALESCE(?, title),
                 description = ?,
                 image_url = ?,
                 game_id = ?,
                 visible_by_nyxar = ?,
                 nominee_type = ?,
                 noty_campaign_id = ?,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [title, description, sanitizedImageUrl, game_id || null, visible_by_nyxar ?? 1, nominee_type || 'player', noty_campaign_id || null, id]
        )

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Catégorie non trouvée' })
        }

        const [category] = await pool.query(
            `SELECT id, title, description, image_url, votes_count, game_id, visible_by_nyxar,
                    nominee_type, noty_campaign_id, display_order, is_deleted, created_at, updated_at
             FROM voting_categories WHERE id = ?`,
            [id]
        )

        res.json(category[0])
    } catch (error) {
        console.error('Erreur mise à jour catégorie:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// DELETE supprimer en lot les catégories d'une campagne
router.delete('/campaigns/:id/categories', verifyToken, requireManageGames, async (req, res) => {
    try {
        const campaignId = req.params.id
        const { categoryIds } = req.body

        // Validation du body
        if (
            !Array.isArray(categoryIds) ||
            categoryIds.length === 0 ||
            !categoryIds.every(n => Number.isInteger(n) && n > 0)
        ) {
            return res.status(400).json({ message: 'categoryIds doit être un tableau non vide d\'entiers positifs' })
        }

        // Vérifier que toutes les catégories appartiennent à cette campagne
        const [linked] = await pool.query(
            `SELECT id as category_id FROM voting_categories WHERE noty_campaign_id = ? AND id IN (?) AND is_deleted = 0`,
            [campaignId, categoryIds]
        )

        if (linked.length !== categoryIds.length) {
            return res.status(403).json({ message: 'Certaines catégories n\'appartiennent pas à cette campagne' })
        }

        // Cascade soft delete : votes → nominees → custom nominees → catégories
        await pool.query(
            `UPDATE votes SET is_deleted = 1 WHERE category_id IN (?)`,
            [categoryIds]
        )
        await pool.query(
            `UPDATE voting_categories_nominees SET is_deleted = 1 WHERE category_id IN (?)`,
            [categoryIds]
        )
        await pool.query(
            `UPDATE custom_nominees SET is_deleted = 1 WHERE category_id IN (?)`,
            [categoryIds]
        )
        const [result] = await pool.query(
            `UPDATE voting_categories SET is_deleted = 1 WHERE id IN (?) AND is_deleted = 0`,
            [categoryIds]
        )

        await logAdminAction(req.user.id, 'categories_batch_delete', 'campaign', Number(campaignId), { count: result.affectedRows, category_ids: categoryIds })

        res.json({ deleted: result.affectedRows })
    } catch (error) {
        console.error('Erreur suppression en lot des catégories:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// DELETE supprimer une catégorie
router.delete('/categories/:id', verifyToken, requireAdminFull, async (req, res) => {
    try {
        const { id } = req.params

        // Récupérer l'image et le titre avant suppression
        const [currentCategory] = await pool.query(
            'SELECT title, image_url FROM voting_categories WHERE id = ?',
            [id]
        )

        const [result] = await pool.query(
            'UPDATE voting_categories SET is_deleted = 1 WHERE id = ?',
            [id]
        )

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Catégorie non trouvée' })
        }

        // Supprimer l'image du serveur
        if (currentCategory.length > 0 && currentCategory[0].image_url) {
            deleteImageFile(currentCategory[0].image_url)
        }

        const categoryTitle = currentCategory.length > 0 ? currentCategory[0].title : null
        await logAdminAction(req.user.id, 'category_delete', 'category', Number(id), categoryTitle ? { title: categoryTitle } : null)

        res.json({ message: 'Catégorie supprimée' })
    } catch (error) {
        console.error('Erreur suppression catégorie:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// ============ JOUEURS ÉLIGIBLES AU VOTE ============

// GET joueurs éligibles pour voter dans une catégorie
// Si la catégorie a un game_id : joueurs dans une line-up de ce jeu
// Si pas de game_id : tous les joueurs
router.get('/categories/:id/eligible-players', async (req, res) => {
    try {
        const { id } = req.params

        const [category] = await pool.query(
            'SELECT game_id FROM voting_categories WHERE id = ? AND is_deleted = 0',
            [id]
        )

        if (category.length === 0) {
            return res.status(404).json({ message: 'Catégorie non trouvée' })
        }

        const gameId = category[0].game_id
        let players

        if (gameId) {
            [players] = await pool.query(
                `SELECT DISTINCT p.id, p.pseudo, p.image_url
                 FROM nyxariens p
                 JOIN line_up_players lup ON p.id = lup.player_id
                 JOIN line_ups lu ON lup.line_up_id = lu.id
                 WHERE lu.game_id = ? AND p.is_deleted = 0 AND lup.is_deleted = 0 AND lup.left_at IS NULL
                 ORDER BY p.pseudo`,
                [gameId]
            )
        } else {
            [players] = await pool.query(
                `SELECT id, pseudo, image_url
                 FROM nyxariens
                 WHERE is_deleted = 0
                 ORDER BY pseudo`
            )
        }

        // Ajouter les personnes custom (IDs négatifs pour les distinguer)
        const [customPeople] = await pool.query(
            `SELECT id, title AS pseudo, media_url AS image_url
             FROM custom_nominees
             WHERE category_id = ? AND is_deleted = 0
             ORDER BY display_order ASC, id ASC`,
            [id]
        )
        const allNominees = [
            ...players,
            ...customPeople.map(cn => ({ id: -cn.id, pseudo: cn.pseudo, image_url: cn.image_url }))
        ]

        res.json(allNominees)
    } catch (error) {
        console.error('Erreur récupération joueurs éligibles:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// ============ NOMINÉS (Admin) ============

// GET nominés d'une catégorie
router.get('/categories/:id/nominees', async (req, res) => {
    try {
        const { id } = req.params

        // Joueurs réels (pas de first_name/last_name en public)
        const [nominees] = await pool.query(
            `SELECT p.id, p.id as player_id, p.pseudo, p.image_url
             FROM voting_categories_nominees vcn
             JOIN nyxariens p ON vcn.player_id = p.id
             WHERE vcn.category_id = ? AND vcn.is_deleted = 0
             ORDER BY p.pseudo`,
            [id]
        )

        // Personnes custom (IDs négatifs)
        const [customNominees] = await pool.query(
            `SELECT id, title, media_url
             FROM custom_nominees
             WHERE category_id = ? AND is_deleted = 0
             ORDER BY display_order ASC, id ASC`,
            [id]
        )

        const all = [
            ...nominees,
            ...customNominees.map(cn => ({
                id: -cn.id,
                player_id: -cn.id,
                pseudo: cn.title,
                image_url: cn.media_url,
                source: 'custom'
            }))
        ]

        res.json(all)
    } catch (error) {
        console.error('Erreur récupération nominés:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// GET joueurs disponibles pour nomination (admin uniquement)
router.get('/categories/:id/available-players', verifyToken, requireAdminFull, async (req, res) => {
    try {
        const { id } = req.params

        const [category] = await pool.query(
            'SELECT game_id FROM voting_categories WHERE id = ?',
            [id]
        )

        if (category.length === 0) {
            return res.status(404).json({ message: 'Catégorie non trouvée' })
        }

        const gameId = category[0].game_id

        const [currentNominees] = await pool.query(
            'SELECT player_id FROM voting_categories_nominees WHERE category_id = ? AND is_deleted = 0',
            [id]
        )
        const nomineeIds = currentNominees.map(n => n.player_id)

        let query, params

        if (gameId) {
            query = `
                SELECT DISTINCT p.id, p.pseudo, p.first_name, p.last_name, p.image_url
                FROM nyxariens p
                JOIN line_up_players lup ON p.id = lup.player_id
                JOIN line_ups lu ON lup.line_up_id = lu.id
                WHERE lu.game_id = ? AND p.id NOT IN (?)
                    AND p.is_deleted = 0 AND lup.is_deleted = 0 AND lup.left_at IS NULL
                ORDER BY p.pseudo
            `
            params = [gameId, nomineeIds.length > 0 ? nomineeIds : [null]]
        } else {
            query = `
                SELECT id, pseudo, first_name, last_name, image_url
                FROM nyxariens
                WHERE id NOT IN (?) AND is_deleted = 0
                ORDER BY pseudo
            `
            params = [nomineeIds.length > 0 ? nomineeIds : [null]]
        }

        const [availablePlayers] = await pool.query(query, params)

        res.json(availablePlayers)
    } catch (error) {
        console.error('Erreur récupération joueurs disponibles:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// POST ajouter un nominé
router.post('/categories/:id/nominees', verifyToken, requireAdminFull, async (req, res) => {
    try {
        const { id } = req.params

        const { player_id } = req.body

        if (!player_id) {
            return res.status(400).json({ message: 'player_id requis' })
        }

        const [category] = await pool.query(
            'SELECT id, game_id FROM voting_categories WHERE id = ?',
            [id]
        )

        if (category.length === 0) {
            return res.status(404).json({ message: 'Catégorie non trouvée' })
        }

        const [player] = await pool.query(
            'SELECT id FROM nyxariens WHERE id = ?',
            [player_id]
        )

        if (player.length === 0) {
            return res.status(404).json({ message: 'Joueur non trouvé' })
        }

        const categoryGameId = category[0].game_id

        if (categoryGameId) {
            const [playerInGame] = await pool.query(
                `SELECT p.id
                 FROM nyxariens p
                 JOIN line_up_players lup ON p.id = lup.player_id
                 JOIN line_ups lu ON lup.line_up_id = lu.id
                 WHERE lu.game_id = ? AND p.id = ?`,
                [categoryGameId, player_id]
            )

            if (playerInGame.length === 0) {
                return res.status(400).json({ message: 'Ce joueur n\'appartient pas à ce jeu' })
            }
        }

        const [nominees] = await pool.query(
            `SELECT
                (SELECT COUNT(*) FROM voting_categories_nominees WHERE category_id = ? AND is_deleted = 0) +
                (SELECT COUNT(*) FROM custom_nominees WHERE category_id = ? AND is_deleted = 0) as count`,
            [id, id]
        )

        if (nominees[0].count >= 6) {
            return res.status(400).json({ message: 'Maximum 6 nominés par catégorie' })
        }

        try {
            await pool.query(
                `INSERT INTO voting_categories_nominees (category_id, player_id, is_deleted)
                 VALUES (?, ?, 0)
                 ON DUPLICATE KEY UPDATE is_deleted = 0`,
                [id, player_id]
            )

            res.status(201).json({ message: 'Nominé ajouté' })
        } catch (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ message: 'Joueur déjà nominé' })
            }
            throw err
        }
    } catch (error) {
        console.error('Erreur ajout nominé:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// DELETE supprimer un nominé
router.delete('/categories/:id/nominees/:player_id', verifyToken, requireAdminFull, async (req, res) => {
    try {
        const { id, player_id } = req.params

        const [result] = await pool.query(
            `UPDATE voting_categories_nominees
             SET is_deleted = 1
             WHERE category_id = ? AND player_id = ?`,
            [id, player_id]
        )

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Nominé non trouvé' })
        }

        res.json({ message: 'Nominé supprimé' })
    } catch (error) {
        console.error('Erreur suppression nominé:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// ============ CUSTOM NOMINEES (Admin) ============

// GET custom nominees d'une catégorie
router.get('/categories/:id/custom-nominees', async (req, res) => {
    try {
        const { id } = req.params

        const [nominees] = await pool.query(
            `SELECT id, title, media_url, waveform_data, display_order
             FROM custom_nominees
             WHERE category_id = ? AND is_deleted = 0
             ORDER BY display_order ASC, id ASC`,
            [id]
        )

        res.json(nominees)
    } catch (error) {
        console.error('Erreur récupération custom nominees:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// POST ajouter un custom nominee
router.post('/categories/:id/custom-nominees', verifyToken, requireAdminFull, async (req, res) => {
    try {
        const { id } = req.params
        const { title, media_url, waveform_data } = req.body

        if (!title || !media_url) {
            return res.status(400).json({ message: 'Titre et media_url requis' })
        }

        const [category] = await pool.query(
            'SELECT id, nominee_type FROM voting_categories WHERE id = ? AND is_deleted = 0',
            [id]
        )

        if (category.length === 0) {
            return res.status(404).json({ message: 'Catégorie non trouvée' })
        }

        const [result] = await pool.query(
            `INSERT INTO custom_nominees (category_id, title, media_url, waveform_data) VALUES (?, ?, ?, ?)`,
            [id, title, media_url, waveform_data ? JSON.stringify(waveform_data) : null]
        )

        res.status(201).json({
            id: result.insertId,
            category_id: parseInt(id),
            title,
            media_url,
            waveform_data: waveform_data || null,
            display_order: 0
        })
    } catch (error) {
        console.error('Erreur ajout custom nominee:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// DELETE supprimer un custom nominee (soft delete + cleanup fichier)
router.delete('/categories/:id/custom-nominees/:nid', verifyToken, requireAdminFull, async (req, res) => {
    try {
        const { id, nid } = req.params

        const [nominee] = await pool.query(
            'SELECT id, media_url FROM custom_nominees WHERE id = ? AND category_id = ? AND is_deleted = 0',
            [nid, id]
        )

        if (nominee.length === 0) {
            return res.status(404).json({ message: 'Nominee non trouvé' })
        }

        await pool.query(
            'UPDATE custom_nominees SET is_deleted = 1 WHERE id = ?',
            [nid]
        )

        // Supprimer le fichier si c'est un upload local
        if (nominee[0].media_url && nominee[0].media_url.startsWith('/uploads/')) {
            deleteImageFile(nominee[0].media_url)
        }

        res.json({ message: 'Nominee supprimé' })
    } catch (error) {
        console.error('Erreur suppression custom nominee:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

export default router
