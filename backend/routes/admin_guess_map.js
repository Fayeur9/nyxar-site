import express from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import pool from '../db.js'
import { verifyToken, requireManageGames } from '../middleware/auth.js'

const router = express.Router()
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const uploadsDir = path.join(__dirname, '../../frontend/public/uploads/guess-map')

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true })
}

const sanitizeFilename = (filename) => filename.replace(/[^a-zA-Z0-9._-]/g, '_')
const VALID_DIFFICULTIES = ['offert', 'facile', 'moyen', 'difficile', 'introuvable']
const MAX_IMAGE_SIZE = 5 * 1024 * 1024

const formatDateKey = (value) => {
    if (!value) {
        return null
    }

    if (typeof value === 'string') {
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            return value
        }

        const parsed = new Date(value)
        if (!Number.isNaN(parsed.getTime())) {
            return parsed.toISOString().slice(0, 10)
        }

        return value
    }

    if (value instanceof Date) {
        return value.toISOString().slice(0, 10)
    }

    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) {
        return parsed.toISOString().slice(0, 10)
    }

    return `${value}`
}

const mapChallengeRow = (row) => ({
    id: row.id,
    date: formatDateKey(row.challenge_date),
    difficulty: row.difficulty,
    tmxId: row.tmx_id,
    tmxUrl: row.tmx_url,
    imageDataUrl: row.image_data ? `data:${row.image_mime};base64,${row.image_data.toString('base64')}` : null,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
})

const parseImageDataUrl = (dataUrl) => {
    const match = `${dataUrl || ''}`.match(/^data:image\/([a-z0-9+.-]+);base64,(.+)$/i)
    if (!match) {
        throw new Error('Format image invalide')
    }

    const [, extension, base64] = match
    const buffer = Buffer.from(base64, 'base64')

    if (buffer.length > MAX_IMAGE_SIZE) {
        throw new Error('Image trop volumineuse (max 5MB)')
    }

    return {
        mime: `image/${extension.toLowerCase()}`,
        buffer
    }
}

router.post('/upload', verifyToken, requireManageGames, (req, res) => {
    try {
        if (!req.files || !req.files.image) {
            return res.status(400).json({ message: 'Aucun fichier fourni.' })
        }

        const image = req.files.image
        const extension = path.extname(image.name)
        const baseName = sanitizeFilename(path.basename(image.name, extension))
        const filename = `${baseName}-${Date.now()}${extension}`
        const targetPath = path.join(uploadsDir, filename)

        image.mv(targetPath, (err) => {
            if (err) {
                console.error('Erreur upload GuessMap:', err)
                return res.status(500).json({ message: 'Impossible de sauvegarder le fichier.' })
            }

            res.json({
                message: 'Image enregistrée.',
                url: `/uploads/guess-map/${filename}`
            })
        })
    } catch (error) {
        console.error('Erreur upload GuessMap:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

router.post('/challenges', verifyToken, requireManageGames, async (req, res) => {
    try {
        const { date, difficulty, tmxId, imageDataUrl } = req.body

        if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return res.status(400).json({ message: 'Date invalide (format: YYYY-MM-DD)' })
        }

        if (!VALID_DIFFICULTIES.includes(difficulty)) {
            return res.status(400).json({ message: 'Difficulté invalide' })
        }

        const tmxIdStr = (tmxId ?? '').toString().trim()
        if (!tmxIdStr) {
            return res.status(400).json({ message: 'TMX ID requis' })
        }

        if (!imageDataUrl) {
            return res.status(400).json({ message: 'Image requise' })
        }

        const [conflict] = await pool.query(
            'SELECT id FROM guess_map_challenges WHERE challenge_date = ?',
            [date]
        )
        if (conflict.length > 0) {
            return res.status(409).json({ message: 'Un défi existe déjà pour cette date' })
        }

        let parsedImage
        try {
            parsedImage = parseImageDataUrl(imageDataUrl)
        } catch (error) {
            return res.status(400).json({ message: error.message })
        }

        const tmxUrl = `https://trackmania.exchange/tracks/${encodeURIComponent(tmxIdStr)}`
        const [result] = await pool.query(
            'INSERT INTO guess_map_challenges (challenge_date, difficulty, tmx_id, tmx_url, image_mime, image_data, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [date, difficulty, tmxIdStr, tmxUrl, parsedImage.mime, parsedImage.buffer, req.userId]
        )

        const [created] = await pool.query(
            'SELECT id, challenge_date, difficulty, tmx_id, tmx_url, image_mime, image_data, created_by, created_at, updated_at FROM guess_map_challenges WHERE id = ?',
            [result.insertId]
        )

        res.status(201).json({
            message: 'Nouveau défi créé.',
            challenge: mapChallengeRow(created[0])
        })
    } catch (error) {
        console.error('Erreur création défi GuessMap:', error)
        res.status(500).json({ message: error.message || 'Erreur serveur' })
    }
})

router.put('/challenges/:id', verifyToken, requireManageGames, async (req, res) => {
    try {
        const { id } = req.params
        const { difficulty, tmxId, imageDataUrl } = req.body
        const challengeId = Number.parseInt(id, 10)

        if (Number.isNaN(challengeId)) {
            return res.status(400).json({ message: 'Identifiant invalide' })
        }

        if (!VALID_DIFFICULTIES.includes(difficulty)) {
            return res.status(400).json({ message: 'Difficulté invalide' })
        }

        const tmxIdStr = (tmxId ?? '').toString().trim()
        if (!tmxIdStr) {
            return res.status(400).json({ message: 'TMX ID requis' })
        }

        const [existingRows] = await pool.query(
            'SELECT id, challenge_date, difficulty, tmx_id, tmx_url, image_mime, image_data, created_by, created_at, updated_at FROM guess_map_challenges WHERE id = ?',
            [challengeId]
        )

        if (existingRows.length === 0) {
            return res.status(404).json({ message: 'Défi introuvable' })
        }

        const current = existingRows[0]
        let imageMime = current.image_mime
        let imageBuffer = current.image_data

        if (imageDataUrl) {
            try {
                const parsed = parseImageDataUrl(imageDataUrl)
                imageMime = parsed.mime
                imageBuffer = parsed.buffer
            } catch (error) {
                return res.status(400).json({ message: error.message })
            }
        }

        const tmxUrl = `https://trackmania.exchange/tracks/${encodeURIComponent(tmxIdStr)}`

        await pool.query(
            'UPDATE guess_map_challenges SET difficulty = ?, tmx_id = ?, tmx_url = ?, image_mime = ?, image_data = ?, updated_at = NOW() WHERE id = ?',
            [difficulty, tmxIdStr, tmxUrl, imageMime, imageBuffer, challengeId]
        )

        const [updatedRows] = await pool.query(
            'SELECT id, challenge_date, difficulty, tmx_id, tmx_url, image_mime, image_data, created_by, created_at, updated_at FROM guess_map_challenges WHERE id = ?',
            [challengeId]
        )

        res.json({
            message: 'Défi mis à jour.',
            challenge: mapChallengeRow(updatedRows[0])
        })
    } catch (error) {
        console.error('Erreur mise à jour défi GuessMap:', error)
        res.status(500).json({ message: error.message || 'Erreur serveur' })
    }
})

router.delete('/challenges/:id', verifyToken, requireManageGames, async (req, res) => {
    try {
        const { id } = req.params
        const challengeId = Number.parseInt(id, 10)

        if (Number.isNaN(challengeId)) {
            return res.status(400).json({ message: 'Identifiant invalide' })
        }

        const [existingRows] = await pool.query(
            'SELECT id FROM guess_map_challenges WHERE id = ?',
            [challengeId]
        )

        if (existingRows.length === 0) {
            return res.status(404).json({ message: 'Défi introuvable' })
        }

        await pool.query('DELETE FROM guess_map_challenges WHERE id = ?', [challengeId])

        res.json({ message: 'Défi supprimé.' })
    } catch (error) {
        console.error('Erreur suppression défi GuessMap:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

router.get('/challenges', verifyToken, requireManageGames, async (req, res) => {
    try {
        const { from, to, limit } = req.query
        const filters = []
        const params = []

        const isValidDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value)

        if (from) {
            if (!isValidDate(from)) {
                return res.status(400).json({ message: 'Paramètre "from" invalide (format YYYY-MM-DD)' })
            }
            filters.push('challenge_date >= ?')
            params.push(from)
        }

        if (to) {
            if (!isValidDate(to)) {
                return res.status(400).json({ message: 'Paramètre "to" invalide (format YYYY-MM-DD)' })
            }
            filters.push('challenge_date <= ?')
            params.push(to)
        }

        const limitValue = Math.min(parseInt(limit, 10) || 20, 200)
        const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : ''

        const [rows] = await pool.query(
            `SELECT id, challenge_date, difficulty, tmx_id, tmx_url, image_mime, image_data, created_by, created_at, updated_at
             FROM guess_map_challenges
             ${whereClause}
             ORDER BY challenge_date ASC, created_at DESC
             LIMIT ${limitValue}`,
            params
        )

        res.json(rows.map(mapChallengeRow))
    } catch (error) {
        console.error('Erreur liste défis GuessMap:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

export default router
