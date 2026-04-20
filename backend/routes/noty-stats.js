import express from 'express'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import pool from '../db.js'
import { verifyToken, requireNyxarOrAdmin } from '../middleware/auth.js'
import { fetchCategoryResultsBatch, hallOfFameCache, HOF_CACHE_TTL } from '../utils/noty-helpers.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const uploadsBase = path.join(__dirname, '../../frontend/public/uploads')

const router = express.Router()

// GET - Hall of Fame : historique des campagnes terminées avec podium top 3 (public)
router.get('/hall-of-fame', async (req, res) => {
    try {
        const now = Date.now()
        if (hallOfFameCache.data && (now - hallOfFameCache.timestamp) < HOF_CACHE_TTL) {
            res.set('Cache-Control', 'public, max-age=300')
            return res.json(hallOfFameCache.data)
        }

        const [campaigns] = await pool.query(
            `SELECT id, title, image_url, start_date, end_date, results_end_date
             FROM noty_campaign
             WHERE is_deleted = 0 AND end_date < CURDATE()
             ORDER BY start_date DESC`
        )

        if (campaigns.length === 0) {
            hallOfFameCache.data = []
            hallOfFameCache.timestamp = now
            return res.json([])
        }

        // Batch : toutes les catégories de toutes les campagnes en 1 requête
        const campaignIds = campaigns.map(c => c.id)
        const [allCategories] = await pool.query(
            `SELECT vc.id, vc.title, vc.image_url, vc.nominee_type, vc.display_order, vc.noty_campaign_id as campaign_id
             FROM voting_categories vc
             WHERE vc.noty_campaign_id IN (?) AND vc.is_deleted = 0
             ORDER BY vc.display_order ASC`,
            [campaignIds]
        )
        const categoriesByCampaign = {}
        for (const cat of allCategories) {
            if (!categoriesByCampaign[cat.campaign_id]) categoriesByCampaign[cat.campaign_id] = []
            categoriesByCampaign[cat.campaign_id].push(cat)
        }

        // Pour chaque campagne : batch les résultats (2-3 requêtes au lieu de N×M)
        const result = await Promise.all(campaigns.map(async (campaign) => {
            const categories = categoriesByCampaign[campaign.id] || []
            const resultsMap = await fetchCategoryResultsBatch(categories, campaign.id)

            const cardsDir = path.join(uploadsBase, 'noty', 'cards', String(campaign.id))
            const cardsAvailable = fs.existsSync(path.join(cardsDir, 'all.zip'))

            return {
                id: campaign.id,
                title: campaign.title,
                image_url: campaign.image_url,
                start_date: campaign.start_date,
                end_date: campaign.end_date,
                cards_available: cardsAvailable,
                categories: categories.map(cat => {
                    const top = (resultsMap[cat.id] || []).slice(0, 6)
                    return {
                        id: cat.id,
                        title: cat.title,
                        image_url: cat.image_url,
                        nominee_type: cat.nominee_type || 'player',
                        podium: top.map((n, index) => ({
                            rank: index + 1,
                            name: n.pseudo,
                            image_url: n.image_url,
                            total_points: parseFloat(n.total_points || 0),
                            vote_count: n.vote_count || 0,
                            first_count: n.first_count || 0,
                            second_count: n.second_count || 0,
                            third_count: n.third_count || 0
                        }))
                    }
                })
            }
        }))

        hallOfFameCache.data = result
        hallOfFameCache.timestamp = now
        res.set('Cache-Control', 'public, max-age=300')
        res.json(result)
    } catch (error) {
        console.error('Erreur récupération Hall of Fame:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// GET années avec votes (pour le dashboard admin)
router.get('/years', verifyToken, requireNyxarOrAdmin, async (req, res) => {
    try {
        const [years] = await pool.query(
            `SELECT DISTINCT YEAR(created_at) as year
             FROM voting_categories
             WHERE is_deleted = 0
             ORDER BY year DESC`
        )

        const yearsList = years.map(row => row.year).filter(y => y !== null)
        res.json(yearsList)
    } catch (error) {
        console.error('Erreur récupération années:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// GET résultats complets pour une année (pour le dashboard admin)
router.get('/results/:year', verifyToken, requireNyxarOrAdmin, async (req, res) => {
    try {
        const { year } = req.params
        const yearNum = parseInt(year)

        // Récupérer les catégories de cette année
        const [categories] = await pool.query(
            `SELECT id, title, image_url, nominee_type
             FROM voting_categories
             WHERE YEAR(created_at) = ? AND is_deleted = 0
             ORDER BY created_at DESC`,
            [yearNum]
        )

        // Batch : toutes les catégories en 2-3 requêtes au lieu de N
        const resultsMap = await fetchCategoryResultsBatch(categories)
        const results = categories.map(category => {
            const top3 = (resultsMap[category.id] || []).slice(0, 3)
            return {
                id: category.id,
                title: category.title,
                image_url: category.image_url,
                nominee_type: category.nominee_type || 'player',
                top1: top3[0] ? {
                    pseudo: top3[0].pseudo,
                    image_url: top3[0].image_url,
                    points: parseFloat(top3[0].total_points || 0)
                } : null,
                top2: top3[1] ? {
                    pseudo: top3[1].pseudo,
                    image_url: top3[1].image_url,
                    points: parseFloat(top3[1].total_points || 0)
                } : null,
                top3: top3[2] ? {
                    pseudo: top3[2].pseudo,
                    image_url: top3[2].image_url,
                    points: parseFloat(top3[2].total_points || 0)
                } : null
            }
        })

        res.json(results)
    } catch (error) {
        console.error('Erreur récupération résultats:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// GET - Stats live d'une campagne (public, pas d'auth)
router.get('/campaigns/:id/live-stats', async (req, res) => {
    try {
        const campaignId = req.params.id

        // Vérifier que la campagne existe et que les votes sont ouverts
        const [campaignRows] = await pool.query(
            `SELECT id, end_date FROM noty_campaign WHERE id = ? AND is_deleted = 0 AND start_date <= CURDATE()`,
            [campaignId]
        )
        if (campaignRows.length === 0) {
            return res.status(404).json({ message: 'Campagne non trouvée' })
        }

        const today = new Date().toISOString().split('T')[0]
        const endDate = new Date(campaignRows[0].end_date).toISOString().split('T')[0]
        if (endDate < today) {
            return res.json({ total_voters: 0, total_votes: 0, per_category: {} })
        }

        // Stats globales
        const [[globalStats]] = await pool.query(
            `SELECT COUNT(DISTINCT user_id) as total_voters, COUNT(*) as total_votes
             FROM votes WHERE noty_campaign_id = ? AND is_deleted = 0`,
            [campaignId]
        )

        // Votes par catégorie
        const [perCategory] = await pool.query(
            `SELECT vc.id as category_id, COUNT(v.id) as vote_count
             FROM voting_categories vc
             LEFT JOIN votes v ON v.category_id = vc.id AND v.noty_campaign_id = ? AND v.is_deleted = 0
             WHERE vc.noty_campaign_id = ? AND vc.is_deleted = 0
             GROUP BY vc.id`,
            [campaignId, campaignId]
        )

        const perCategoryMap = {}
        for (const row of perCategory) {
            perCategoryMap[row.category_id] = row.vote_count
        }

        res.json({
            total_voters: globalStats.total_voters,
            total_votes: globalStats.total_votes,
            per_category: perCategoryMap
        })
    } catch (error) {
        console.error('Erreur récupération live stats:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// GET - Liste des category_id pour lesquelles l'utilisateur a voté (batch, remplace N requêtes)
router.get('/campaigns/:id/my-votes', verifyToken, async (req, res) => {
    try {
        const campaignId = req.params.id
        const userId = req.user.id

        const [rows] = await pool.query(
            'SELECT category_id FROM votes WHERE user_id = ? AND noty_campaign_id = ? AND is_deleted = 0',
            [userId, campaignId]
        )

        res.json(rows.map(r => r.category_id))
    } catch (error) {
        console.error('Erreur récupération votes batch:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// GET - Progression de vote d'un utilisateur sur une campagne
router.get('/campaigns/:id/my-progress', verifyToken, async (req, res) => {
    try {
        const campaignId = req.params.id
        const userId = req.user.id

        const [[result]] = await pool.query(
            `SELECT
                (SELECT COUNT(*) FROM voting_categories WHERE noty_campaign_id = ? AND is_deleted = 0) as total,
                (SELECT COUNT(*) FROM votes v
                    JOIN voting_categories vc ON v.category_id = vc.id
                    WHERE v.user_id = ? AND v.noty_campaign_id = ? AND vc.is_deleted = 0 AND v.is_deleted = 0) as voted`,
            [campaignId, userId, campaignId]
        )

        res.json({ total: result.total, voted: result.voted })
    } catch (error) {
        console.error('Erreur récupération progression:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// GET - Résumé des votes d'un utilisateur sur une campagne (pour modal récap)
router.get('/campaigns/:id/my-summary', verifyToken, async (req, res) => {
    try {
        const campaignId = req.params.id
        const userId = req.user.id

        const [[result]] = await pool.query(
            `SELECT
                (SELECT COUNT(*) FROM voting_categories WHERE noty_campaign_id = ? AND is_deleted = 0) as total,
                (SELECT COUNT(*) FROM votes v
                    JOIN voting_categories vc ON v.category_id = vc.id
                    WHERE v.user_id = ? AND v.noty_campaign_id = ? AND vc.is_deleted = 0 AND v.is_deleted = 0) as voted`,
            [campaignId, userId, campaignId]
        )

        const [campaignRows] = await pool.query(
            `SELECT title, results_end_date FROM noty_campaign WHERE id = ? AND is_deleted = 0`,
            [campaignId]
        )

        if (campaignRows.length === 0) {
            return res.status(404).json({ message: 'Campagne non trouvée' })
        }

        res.json({
            voted: result.voted,
            total: result.total,
            campaign_title: campaignRows[0].title,
            results_end_date: campaignRows[0].results_end_date
        })
    } catch (error) {
        console.error('Erreur récupération résumé:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

export default router
