import express from 'express'
import rateLimit from 'express-rate-limit'
import pool from '../db.js'
import { verifyToken, requireAdminFull, attachRoleContext } from '../middleware/auth.js'
import { logAdminAction, fetchCategoryResults, hasNyxarOrAdminAccess } from '../utils/noty-helpers.js'

const router = express.Router()

const voteLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    statusCode: 429,
    message: { error: 'Trop de votes, réessayez dans quelques minutes' }
})

// GET mon vote pour une catégorie
router.get('/categories/:id/my-vote', verifyToken, async (req, res) => {
    try {
        const { id } = req.params
        const userId = req.userId
        const campaignId = req.query.campaign_id

        let query = `SELECT id, first_choice, second_choice, third_choice FROM votes WHERE user_id = ? AND category_id = ? AND is_deleted = 0`
        const params = [userId, id]

        if (campaignId) {
            query += ' AND noty_campaign_id = ?'
            params.push(campaignId)
        }

        const [vote] = await pool.query(query, params)

        if (vote.length === 0) {
            return res.json(null)
        }

        res.json(vote[0])
    } catch (error) {
        console.error('Erreur récupération vote:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// POST soumettre un vote (Users+)
router.post('/categories/:id/vote', voteLimiter, verifyToken, attachRoleContext, async (req, res) => {
    try {
        const { id } = req.params
        const { first_choice, second_choice, third_choice, noty_campaign_id } = req.body
        const userId = req.userId

        if (!req.roleDetails?.length) {
            return res.status(403).json({ message: 'Accès non autorisé' })
        }

        // Vérifier que la catégorie existe et récupérer le type
        const [category] = await pool.query(
            'SELECT vc.id, vc.nominee_type, vc.visible_by_nyxar FROM voting_categories vc WHERE vc.id = ? AND vc.is_deleted = 0',
            [id]
        )

        if (category.length === 0) {
            return res.status(404).json({ message: 'Catégorie non trouvée' })
        }

        // Catégorie réservée aux Nyxariens
        if (category[0].visible_by_nyxar) {
            if (!hasNyxarOrAdminAccess(req.roleDetails)) {
                return res.status(403).json({ message: 'Accès réservé aux Nyxariens' })
            }
        }

        // Déterminer le campaign_id (depuis le body ou via voting_categories)
        let campaignId = noty_campaign_id || null
        if (!campaignId) {
            const [ccRow] = await pool.query(
                `SELECT vc.noty_campaign_id as campaign_id FROM voting_categories vc
                 JOIN noty_campaign nc ON vc.noty_campaign_id = nc.id
                 WHERE vc.id = ? AND nc.is_deleted = 0 AND nc.end_date >= CURDATE()
                 LIMIT 1`,
                [id]
            )
            if (ccRow.length > 0) campaignId = ccRow[0].campaign_id
        }

        // Vérifier que la campagne est encore ouverte aux votes et non en pause
        if (campaignId) {
            const [camp] = await pool.query(
                'SELECT id, is_paused FROM noty_campaign WHERE id = ? AND is_deleted = 0 AND end_date >= CURDATE()',
                [campaignId]
            )
            if (camp.length === 0) {
                return res.status(403).json({ message: 'Les votes sont clôturés pour cette campagne' })
            }
            if (camp[0].is_paused) {
                return res.status(403).json({ message: 'Les votes sont temporairement suspendus' })
            }
        }

        const nomineeType = category[0].nominee_type || 'player'

        // Rejeter un vote complètement vide
        if (!first_choice && !second_choice && !third_choice) {
            return res.status(400).json({ message: 'Au moins un choix est requis' })
        }

        // Valider les choix selon le type de nominee
        const choiceIds = [first_choice, second_choice, third_choice].filter(Boolean)
        if (choiceIds.length > 0) {
            const validIds = new Set()

            if (nomineeType === 'player') {
                // Joueurs réels (IDs positifs)
                const playerIds = choiceIds.filter(cid => cid > 0)
                if (playerIds.length > 0) {
                    const [validPlayers] = await pool.query(
                        'SELECT id FROM nyxariens WHERE id IN (?) AND is_deleted = 0',
                        [playerIds]
                    )
                    validPlayers.forEach(p => validIds.add(p.id))
                }
                // Personnes custom (IDs négatifs)
                const customIds = choiceIds.filter(cid => cid < 0).map(cid => Math.abs(cid))
                if (customIds.length > 0) {
                    const [validCustom] = await pool.query(
                        'SELECT id FROM custom_nominees WHERE id IN (?) AND category_id = ? AND is_deleted = 0',
                        [customIds, id]
                    )
                    validCustom.forEach(c => validIds.add(-c.id))
                }
            } else {
                const [validEntries] = await pool.query(
                    'SELECT id FROM custom_nominees WHERE id IN (?) AND category_id = ? AND is_deleted = 0',
                    [choiceIds, id]
                )
                validEntries.forEach(e => validIds.add(e.id))
            }

            for (const choiceId of choiceIds) {
                if (!validIds.has(choiceId)) {
                    return res.status(400).json({ message: 'Choix invalide : nominé introuvable' })
                }
            }
        }

        // Enregistrer le vote
        await pool.query(
            `INSERT INTO votes (user_id, category_id, noty_campaign_id, first_choice, second_choice, third_choice)
             VALUES (?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                first_choice = VALUES(first_choice),
                second_choice = VALUES(second_choice),
                third_choice = VALUES(third_choice),
                is_deleted = 0,
                deleted_at = NULL,
                deleted_by = NULL,
                updated_at = CURRENT_TIMESTAMP`,
            [userId, id, campaignId, first_choice || null, second_choice || null, third_choice || null]
        )

        res.status(201).json({ message: 'Vote enregistré' })
    } catch (error) {
        console.error('Erreur enregistrement vote:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// DELETE - Retirer son propre vote sur une catégorie (utilisateur)
router.delete('/categories/:id/vote', verifyToken, async (req, res) => {
    try {
        const { id } = req.params
        const userId = req.userId
        const campaignId = req.query.campaign_id || null

        // Vérifier que la campagne est encore ouverte
        if (campaignId) {
            const [camp] = await pool.query(
                'SELECT id FROM noty_campaign WHERE id = ? AND is_deleted = 0 AND end_date >= CURDATE()',
                [campaignId]
            )
            if (camp.length === 0) {
                return res.status(403).json({ message: 'Les votes sont clôturés pour cette campagne' })
            }
        }

        let query = `UPDATE votes SET is_deleted = 1, deleted_at = NOW(), deleted_by = ?
                     WHERE user_id = ? AND category_id = ? AND is_deleted = 0`
        const params = [userId, userId, id]

        if (campaignId) {
            query += ' AND noty_campaign_id = ?'
            params.push(campaignId)
        }

        const [result] = await pool.query(query, params)

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Aucun vote trouvé pour cette catégorie' })
        }

        res.json({ message: 'Vote retiré' })
    } catch (error) {
        console.error('Erreur retrait vote:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// GET résultats pour une catégorie (Admin + Nyxar)
router.get('/categories/:id/results', verifyToken, attachRoleContext, async (req, res) => {
    try {
        const { id } = req.params
        const roleDetails = req.roleDetails || []

        if (!hasNyxarOrAdminAccess(roleDetails)) {
            return res.status(403).json({ message: 'Accès non autorisé' })
        }

        // Récupérer le type de nominee
        const [catRow] = await pool.query(
            'SELECT nominee_type FROM voting_categories WHERE id = ? AND is_deleted = 0',
            [id]
        )
        const nomineeType = catRow.length > 0 ? (catRow[0].nominee_type || 'player') : 'player'

        const results = await fetchCategoryResults(id, nomineeType)
        res.json(results)
    } catch (error) {
        console.error('Erreur récupération résultats:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// GET - Votes détaillés d'une catégorie (admin : qui a voté quoi)
router.get('/categories/:id/votes-detail', verifyToken, requireAdminFull, async (req, res) => {
    try {
        const categoryId = req.params.id

        const [catRow] = await pool.query(
            'SELECT nominee_type, title FROM voting_categories WHERE id = ? AND is_deleted = 0',
            [categoryId]
        )
        if (catRow.length === 0) return res.status(404).json({ message: 'Catégorie non trouvée' })

        const nomineeType = catRow[0].nominee_type || 'player'

        let votes
        if (nomineeType === 'player') {
            // Dual JOINs : joueurs réels (IDs positifs) + personnes custom (IDs négatifs)
            [votes] = await pool.query(
                `SELECT v.id as vote_id, v.user_id, u.username as voter_pseudo,
                        v.first_choice, v.second_choice, v.third_choice,
                        COALESCE(n1.pseudo, cn1.title) as first_name,
                        COALESCE(n1.image_url, cn1.media_url) as first_image,
                        COALESCE(n2.pseudo, cn2.title) as second_name,
                        COALESCE(n2.image_url, cn2.media_url) as second_image,
                        COALESCE(n3.pseudo, cn3.title) as third_name,
                        COALESCE(n3.image_url, cn3.media_url) as third_image,
                        v.created_at
                 FROM votes v
                 JOIN users u ON v.user_id = u.id
                 LEFT JOIN nyxariens n1 ON v.first_choice > 0 AND v.first_choice = n1.id
                 LEFT JOIN custom_nominees cn1 ON v.first_choice < 0 AND -v.first_choice = cn1.id
                 LEFT JOIN nyxariens n2 ON v.second_choice > 0 AND v.second_choice = n2.id
                 LEFT JOIN custom_nominees cn2 ON v.second_choice < 0 AND -v.second_choice = cn2.id
                 LEFT JOIN nyxariens n3 ON v.third_choice > 0 AND v.third_choice = n3.id
                 LEFT JOIN custom_nominees cn3 ON v.third_choice < 0 AND -v.third_choice = cn3.id
                 WHERE v.category_id = ? AND v.is_deleted = 0
                 ORDER BY v.created_at DESC`,
                [categoryId]
            )
        } else {
            [votes] = await pool.query(
                `SELECT v.id as vote_id, v.user_id, u.username as voter_pseudo,
                        v.first_choice, v.second_choice, v.third_choice,
                        n1.title as first_name, n1.media_url as first_image,
                        n2.title as second_name, n2.media_url as second_image,
                        n3.title as third_name, n3.media_url as third_image,
                        v.created_at
                 FROM votes v
                 JOIN users u ON v.user_id = u.id
                 LEFT JOIN custom_nominees n1 ON v.first_choice = n1.id
                 LEFT JOIN custom_nominees n2 ON v.second_choice = n2.id
                 LEFT JOIN custom_nominees n3 ON v.third_choice = n3.id
                 WHERE v.category_id = ? AND v.is_deleted = 0
                 ORDER BY v.created_at DESC`,
                [categoryId]
            )
        }

        res.json(votes)
    } catch (error) {
        console.error('Erreur récupération votes détaillés:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// DELETE - Supprimer un vote (admin) — soft delete
router.delete('/votes/:id', verifyToken, requireAdminFull, async (req, res) => {
    try {
        const voteId = req.params.id
        const adminId = req.userId

        const [voteRows] = await pool.query(
            'SELECT category_id, user_id FROM votes WHERE id = ? AND is_deleted = 0',
            [voteId]
        )

        const [result] = await pool.query(
            'UPDATE votes SET is_deleted = 1, deleted_at = NOW(), deleted_by = ? WHERE id = ? AND is_deleted = 0',
            [adminId, voteId]
        )
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Vote non trouvé' })
        }

        const voteDetails = voteRows.length > 0
            ? { category_id: voteRows[0].category_id, user_id: voteRows[0].user_id }
            : null
        await logAdminAction(req.user.id, 'vote_delete', 'vote', Number(voteId), voteDetails)

        res.json({ message: 'Vote supprimé' })
    } catch (error) {
        console.error('Erreur suppression vote:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

export default router
