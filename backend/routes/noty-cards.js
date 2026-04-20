import express from 'express'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import archiver from 'archiver'
import pool from '../db.js'
import { verifyToken, requireAdminFull } from '../middleware/auth.js'
import { sanitizeFilename, ensureUploadDir } from '../utils/imageUpload.js'
import { generateAllCards } from '../utils/notyCards.js'
import { extractWaveform } from '../utils/audioWaveform.js'
import { logAdminAction, fetchCategoryResults, hallOfFameCache, UPLOADS_BASE } from '../utils/noty-helpers.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const uploadsBase = path.join(__dirname, '../../frontend/public/uploads')

const router = express.Router()

// POST - Générer les cartes PNG pour toutes les catégories d'une campagne (admin)
router.post('/campaigns/:id/generate-cards', verifyToken, requireAdminFull, async (req, res) => {
    try {
        const campaignId = req.params.id

        const [campaignRows] = await pool.query(
            `SELECT id, title, start_date, card_background_url FROM noty_campaign WHERE id = ? AND is_deleted = 0`,
            [campaignId]
        )
        if (campaignRows.length === 0) {
            return res.status(404).json({ message: 'Campagne non trouvée' })
        }

        const campaign = campaignRows[0]

        const [categories] = await pool.query(
            `SELECT vc.id, vc.title, vc.image_url, vc.nominee_type, vc.display_order
             FROM voting_categories vc
             WHERE vc.noty_campaign_id = ? AND vc.is_deleted = 0
             ORDER BY vc.display_order ASC`,
            [campaignId]
        )

        // Construire les données podium pour chaque catégorie
        const categoriesWithPodium = await Promise.all(categories.map(async (cat) => {
            const nomineeType = cat.nominee_type || 'player'
            const allResults = await fetchCategoryResults(cat.id, nomineeType, campaignId)
            const top6 = allResults.slice(0, 6)

            return {
                id: cat.id,
                title: cat.title,
                podium: top6.map((n, i) => ({
                    rank: i + 1,
                    name: n.pseudo,
                    image_url: n.image_url,
                    total_points: parseFloat(n.total_points || 0),
                }))
            }
        }))

        // Générer toutes les cartes PNG
        const generated = await generateAllCards(categoriesWithPodium, campaignId, campaign.title, campaign.card_background_url)

        // Générer le ZIP
        const cardsDir = path.join(uploadsBase, 'noty', 'cards', String(campaignId))
        const zipPath = path.join(cardsDir, 'all.zip')

        await new Promise((resolve, reject) => {
            const output = fs.createWriteStream(zipPath)
            const archive = archiver('zip', { zlib: { level: 6 } })

            output.on('close', resolve)
            archive.on('error', reject)

            archive.pipe(output)

            for (const card of generated) {
                const filename = path.basename(card.filePath)
                archive.file(card.filePath, { name: filename })
            }

            archive.finalize()
        })

        // Invalider le cache du Hall of Fame
        hallOfFameCache.data = null

        await logAdminAction(req.user.id, 'cards_generate', 'campaign', Number(campaignId), null)

        res.json({
            generated: generated.length,
            path: `/uploads/noty/cards/${campaignId}/`
        })
    } catch (error) {
        console.error('Erreur génération cartes:', error)
        res.status(500).json({ message: 'Erreur serveur lors de la génération des cartes' })
    }
})

// GET - Servir une carte PNG individuelle par nom de fichier (public)
router.get('/campaigns/:id/cards/:filename.png', async (req, res) => {
    try {
        const { id, filename } = req.params
        // Sécuriser le filename contre le path traversal
        const safeName = path.basename(filename)
        const filePath = path.join(uploadsBase, 'noty', 'cards', id, `${safeName}.png`)

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: 'Carte non trouvée — générez les cartes d\'abord' })
        }

        res.set('Cache-Control', 'public, max-age=86400')
        res.sendFile(filePath)
    } catch (error) {
        console.error('Erreur envoi carte:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// GET - Vérifier si les cartes/ZIP existent déjà pour une campagne (admin)
router.get('/campaigns/:id/cards-status', verifyToken, requireAdminFull, async (req, res) => {
    try {
        const { id } = req.params
        const cardsDir = path.join(uploadsBase, 'noty', 'cards', id)
        const zipPath = path.join(cardsDir, 'all.zip')

        if (!fs.existsSync(zipPath)) {
            return res.json({ exists: false })
        }

        // Compter les fichiers PNG
        const files = fs.readdirSync(cardsDir).filter(f => f.endsWith('.png'))
        res.json({ exists: true, generated: files.length })
    } catch (error) {
        console.error('Erreur vérification cartes:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// GET - Servir le ZIP de toutes les cartes (public)
router.get('/campaigns/:id/cards/all.zip', async (req, res) => {
    try {
        const { id } = req.params
        const zipPath = path.join(uploadsBase, 'noty', 'cards', id, 'all.zip')

        if (!fs.existsSync(zipPath)) {
            return res.status(404).json({ message: 'Archive non trouvée — générez les cartes d\'abord' })
        }

        res.set('Content-Type', 'application/zip')
        res.set('Content-Disposition', `attachment; filename="noty-cards-campagne-${id}.zip"`)
        res.set('Cache-Control', 'public, max-age=86400')
        res.sendFile(zipPath)
    } catch (error) {
        console.error('Erreur envoi ZIP:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// POST - Upload d'image/fichier (admin)
router.post('/upload', verifyToken, requireAdminFull, async (req, res) => {
    try {
        const uploadType = req.query.type || 'thumbnail'
        const campaignId = req.query.campaignId || 'temp'

        // Valider campaignId contre le path traversal
        if (campaignId !== 'temp' && !/^\d+$/.test(campaignId)) {
            return res.status(400).json({ message: 'campaignId invalide' })
        }

        if (!req.files || !req.files.file) {
            return res.status(400).json({ message: 'Aucun fichier trouvé' })
        }

        const file = req.files.file
        const ext = path.extname(file.name).toLowerCase()
        const baseFilename = sanitizeFilename(path.basename(file.name, ext))
        const filename = `${baseFilename}-${Date.now()}${ext}`

        let targetSubDir, urlPrefix
        if (uploadType === 'nominee') {
            // Accepter images, audio et vidéo
            const allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp3', '.wav', '.ogg', '.m4a', '.mp4', '.webm', '.mov']
            if (!allowedExts.includes(ext)) {
                return res.status(400).json({ message: `Format "${ext}" non supporté. Formats autorisés : images (JPG, PNG, GIF, WEBP), audio (MP3, WAV, OGG, M4A), vidéo (MP4, WEBM, MOV)` })
            }
            targetSubDir = `noty/categories/${campaignId}/nominees`
            urlPrefix = `/uploads/noty/categories/${campaignId}/nominees`
        } else if (uploadType === 'campaign') {
            // Images de campagne (illustration + fond de carte)
            const allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
            if (!allowedExts.includes(ext)) {
                return res.status(400).json({ message: 'Type de fichier non supporté (image requise)' })
            }
            targetSubDir = `noty/campaign/${campaignId}`
            urlPrefix = `/uploads/noty/campaign/${campaignId}`
        } else {
            // Thumbnail : images uniquement
            const allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
            if (!allowedExts.includes(ext)) {
                return res.status(400).json({ message: 'Type de fichier non supporté (image requise)' })
            }
            targetSubDir = `noty/categories/${campaignId}/thumbnails`
            urlPrefix = `/uploads/noty/categories/${campaignId}/thumbnails`
        }

        const targetDir = ensureUploadDir(targetSubDir)
        const uploadPath = path.join(targetDir, filename)

        await new Promise((resolve, reject) => {
            file.mv(uploadPath, (err) => err ? reject(err) : resolve())
        })

        const audioExts = ['.mp3', '.wav', '.ogg', '.m4a']
        let waveform_data = null
        if (uploadType === 'nominee' && audioExts.includes(ext)) {
            waveform_data = await extractWaveform(uploadPath)
        }

        res.json({
            message: 'Fichier uploadé',
            filename: filename,
            url: `${urlPrefix}/${filename}`,
            ...(waveform_data && { waveform_data })
        })
    } catch (error) {
        console.error('Erreur upload:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// POST - Regénérer les waveforms manquantes pour les custom nominees audio
router.post('/regenerate-waveforms', verifyToken, requireAdminFull, async (req, res) => {
    try {
        const [nominees] = await pool.query(
            `SELECT cn.id, cn.media_url
             FROM custom_nominees cn
             JOIN voting_categories vc ON cn.category_id = vc.id
             WHERE vc.nominee_type = 'sound' AND cn.is_deleted = 0 AND cn.waveform_data IS NULL`
        )

        let updated = 0
        for (const nominee of nominees) {
            if (!nominee.media_url) continue
            const filePath = path.join(UPLOADS_BASE, nominee.media_url)
            const waveform = await extractWaveform(filePath)
            if (waveform) {
                await pool.query(
                    'UPDATE custom_nominees SET waveform_data = ? WHERE id = ?',
                    [JSON.stringify(waveform), nominee.id]
                )
                updated++
            }
        }

        res.json({ message: `${updated} waveform(s) générée(s)`, total: nominees.length, updated })
    } catch (error) {
        console.error('Erreur regénération waveforms:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

export default router
