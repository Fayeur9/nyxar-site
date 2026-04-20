import express from 'express'
import pool from '../db.js'
import { verifyToken, requireAdminFull, requireNyxarOrAdmin } from '../middleware/auth.js'
import { hasRole } from '../utils/roles.js'
import { logAdminAction, moveFromTemp, fetchCategoryResultsBatch, pointsColumns } from '../utils/noty-helpers.js'

const router = express.Router()

// Valide la cohérence des dates d'une campagne. Retourne un message d'erreur ou null.
function validateCampaignDates(start_date, end_date, results_end_date) {
    if (!start_date || !end_date) return 'Les dates de début et de fin sont requises'
    const start = new Date(start_date)
    const end = new Date(end_date)
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 'Format de date invalide'
    if (end <= start) return 'La date de fin doit être postérieure à la date de début'
    if (results_end_date) {
        const resultsEnd = new Date(results_end_date)
        if (isNaN(resultsEnd.getTime())) return 'Format de date invalide pour la fin des résultats'
        if (resultsEnd < end) return 'La date de fin des résultats doit être postérieure ou égale à la fin des votes'
    }
    return null
}

// GET - Vérifier s'il y a une campagne NOTY active (publique)
// Une campagne est visible tant que results_end_date (ou end_date si pas définie) n'est pas dépassée
router.get('/active', async (req, res) => {
    try {
        const [campaigns] = await pool.query(
            `SELECT id, title, image_url, start_date, end_date, results_end_date
             FROM noty_campaign
             WHERE is_deleted = 0
               AND start_date <= CURDATE()
               AND COALESCE(results_end_date, end_date) >= CURDATE()
             ORDER BY start_date DESC
             LIMIT 1`
        )

        if (campaigns.length === 0) {
            return res.json({ hasActiveCampaign: false, campaign: null })
        }

        // Indiquer si les votes sont encore ouverts ou si on est en période résultats uniquement
        const today = new Date().toISOString().split('T')[0]
        const campaign = campaigns[0]
        const endDate = new Date(campaign.end_date).toISOString().split('T')[0]
        const votingOpen = endDate >= today
        const resultsPhase = !votingOpen

        res.json({ hasActiveCampaign: true, campaign, votingOpen, resultsPhase })
    } catch (error) {
        console.error('Erreur vérification campagne active:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// GET - Vérifier s'il existe des campagnes terminées (pour afficher le lien Hall of Fame)
router.get('/has-past-campaigns', async (req, res) => {
    try {
        const [[result]] = await pool.query(
            `SELECT COUNT(*) as count FROM noty_campaign
             WHERE is_deleted = 0 AND end_date < CURDATE()`
        )
        res.json({ hasPastCampaigns: result.count > 0 })
    } catch (error) {
        console.error('Erreur vérification campagnes passées:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// GET - Lister toutes les campagnes (admin)
router.get('/campaigns', verifyToken, requireAdminFull, async (req, res) => {
    try {
        const [campaigns] = await pool.query(
            `SELECT id, title, image_url, card_background_url, start_date, end_date, results_end_date, created_at
             FROM noty_campaign WHERE is_deleted = 0 ORDER BY start_date DESC`
        )

        res.json(campaigns)
    } catch (error) {
        console.error('Erreur récupération campagnes:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// GET - Détails d'une campagne par ID
router.get('/campaigns/:id', verifyToken, requireAdminFull, async (req, res) => {
    try {
        const [campaign] = await pool.query(
            `SELECT id, title, image_url, card_background_url, start_date, end_date, results_end_date, created_at
             FROM noty_campaign WHERE id = ? AND is_deleted = 0`,
            [req.params.id]
        )

        if (campaign.length === 0) {
            return res.status(404).json({ message: 'Campagne non trouvée' })
        }

        res.json(campaign[0])
    } catch (error) {
        console.error('Erreur récupération campagne:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// POST - Créer une campagne
router.post('/campaigns', verifyToken, requireAdminFull, async (req, res) => {
    try {
        const { title, start_date, end_date, results_end_date, force_close, image_url, card_background_url } = req.body

        if (!title || !start_date || !end_date) {
            return res.status(400).json({ message: 'Données manquantes' })
        }

        const dateError = validateCampaignDates(start_date, end_date, results_end_date)
        if (dateError) return res.status(400).json({ message: dateError })

        // Vérifier s'il existe une campagne non clôturée
        const [activeCampaigns] = await pool.query(
            `SELECT id, title, start_date, end_date, results_end_date
             FROM noty_campaign
             WHERE is_deleted = 0 AND end_date >= CURDATE()
             ORDER BY start_date DESC`
        )

        if (activeCampaigns.length > 0 && !force_close) {
            return res.status(409).json({
                conflict: true,
                conflictingCampaign: activeCampaigns[0]
            })
        }

        // Forcer la clôture de toutes les campagnes en cours
        if (activeCampaigns.length > 0 && force_close) {
            const yesterday = new Date()
            yesterday.setDate(yesterday.getDate() - 1)
            const yesterdayStr = yesterday.toISOString().split('T')[0]

            const ids = activeCampaigns.map(c => c.id)
            await pool.query(
                `UPDATE noty_campaign SET end_date = ? WHERE id IN (?)`,
                [yesterdayStr, ids]
            )
        }

        const [result] = await pool.query(
            `INSERT INTO noty_campaign (title, image_url, card_background_url, start_date, end_date, results_end_date) VALUES (?, ?, ?, ?, ?, ?)`,
            [title, image_url || null, card_background_url || null, start_date, end_date, results_end_date || null]
        )

        const campaignId = result.insertId

        // Déplacer les fichiers uploadés depuis temp vers le dossier de la campagne
        let finalImageUrl = image_url || null
        let finalCardBgUrl = card_background_url || null

        if (finalImageUrl && finalImageUrl.includes('/noty/campaign/temp/')) {
            finalImageUrl = moveFromTemp(finalImageUrl, 'noty/campaign', campaignId)
        }
        if (finalCardBgUrl && finalCardBgUrl.includes('/noty/campaign/temp/')) {
            finalCardBgUrl = moveFromTemp(finalCardBgUrl, 'noty/campaign', campaignId)
        }

        // Mettre à jour les URLs en base si elles ont changé
        if (finalImageUrl !== (image_url || null) || finalCardBgUrl !== (card_background_url || null)) {
            await pool.query(
                'UPDATE noty_campaign SET image_url = ?, card_background_url = ? WHERE id = ?',
                [finalImageUrl, finalCardBgUrl, campaignId]
            )
        }

        await logAdminAction(req.user.id, 'campaign_create', 'campaign', campaignId, { title })

        res.status(201).json({
            id: campaignId,
            title,
            image_url: finalImageUrl,
            card_background_url: finalCardBgUrl,
            start_date,
            end_date,
            results_end_date: results_end_date || null,
            is_deleted: 0
        })
    } catch (error) {
        console.error('Erreur création campagne:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// PUT - Modifier une campagne
router.put('/campaigns/:id', verifyToken, requireAdminFull, async (req, res) => {
    try {
        const { title, start_date, end_date, results_end_date, image_url, card_background_url } = req.body

        if (!title || !start_date || !end_date) {
            return res.status(400).json({ message: 'Données manquantes' })
        }

        const dateError = validateCampaignDates(start_date, end_date, results_end_date)
        if (dateError) return res.status(400).json({ message: dateError })

        const [campaign] = await pool.query(
            `SELECT id FROM noty_campaign WHERE id = ? AND is_deleted = 0`,
            [req.params.id]
        )

        if (campaign.length === 0) {
            return res.status(404).json({ message: 'Campagne non trouvée' })
        }

        const campaignId = parseInt(req.params.id)

        // Déplacer les fichiers uploadés depuis temp vers le dossier de la campagne
        let finalImageUrl = image_url || null
        let finalCardBgUrl = card_background_url || null

        if (finalImageUrl && finalImageUrl.includes('/noty/campaign/temp/')) {
            finalImageUrl = moveFromTemp(finalImageUrl, 'noty/campaign', campaignId)
        }
        if (finalCardBgUrl && finalCardBgUrl.includes('/noty/campaign/temp/')) {
            finalCardBgUrl = moveFromTemp(finalCardBgUrl, 'noty/campaign', campaignId)
        }

        await pool.query(
            `UPDATE noty_campaign SET title = ?, image_url = ?, card_background_url = ?, start_date = ?, end_date = ?, results_end_date = ? WHERE id = ?`,
            [title, finalImageUrl, finalCardBgUrl, start_date, end_date, results_end_date || null, campaignId]
        )

        await logAdminAction(req.user.id, 'campaign_update', 'campaign', campaignId, { title })

        res.json({
            id: campaignId,
            title,
            image_url: finalImageUrl,
            card_background_url: finalCardBgUrl,
            start_date,
            end_date,
            results_end_date: results_end_date || null
        })
    } catch (error) {
        console.error('Erreur modification campagne:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// DELETE - Supprimer une campagne (soft delete)
router.delete('/campaigns/:id', verifyToken, requireAdminFull, async (req, res) => {
    try {
        const [campaign] = await pool.query(
            `SELECT id FROM noty_campaign WHERE id = ? AND is_deleted = 0`,
            [req.params.id]
        )

        if (campaign.length === 0) {
            return res.status(404).json({ message: 'Campagne non trouvée' })
        }

        const campaignId = parseInt(req.params.id)

        await pool.query(
            `UPDATE noty_campaign SET is_deleted = 1 WHERE id = ?`,
            [campaignId]
        )

        await logAdminAction(req.user.id, 'campaign_delete', 'campaign', campaignId, null)

        res.json({ message: 'Campagne supprimée' })
    } catch (error) {
        console.error('Erreur suppression campagne:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// PATCH - Toggle pause/reprise des votes d'une campagne
router.patch('/campaigns/:id/toggle-pause', verifyToken, requireAdminFull, async (req, res) => {
    try {
        const { id } = req.params

        const [campaign] = await pool.query(
            `SELECT id, is_paused FROM noty_campaign WHERE id = ? AND is_deleted = 0`,
            [id]
        )

        if (campaign.length === 0) {
            return res.status(404).json({ message: 'Campagne non trouvée' })
        }

        const newValue = campaign[0].is_paused ? 0 : 1

        await pool.query(
            `UPDATE noty_campaign SET is_paused = ? WHERE id = ?`,
            [newValue, id]
        )

        await logAdminAction(req.user.id, 'campaign_toggle_pause', 'campaign', Number(id), { is_paused: newValue })

        res.json({ id: Number(id), is_paused: newValue })
    } catch (error) {
        console.error('Erreur toggle pause campagne:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// GET - Catégories importables dans une campagne (non encore liées)
router.get('/campaigns/:id/importable-categories', verifyToken, requireAdminFull, async (req, res) => {
    try {
        const campaignId = req.params.id

        const [categories] = await pool.query(
            `SELECT vc.id, vc.title, vc.image_url, vc.nominee_type, vc.description,
                    nc.title as origin_campaign, nc.id as origin_campaign_id
             FROM voting_categories vc
             LEFT JOIN noty_campaign nc ON vc.noty_campaign_id = nc.id AND nc.is_deleted = 0
             WHERE vc.is_deleted = 0
               AND vc.noty_campaign_id != ?
             ORDER BY vc.title ASC`,
            [campaignId]
        )

        res.json(categories)
    } catch (error) {
        console.error('Erreur récupération catégories importables:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// POST - Importer des catégories dans une campagne
router.post('/campaigns/:id/import-categories', verifyToken, requireAdminFull, async (req, res) => {
    try {
        const campaignId = req.params.id
        const { category_ids } = req.body

        if (!category_ids || !Array.isArray(category_ids) || category_ids.length === 0) {
            return res.status(400).json({ message: 'category_ids requis (tableau non vide)' })
        }

        // Vérifier que la campagne existe
        const [campaign] = await pool.query(
            'SELECT id FROM noty_campaign WHERE id = ? AND is_deleted = 0',
            [campaignId]
        )
        if (campaign.length === 0) {
            return res.status(404).json({ message: 'Campagne non trouvée' })
        }

        // Vérifier que les catégories source existent et ne font pas déjà partie de la campagne cible
        const [sourceCats] = await pool.query(
            `SELECT id, title, description, image_url, game_id, nominee_type, visible_by_nyxar, display_order
             FROM voting_categories
             WHERE id IN (?) AND is_deleted = 0 AND noty_campaign_id != ?`,
            [category_ids.map(Number), parseInt(campaignId)]
        )

        if (sourceCats.length === 0) {
            return res.status(400).json({ message: 'Aucune catégorie valide à importer' })
        }

        // Copier chaque catégorie dans la campagne cible (nouvelle ligne avec noty_campaign_id = campaignId)
        let imported = 0
        for (const cat of sourceCats) {
            await pool.query(
                `INSERT INTO voting_categories (title, description, image_url, game_id, nominee_type, noty_campaign_id, visible_by_nyxar, display_order)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [cat.title, cat.description, cat.image_url, cat.game_id, cat.nominee_type, parseInt(campaignId), cat.visible_by_nyxar, cat.display_order]
            )
            imported++
        }

        res.status(201).json({
            message: `${imported} catégorie(s) importée(s)`,
            imported
        })
    } catch (error) {
        console.error('Erreur import catégories:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// GET - Résultats détaillés d'une campagne (votes avec calcul de points)
router.get('/campaigns/:id/results', verifyToken, requireNyxarOrAdmin, async (req, res) => {
    try {
        const campaignId = req.params.id
        const roleDetails = req.roleDetails || []
        const isAdmin = hasRole(roleDetails, 'admin')

        // Vérifier que la campagne existe
        const [campaign] = await pool.query(
            `SELECT id FROM noty_campaign WHERE id = ? AND is_deleted = 0`,
            [campaignId]
        )

        if (campaign.length === 0) {
            return res.status(404).json({ message: 'Campagne non trouvée' })
        }

        // Récupérer toutes les catégories de la campagne
        const [categories] = await pool.query(
            `SELECT vc.id, vc.title, vc.image_url, vc.nominee_type, vc.game_id, vc.visible_by_nyxar, vc.display_order,
                    g.name as game_name, g.color as game_color
             FROM voting_categories vc
             LEFT JOIN games g ON vc.game_id = g.id
             WHERE vc.noty_campaign_id = ? AND vc.is_deleted = 0
             ORDER BY vc.display_order ASC`,
            [campaignId]
        )

        // Batch : toutes les catégories en 2-3 requêtes au lieu de N
        const resultsMap = await fetchCategoryResultsBatch(categories, campaignId)
        const results = categories.map(category => ({
            id: category.id,
            title: category.title,
            image_url: category.image_url,
            nominee_type: category.nominee_type || 'player',
            game_id: category.game_id,
            game_name: category.game_name,
            game_color: category.game_color,
            visible_by_nyxar: category.visible_by_nyxar,
            display_order: category.display_order,
            nominees: (resultsMap[category.id] || []).map(n => ({
                id: n.id,
                pseudo: n.pseudo,
                image_url: n.image_url,
                points: parseFloat(n.total_points || 0),
                first_count: n.first_count || 0,
                second_count: n.second_count || 0,
                third_count: n.third_count || 0,
                vote_count: n.vote_count || 0
            }))
        }))

        res.json(results)
    } catch (error) {
        console.error('Erreur récupération résultats campagne:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// GET - Statistiques détaillées d'une campagne (dashboard admin)
router.get('/campaigns/:id/stats', verifyToken, requireAdminFull, async (req, res) => {
    try {
        const campaignId = req.params.id

        // Vérifier que la campagne existe
        const [campaignRows] = await pool.query(
            `SELECT id, title, image_url, card_background_url, start_date, end_date, results_end_date
             FROM noty_campaign WHERE id = ? AND is_deleted = 0`,
            [campaignId]
        )

        if (campaignRows.length === 0) {
            return res.status(404).json({ message: 'Campagne non trouvée' })
        }

        const campaign = campaignRows[0]
        const now = new Date()
        const start = new Date(campaign.start_date)
        const end = new Date(campaign.end_date)
        const totalDuration = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)))
        const elapsed = Math.ceil((now - start) / (1000 * 60 * 60 * 24))
        const progressPercent = Math.min(100, Math.max(0, Math.round((elapsed / totalDuration) * 100)))
        const daysRemaining = Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)))

        // Nombre total de catégories
        const [catRows] = await pool.query(
            `SELECT COUNT(*) as count
             FROM voting_categories vc
             WHERE vc.noty_campaign_id = ? AND vc.is_deleted = 0`,
            [campaignId]
        )
        const totalCategories = catRows[0].count

        // Nombre total de nominés (joueurs + custom)
        const [nomRows] = await pool.query(
            `SELECT
                (SELECT COUNT(DISTINCT vcn.player_id)
                 FROM voting_categories_nominees vcn
                 JOIN voting_categories vc ON vcn.category_id = vc.id
                 WHERE vc.noty_campaign_id = ? AND vcn.is_deleted = 0 AND vc.is_deleted = 0) +
                (SELECT COUNT(*)
                 FROM custom_nominees cn
                 JOIN voting_categories vc ON cn.category_id = vc.id
                 WHERE vc.noty_campaign_id = ? AND cn.is_deleted = 0 AND vc.is_deleted = 0) as count`,
            [campaignId, campaignId]
        )
        const totalNominees = nomRows[0].count

        // Nombre total de votes et votants
        const [voteRows] = await pool.query(
            `SELECT COUNT(*) as totalVotes, COUNT(DISTINCT user_id) as totalVoters
             FROM votes WHERE noty_campaign_id = ? AND is_deleted = 0`,
            [campaignId]
        )
        const totalVotes = voteRows[0].totalVotes
        const totalVoters = voteRows[0].totalVoters

        // Nombre total d'utilisateurs pour le taux de participation
        const [userCountRows] = await pool.query(
            `SELECT COUNT(*) as count FROM users WHERE is_deleted = 0`
        )
        const totalUsers = Math.max(1, userCountRows[0].count)
        const participationRate = Math.round((totalVoters / totalUsers) * 100)

        const avgCategoriesPerVoter = totalVoters > 0
            ? (totalVotes / totalVoters).toFixed(1)
            : '0'
        const avgVotesPerCategory = totalCategories > 0
            ? (totalVotes / totalCategories).toFixed(1)
            : '0'

        // --- Charts ---

        // Votes par jour
        const [votesPerDay] = await pool.query(
            `SELECT DATE(created_at) as date, COUNT(*) as count
             FROM votes WHERE noty_campaign_id = ? AND is_deleted = 0
             GROUP BY DATE(created_at)
             ORDER BY date`,
            [campaignId]
        )

        // Votants par catégorie
        const [votersPerCategory] = await pool.query(
            `SELECT vc.id, vc.title, COUNT(DISTINCT v.user_id) as voters_count
             FROM voting_categories vc
             LEFT JOIN votes v ON v.category_id = vc.id AND v.noty_campaign_id = ? AND v.is_deleted = 0
             WHERE vc.noty_campaign_id = ? AND vc.is_deleted = 0
             GROUP BY vc.id
             ORDER BY voters_count DESC`,
            [campaignId, campaignId]
        )

        // Votes par jour de la semaine
        const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
        const [votesByDowRaw] = await pool.query(
            `SELECT DAYOFWEEK(created_at) as dow, COUNT(*) as count
             FROM votes WHERE noty_campaign_id = ? AND is_deleted = 0
             GROUP BY dow ORDER BY dow`,
            [campaignId]
        )
        const votesByDayOfWeek = votesByDowRaw.map(row => ({
            day_of_week: row.dow,
            day_name: dayNames[row.dow - 1] || '',
            count: row.count
        }))

        // Votes par heure
        const [votesByHour] = await pool.query(
            `SELECT HOUR(created_at) as hour, COUNT(*) as count
             FROM votes WHERE noty_campaign_id = ? AND is_deleted = 0
             GROUP BY hour ORDER BY hour`,
            [campaignId]
        )

        // Distribution des choix
        const [distRows] = await pool.query(
            `SELECT
                SUM(CASE WHEN first_choice IS NOT NULL THEN 1 ELSE 0 END) as first_choices,
                SUM(CASE WHEN second_choice IS NOT NULL THEN 1 ELSE 0 END) as second_choices,
                SUM(CASE WHEN third_choice IS NOT NULL THEN 1 ELSE 0 END) as third_choices
             FROM votes WHERE noty_campaign_id = ? AND is_deleted = 0`,
            [campaignId]
        )
        const pointsDistribution = {
            first_choices: distRows[0].first_choices || 0,
            second_choices: distRows[0].second_choices || 0,
            third_choices: distRows[0].third_choices || 0
        }

        // Top 10 nominés global (joueurs uniquement — les custom nominees sont spécifiques par catégorie)
        const [playerCatIds] = await pool.query(
            `SELECT vc.id FROM voting_categories vc
             WHERE vc.noty_campaign_id = ? AND vc.is_deleted = 0 AND (vc.nominee_type = 'player' OR vc.nominee_type IS NULL)`,
            [campaignId]
        )
        const playerCategoryIds = playerCatIds.map(r => r.id)

        let topNominees = []
        if (playerCategoryIds.length > 0) {
            const [rows] = await pool.query(
                `SELECT p.id, p.pseudo, p.image_url, ${pointsColumns('p.id')}
                 FROM nyxariens p
                 JOIN votes v ON v.noty_campaign_id = ? AND v.category_id IN (?)
                    AND (v.first_choice = p.id OR v.second_choice = p.id OR v.third_choice = p.id)
                 WHERE p.is_deleted = 0
                 GROUP BY p.id
                 ORDER BY total_points DESC, first_count DESC, second_count DESC, third_count DESC
                 LIMIT 10`,
                [campaignId, playerCategoryIds]
            )
            topNominees = rows
        }

        // --- Alerts ---

        // Catégories sans vote
        const [categoriesWithoutVotes] = await pool.query(
            `SELECT vc.id, vc.title
             FROM voting_categories vc
             LEFT JOIN votes v ON v.category_id = vc.id AND v.noty_campaign_id = ?
             WHERE vc.noty_campaign_id = ? AND vc.is_deleted = 0
             GROUP BY vc.id
             HAVING COUNT(v.id) = 0`,
            [campaignId, campaignId]
        )

        // Compétitions serrées (écart < 2 pts entre 1er et 2ème)
        const [allCategories] = await pool.query(
            `SELECT vc.id, vc.title, vc.nominee_type
             FROM voting_categories vc
             WHERE vc.noty_campaign_id = ? AND vc.is_deleted = 0`,
            [campaignId]
        )

        // Batch : toutes les catégories en 2-3 requêtes au lieu de N
        const allCatResultsMap = await fetchCategoryResultsBatch(allCategories, campaignId)
        const closeCompetitions = allCategories.map(cat => {
            const top2 = (allCatResultsMap[cat.id] || []).slice(0, 2)
            if (top2.length >= 2) {
                const gap = parseFloat(top2[0].total_points || 0) - parseFloat(top2[1].total_points || 0)
                if (gap < 2 && gap >= 0) {
                    return { id: cat.id, title: cat.title, first_name: top2[0].pseudo, gap: gap.toFixed(1) }
                }
            }
            return null
        }).filter(Boolean)

        // --- Engagement ---

        // Votants les plus actifs
        const [mostActiveVoters] = await pool.query(
            `SELECT u.id, u.username, COUNT(DISTINCT v.category_id) as categories_voted
             FROM votes v
             JOIN users u ON v.user_id = u.id
             WHERE v.noty_campaign_id = ? AND v.is_deleted = 0
             GROUP BY u.id
             ORDER BY categories_voted DESC
             LIMIT 10`,
            [campaignId]
        )

        res.json({
            overview: {
                progressPercent,
                daysRemaining,
                totalVoters,
                totalVotes,
                totalCategories,
                totalNominees,
                participationRate,
                avgCategoriesPerVoter,
                avgVotesPerCategory
            },
            charts: {
                votesPerDay,
                votersPerCategory,
                votesByDayOfWeek,
                votesByHour,
                pointsDistribution,
                topNominees: topNominees.map(n => ({
                    ...n,
                    total_points: parseFloat(n.total_points || 0),
                    vote_count: n.vote_count || 0
                }))
            },
            alerts: {
                categoriesWithoutVotes,
                closeCompetitions
            },
            engagement: {
                mostActiveVoters
            }
        })
    } catch (error) {
        console.error('Erreur récupération stats campagne:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// GET - Résultats complets d'une campagne (accessible Nyxar+ pendant phase résultats)
router.get('/campaigns/:id/public-results', verifyToken, requireNyxarOrAdmin, async (req, res) => {
    try {
        const campaignId = req.params.id
        const roleDetails = req.roleDetails || []

        const [campaign] = await pool.query(
            `SELECT id, end_date, results_end_date FROM noty_campaign WHERE id = ? AND is_deleted = 0`,
            [campaignId]
        )
        if (campaign.length === 0) return res.status(404).json({ message: 'Campagne non trouvée' })

        const now = new Date()
        const endDate = new Date(campaign[0].end_date)
        const isAdmin = hasRole(roleDetails, 'admin')
        if (!isAdmin && now < endDate) {
            return res.status(403).json({ message: 'Les résultats ne sont pas encore disponibles' })
        }

        const [categories] = await pool.query(
            `SELECT vc.id, vc.title, vc.image_url, vc.nominee_type, vc.display_order
             FROM voting_categories vc
             WHERE vc.noty_campaign_id = ? AND vc.is_deleted = 0
             ORDER BY vc.display_order ASC`,
            [campaignId]
        )

        // Batch : toutes les catégories en 2-3 requêtes au lieu de N
        const resultsMap = await fetchCategoryResultsBatch(categories, campaignId)
        const results = categories.map(category => ({
            id: category.id,
            title: category.title,
            nominees: (resultsMap[category.id] || []).map(n => ({
                id: n.id,
                pseudo: n.pseudo,
                image_url: n.image_url,
                points: parseFloat(n.total_points || 0),
                first_count: n.first_count || 0,
                second_count: n.second_count || 0,
                third_count: n.third_count || 0,
                vote_count: n.vote_count || 0
            }))
        }))

        res.json(results)
    } catch (error) {
        console.error('Erreur récupération résultats publics:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// PUT - Réordonner les catégories d'une campagne
router.put('/campaigns/:id/reorder-categories', verifyToken, requireAdminFull, async (req, res) => {
    try {
        const campaignId = req.params.id
        const { category_ids } = req.body

        if (!Array.isArray(category_ids) || category_ids.length === 0) {
            return res.status(400).json({ message: 'category_ids requis (tableau d\'IDs)' })
        }

        // Vérifier que la campagne existe
        const [campaign] = await pool.query(
            `SELECT id FROM noty_campaign WHERE id = ? AND is_deleted = 0`,
            [campaignId]
        )
        if (campaign.length === 0) {
            return res.status(404).json({ message: 'Campagne non trouvée' })
        }

        // Vérifier que toutes les catégories appartiennent bien à cette campagne
        const [linkedCats] = await pool.query(
            'SELECT id as category_id FROM voting_categories WHERE noty_campaign_id = ? AND is_deleted = 0',
            [campaignId]
        )
        const linkedIds = new Set(linkedCats.map(c => c.category_id))
        const invalidIds = category_ids.filter(id => !linkedIds.has(id))
        if (invalidIds.length > 0) {
            return res.status(400).json({ message: 'Certaines catégories n\'appartiennent pas à cette campagne' })
        }

        // Mettre à jour display_order pour chaque catégorie
        const conn = await pool.getConnection()
        try {
            await conn.beginTransaction()
            for (let i = 0; i < category_ids.length; i++) {
                await conn.query(
                    `UPDATE voting_categories SET display_order = ? WHERE id = ?`,
                    [i, category_ids[i]]
                )
            }
            await conn.commit()
        } catch (err) {
            await conn.rollback()
            throw err
        } finally {
            conn.release()
        }

        res.json({ message: 'Ordre mis à jour' })
    } catch (error) {
        console.error('Erreur réorganisation catégories:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// GET - Exporter les résultats d'une campagne en CSV
router.get('/campaigns/:id/export-csv', verifyToken, requireAdminFull, async (req, res) => {
    try {
        const campaignId = req.params.id

        // Récupérer la campagne
        const [campaignRows] = await pool.query(
            `SELECT id, title FROM noty_campaign WHERE id = ? AND is_deleted = 0`,
            [campaignId]
        )
        if (campaignRows.length === 0) {
            return res.status(404).json({ message: 'Campagne non trouvée' })
        }
        const campaign = campaignRows[0]

        // Récupérer toutes les catégories de la campagne
        const [categories] = await pool.query(
            `SELECT vc.id, vc.title, vc.nominee_type
             FROM voting_categories vc
             WHERE vc.noty_campaign_id = ? AND vc.is_deleted = 0
             ORDER BY vc.display_order ASC`,
            [campaignId]
        )

        // Construire le CSV — 1 ligne par catégorie, 6 nominés en colonnes
        const BOM = '\uFEFF'
        const escapeCsv = (val) => `"${String(val).replace(/"/g, '""')}"`

        // Header : Catégorie, puis pour chaque rang 1-6 les colonnes Rang/Nominé/Points/Votes/1ère/2ème/3ème
        const headerParts = ['Catégorie']
        for (let i = 1; i <= 6; i++) {
            headerParts.push(`Rang ${i}`, `Nominé ${i}`, `Points ${i}`, `Votes ${i}`, `1ère ${i}`, `2ème ${i}`, `3ème ${i}`)
        }
        const header = headerParts.join(',')
        const rows = []

        // Batch : toutes les catégories en 2-3 requêtes au lieu de N
        const csvResultsMap = await fetchCategoryResultsBatch(categories, campaignId)

        for (const cat of categories) {
            const ranked = csvResultsMap[cat.id] || []
            const top6 = ranked.slice(0, 6)

            const cols = [escapeCsv(cat.title)]
            for (let i = 0; i < 6; i++) {
                if (top6[i]) {
                    const n = top6[i]
                    cols.push(
                        i + 1,
                        escapeCsv(n.pseudo),
                        parseFloat(n.total_points || 0),
                        n.vote_count || 0,
                        n.first_count || 0,
                        n.second_count || 0,
                        n.third_count || 0
                    )
                } else {
                    cols.push(i + 1, '', '', '', '', '', '')
                }
            }
            rows.push(cols.join(','))
        }

        const csv = BOM + header + '\n' + rows.join('\n')
        const safeTitle = campaign.title.replace(/[^a-zA-Z0-9àâäéèêëïîôùûüçÀÂÄÉÈÊËÏÎÔÙÛÜÇ _-]/g, '').trim()

        res.setHeader('Content-Type', 'text/csv; charset=utf-8')
        res.setHeader('Content-Disposition', `attachment; filename="noty-results-${safeTitle}.csv"`)
        res.send(csv)
    } catch (error) {
        console.error('Erreur export CSV:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// GET - Exporter la liste des votants d'une campagne en CSV
router.get('/campaigns/:id/voters-export', verifyToken, requireAdminFull, async (req, res) => {
    try {
        const campaignId = req.params.id

        // Vérifier que la campagne existe
        const [campaignRows] = await pool.query(
            `SELECT id, title FROM noty_campaign WHERE id = ? AND is_deleted = 0`,
            [campaignId]
        )
        if (campaignRows.length === 0) {
            return res.status(404).json({ message: 'Campagne non trouvée' })
        }

        // Récupérer les votants avec nombre de catégories distinctes et date du dernier vote
        const [voters] = await pool.query(
            `SELECT u.username, COUNT(DISTINCT v.category_id) as categories_votees, MAX(v.created_at) as dernier_vote
             FROM votes v
             JOIN users u ON v.user_id = u.id
             WHERE v.noty_campaign_id = ? AND v.is_deleted = 0
             GROUP BY v.user_id, u.username
             ORDER BY categories_votees DESC, dernier_vote DESC`,
            [campaignId]
        )

        const BOM = '\uFEFF'
        const escapeCsv = (val) => `"${String(val).replace(/"/g, '""')}"`

        const header = 'username,categories_votees,dernier_vote'
        const rows = voters.map((v) =>
            [escapeCsv(v.username), v.categories_votees, escapeCsv(v.dernier_vote ? new Date(v.dernier_vote).toLocaleString('fr-FR', { timeZone: 'Europe/Paris', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '')].join(',')
        )

        const csv = BOM + header + '\n' + rows.join('\n')

        res.setHeader('Content-Type', 'text/csv; charset=utf-8')
        res.setHeader('Content-Disposition', `attachment; filename="votants-${campaignId}.csv"`)
        res.send(csv)
    } catch (error) {
        console.error('Erreur export votants CSV:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// POST - Dupliquer une campagne avec ses catégories
router.post('/campaigns/:id/duplicate', verifyToken, requireAdminFull, async (req, res) => {
    try {
        const campaignId = req.params.id

        // Récupérer la campagne source
        const [campaignRows] = await pool.query(
            `SELECT id, title FROM noty_campaign WHERE id = ? AND is_deleted = 0`,
            [campaignId]
        )
        if (campaignRows.length === 0) {
            return res.status(404).json({ message: 'Campagne non trouvée' })
        }
        const source = campaignRows[0]

        // Créer la copie (dates vides)
        const newTitle = `${source.title} (copie)`
        const [insertResult] = await pool.query(
            `INSERT INTO noty_campaign (title, start_date, end_date, results_end_date) VALUES (?, CURDATE(), CURDATE(), NULL)`,
            [newTitle]
        )
        const newCampaignId = insertResult.insertId

        // Copier les catégories (structure uniquement, sans les votes ni les nominés)
        const [sourceCategories] = await pool.query(
            `SELECT title, description, image_url, game_id, nominee_type, visible_by_nyxar, display_order
             FROM voting_categories WHERE noty_campaign_id = ? AND is_deleted = 0`,
            [campaignId]
        )

        for (const cat of sourceCategories) {
            await pool.query(
                `INSERT INTO voting_categories (title, description, image_url, game_id, nominee_type, noty_campaign_id, visible_by_nyxar, display_order)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [cat.title, cat.description, cat.image_url, cat.game_id, cat.nominee_type, newCampaignId, cat.visible_by_nyxar, cat.display_order]
            )
        }

        // Récupérer la campagne créée
        const [newCampaign] = await pool.query(
            `SELECT id, title, image_url, card_background_url, start_date, end_date, results_end_date, created_at
             FROM noty_campaign WHERE id = ?`,
            [newCampaignId]
        )

        res.status(201).json({ campaign: newCampaign[0] })
    } catch (error) {
        console.error('Erreur duplication campagne:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// GET - Log d'audit admin (100 dernières actions globales)
router.get('/campaigns/:id/audit-log', verifyToken, requireAdminFull, async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT al.id, al.action, al.target_type, al.target_id, al.details, al.created_at,
                    u.username as admin_username
             FROM admin_audit_log al
             JOIN users u ON al.user_id = u.id
             ORDER BY al.created_at DESC
             LIMIT 100`
        )
        res.json(rows)
    } catch (error) {
        console.error('Erreur récupération audit log:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

export default router
