import express from 'express'
import pool from '../db.js'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { verifyToken, requireManageGames } from '../middleware/auth.js'
import { ensureUploadDir, deleteImageFile, sanitizeFilename } from '../utils/imageUpload.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const uploadsDir = ensureUploadDir('line_ups')
const playersUploadsDir = ensureUploadDir('players')

const TRACKMANIA_API_BASE_URL = 'https://trackmania.io/api/player/'
const TRACKMANIA_USER_AGENT = 'NyxarSite/1.0 (Trackmania integration)'
const TRACKMANIA_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

const trackmaniaCache = new Map()

const extractTrackmaniaSlug = (value) => {
    if (!value || typeof value !== 'string') return null
    const trimmed = value.trim()
    if (!trimmed) return null

    if (!trimmed.includes('/')) {
        return trimmed
    }

    try {
        const url = new URL(trimmed)

        if (url.hash) {
            const hashPath = url.hash.replace(/^#/, '')
            const segments = hashPath.split('/').filter(Boolean)
            const playerIndex = segments.findIndex(segment => segment.toLowerCase() === 'player')
            if (playerIndex !== -1 && playerIndex + 1 < segments.length) {
                return segments[playerIndex + 1].split(/[?#]/)[0]
            }
        }

        const pathSegments = url.pathname.split('/').filter(Boolean)
        const playerIndex = pathSegments.findIndex(segment => segment.toLowerCase() === 'player')
        if (playerIndex !== -1 && playerIndex + 1 < pathSegments.length) {
            return pathSegments[playerIndex + 1].split(/[?#]/)[0]
        }

        if (pathSegments.length > 0) {
            return pathSegments[pathSegments.length - 1].split(/[?#]/)[0]
        }
    } catch (error) {
        // Fallback to manual parsing below
    }

    const hashIndex = trimmed.toLowerCase().indexOf('#/player/')
    if (hashIndex !== -1) {
        return trimmed.slice(hashIndex + 9).split(/[/?#]/)[0]
    }

    const pathIndex = trimmed.toLowerCase().indexOf('/player/')
    if (pathIndex !== -1) {
        return trimmed.slice(pathIndex + 8).split(/[/?#]/)[0]
    }

    const lastSlash = trimmed.lastIndexOf('/')
    if (lastSlash !== -1) {
        return trimmed.slice(lastSlash + 1).split(/[?#]/)[0]
    }

    return trimmed
}

const getCachedTrackmaniaStats = (slug) => {
    const cached = trackmaniaCache.get(slug)
    if (!cached) {
        return null
    }

    if (cached.expiresAt <= Date.now()) {
        trackmaniaCache.delete(slug)
        return null
    }

    return cached
}

const setCachedTrackmaniaStats = (slug, data) => {
    const now = Date.now()
    const entry = {
        data,
        storedAt: now,
        expiresAt: now + TRACKMANIA_CACHE_TTL
    }
    trackmaniaCache.set(slug, entry)
    return entry
}

const buildZonePath = (zone, positions = []) => {
    if (!zone) return []

    const levels = []
    let current = zone

    while (current) {
        levels.push({
            id: current.id || null,
            name: current.name || null,
            flag: current.flag || null
        })
        current = current.parent || null
    }

    levels.reverse()

    return levels.map((level, index) => ({
        ...level,
        position: positions[index] ?? null
    }))
}

const normalizeMatchmakingEntry = (entry) => {
    if (!entry || typeof entry !== 'object') return null

    const info = entry.info || {}
    const division = info.division || null
    const nextDivision = info.division_next || null

    return {
        typeId: info.typeid ?? null,
        typeName: info.typename || null,
        rank: info.rank ?? null,
        score: info.score ?? null,
        progression: info.progression ?? null,
        division: division ? {
            position: division.position ?? null,
            rule: division.rule || null,
            minPoints: division.minpoints ?? null,
            maxPoints: division.maxpoints ?? null,
            minWins: division.minwins ?? null,
            maxWins: division.maxwins ?? null
        } : null,
        nextDivision: nextDivision ? {
            position: nextDivision.position ?? null,
            rule: nextDivision.rule || null,
            minPoints: nextDivision.minpoints ?? null,
            maxPoints: nextDivision.maxpoints ?? null,
            minWins: nextDivision.minwins ?? null,
            maxWins: nextDivision.maxwins ?? null
        } : null,
        totals: {
            trackedPlayers: entry.total ?? null,
            activePlayers: entry.totalactive ?? null
        }
    }
}

const prepareTrackmaniaPayload = (raw) => {
    if (!raw || typeof raw !== 'object') {
        return null
    }

    const trophies = raw.trophies || {}
    const zonePositions = Array.isArray(trophies.zonepositions) ? trophies.zonepositions : []

    const matchmaking = Array.isArray(raw.matchmaking)
        ? raw.matchmaking.map(normalizeMatchmakingEntry).filter(Boolean)
        : []

    return {
        accountId: raw.accountid || null,
        displayName: raw.displayname || null,
        clubTag: raw.clubtag || null,
        clubTagUpdatedAt: raw.clubtagtimestamp || null,
        vanity: raw.meta?.vanity || null,
        trophies: {
            points: trophies.points ?? null,
            echelon: trophies.echelon ?? null,
            counts: Array.isArray(trophies.counts) ? trophies.counts : [],
            updatedAt: trophies.timestamp || null,
            zonePath: buildZonePath(trophies.zone, zonePositions)
        },
        matchmaking
    }
}

const router = express.Router()


// GET tous les line-ups (public - actifs uniquement)
router.get('/line-ups', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                lu.id,
                lu.name,
                lu.image_url,
                lu.color,
                lu.game_id,
                g.name as game_name,
                COUNT(lup.player_id) as player_count
            FROM line_ups lu
            LEFT JOIN games g ON lu.game_id = g.id AND g.is_deleted = 0
            LEFT JOIN line_up_players lup ON lu.id = lup.line_up_id AND lup.left_at IS NULL AND lup.is_deleted = 0
            WHERE lu.is_deleted = 0 AND lu.is_active = 1
            GROUP BY lu.id, g.name
            ORDER BY lu.name
        `)
        res.json(result[0])
    } catch (error) {
        console.error('Erreur récupération line-ups:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// GET tous les line-ups (admin - tous)
router.get('/line-ups/admin', verifyToken, requireManageGames, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                lu.id,
                lu.name,
                lu.image_url,
                lu.color,
                lu.game_id,
                lu.is_active,
                g.name as game_name,
                COUNT(lup.player_id) as player_count
            FROM line_ups lu
            LEFT JOIN games g ON lu.game_id = g.id AND g.is_deleted = 0
            LEFT JOIN line_up_players lup ON lu.id = lup.line_up_id AND lup.left_at IS NULL AND lup.is_deleted = 0
            WHERE lu.is_deleted = 0
            GROUP BY lu.id, g.name
            ORDER BY lu.name
        `)
        res.json(result[0])
    } catch (error) {
        console.error('Erreur récupération line-ups admin:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// GET un line-up avec ses joueurs actuels
router.get('/line-ups/:id', async (req, res) => {
    try {
        const { id } = req.params

        const lineUpResult = await pool.query(`
            SELECT
                lu.id,
                lu.name,
                lu.image_url,
                lu.color,
                lu.game_id,
                g.name as game_name
            FROM line_ups lu
            LEFT JOIN games g ON lu.game_id = g.id AND g.is_deleted = 0
            WHERE lu.id = ? AND lu.is_deleted = 0
        `, [id])

        if (lineUpResult[0].length === 0) {
            return res.status(404).json({ message: 'Line-up non trouvé' })
        }

        const playersResult = await pool.query(`
            SELECT
                p.id,
                p.pseudo,
                p.first_name,
                p.last_name,
                p.image_url,
                p.image_url_hover,
                p.birth_date,
                p.catch_phrase,
                lup.joined_at,
                lup.line_up_id
            FROM nyxariens p
            JOIN line_up_players lup ON p.id = lup.player_id
            WHERE lup.line_up_id = ? AND lup.left_at IS NULL AND p.is_deleted = 0 AND lup.is_deleted = 0
            ORDER BY lup.joined_at
        `, [id])

        res.json({
            ...lineUpResult[0][0],
            players: playersResult[0]
        })
    } catch (error) {
        console.error('Erreur récupération line-up:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// POST créer un line-up (admin seulement)
router.post('/line-ups', verifyToken, requireManageGames, async (req, res) => {
    try {
        const { name, image_url, color, game_id } = req.body

        if (!name) {
            return res.status(400).json({ message: 'Nom requis' })
        }

        let sanitizedImage = null
        if (image_url && !image_url.includes('..') && !image_url.includes('\\')) {
            sanitizedImage = image_url
        }

        const result = await pool.query(
            `INSERT INTO line_ups (name, image_url, color, game_id) 
             VALUES (?, ?, ?, ?)`,
            [name, sanitizedImage, color, game_id || null]
        );
        const insertedId = await pool.query('SELECT LAST_INSERT_ID() as id');
        const lineUp = await pool.query('SELECT * FROM line_ups WHERE id = ?', [insertedId[0][0].id]);

        res.json({
            message: 'Line-up créé',
            lineUp: lineUp[0][0]
        })
    } catch (error) {
        console.error('Erreur création line-up:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// PUT modifier un line-up (admin seulement)
router.put('/line-ups/:id', verifyToken, requireManageGames, async (req, res) => {
    try {
        const { id } = req.params
        const { name, image_url, color, game_id } = req.body

        let sanitizedImage = image_url
        if (image_url && (image_url.includes('..') || image_url.includes('\\'))) {
            return res.status(400).json({ message: 'Chemin d\'image invalide' })
        }

        // Récupérer l'ancienne image avant mise à jour
        const [currentLineUp] = await pool.query(
            'SELECT image_url FROM line_ups WHERE id = ?',
            [id]
        )

        if (currentLineUp.length > 0) {
            const oldCoverImage = currentLineUp[0].image_url
            if (oldCoverImage && oldCoverImage !== image_url) {
                deleteImageFile(oldCoverImage, 'line_ups')
            }
        }

        const result = await pool.query(
            `UPDATE line_ups
             SET name = COALESCE(?, name), image_url = ?, color = ?, game_id = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [name, sanitizedImage, color, game_id || null, id]
        );
        const updatedLineUp = await pool.query('SELECT * FROM line_ups WHERE id = ?', [id]);

        if (updatedLineUp[0].length === 0) {
            return res.status(404).json({ message: 'Line-up non trouvé' });
        }

        res.json({
            message: 'Line-up mise à jour',
            lineUp: updatedLineUp[0][0]
        })
    } catch (error) {
        console.error('Erreur mise à jour line-up:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// DELETE un line-up (admin seulement) - soft delete
router.delete('/line-ups/:id', verifyToken, requireManageGames, async (req, res) => {
    try {
        const { id } = req.params

        // Récupérer l'image avant suppression
        const [currentLineUp] = await pool.query(
            'SELECT image_url FROM line_ups WHERE id = ? AND is_deleted = 0',
            [id]
        )

        const result = await pool.query(
            'UPDATE line_ups SET is_deleted = 1 WHERE id = ? AND is_deleted = 0',
            [id]
        );
        const deleted = result[0].affectedRows > 0;

        if (!deleted) {
            return res.status(404).json({ message: 'Line-up non trouvé' });
        }

        // Supprimer l'image du serveur
        if (currentLineUp.length > 0 && currentLineUp[0].image_url) {
            deleteImageFile(currentLineUp[0].image_url, 'line_ups')
        }

        res.json({ message: 'Line-up supprimé' })
    } catch (error) {
        console.error('Erreur suppression line-up:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// PATCH toggle active status d'un line-up
router.patch('/line-ups/:id/toggle', verifyToken, requireManageGames, async (req, res) => {
    try {
        const { id } = req.params

        // Récupérer l'état actuel
        const [lineUp] = await pool.query(
            'SELECT is_active FROM line_ups WHERE id = ? AND is_deleted = 0',
            [id]
        )

        if (lineUp.length === 0) {
            return res.status(404).json({ message: 'Line-up non trouvé' })
        }

        // Inverser le statut
        const newStatus = lineUp[0].is_active ? 0 : 1

        await pool.query(
            'UPDATE line_ups SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [newStatus, id]
        )

        // Retourner le line-up mis à jour
        const result = await pool.query(`
            SELECT
                lu.id,
                lu.name,
                lu.image_url,
                lu.color,
                lu.game_id,
                lu.is_active,
                g.name as game_name,
                COUNT(lup.player_id) as player_count
            FROM line_ups lu
            LEFT JOIN games g ON lu.game_id = g.id AND g.is_deleted = 0
            LEFT JOIN line_up_players lup ON lu.id = lup.line_up_id AND lup.left_at IS NULL AND lup.is_deleted = 0
            WHERE lu.id = ?
            GROUP BY lu.id, g.name
        `, [id])

        res.json(result[0][0])
    } catch (error) {
        console.error('Erreur toggle line-up:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// GET tous les joueurs
router.get('/players', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                p.id,
                p.user_id,
                p.pseudo,
                p.first_name,
                p.last_name,
                p.image_url,
                p.image_url_hover,
                p.birth_date,
                p.catch_phrase,
                u.trackmania_io_url,
                GROUP_CONCAT(DISTINCT lu.game_id) AS game_ids,
                COUNT(DISTINCT lup.line_up_id) AS line_up_count,
                GROUP_CONCAT(
                    DISTINCT CASE
                        WHEN lu.id IS NOT NULL THEN CONCAT_WS('::', lu.id, lu.name, COALESCE(NULLIF(lu.color, ''), g.color, '#667eea'), COALESCE(lup.is_captain, 0))
                        ELSE NULL
                    END
                    ORDER BY lu.name
                    SEPARATOR '|' ) AS line_up_info,
                GROUP_CONCAT(DISTINCT po.name ORDER BY po.name SEPARATOR ',') AS postes
            FROM nyxariens p
            LEFT JOIN users u ON p.user_id = u.id AND u.is_deleted = 0
            LEFT JOIN line_up_players lup ON p.id = lup.player_id AND lup.left_at IS NULL AND lup.is_deleted = 0
            LEFT JOIN line_ups lu ON lup.line_up_id = lu.id AND lu.is_deleted = 0 AND lu.is_active = 1
            LEFT JOIN games g ON lu.game_id = g.id AND g.is_deleted = 0
            LEFT JOIN poste_nyxarien pn ON p.id = pn.nyxarien_id
            LEFT JOIN poste po ON pn.poste_id = po.id
            WHERE p.is_deleted = 0
            GROUP BY p.id
            ORDER BY p.pseudo
        `)
        // Transformer game_ids string en array, ainsi que les informations de line-ups
        const players = result[0].map((player) => {
            const {
                line_up_info,
                game_ids: gameIdsRaw,
                line_up_count: lineUpCountRaw,
                user_id: userId,
                trackmania_io_url: trackmaniaLinkRaw,
                postes: postesRaw,
                ...rest
            } = player

            const gameIds = gameIdsRaw ? gameIdsRaw.split(',').map(id => parseInt(id, 10)) : []
            const lineUps = line_up_info
                ? line_up_info.split('|')
                    .map(info => {
                        const [id, name, color, isCaptain] = info.split('::')
                        const parsedId = parseInt(id)
                        if (Number.isNaN(parsedId)) return null
                        return {
                            id: parsedId,
                            name: name || '',
                            color: color || '#667eea',
                            is_captain: isCaptain === '1'
                        }
                    })
                    .filter(Boolean)
                : []

            const postes = postesRaw ? postesRaw.split(',') : []
            const isCaptainOfAny = lineUps.some(lu => lu.is_captain)

            return {
                ...rest,
                user_id: userId !== null && userId !== undefined ? Number(userId) : null,
                game_id: gameIds.length > 0 ? gameIds[0] : null,
                game_ids: gameIds,
                line_up_count: Number(lineUpCountRaw) || 0,
                lineups: lineUps,
                postes,
                is_captain: isCaptainOfAny,
                is_staff: postes.includes('staff'),
                is_fondateur: postes.includes('fondateur'),
                trackmaniaLink: trackmaniaLinkRaw || null
            }
        })
        res.json(players)
    } catch (error) {
        console.error('Erreur récupération joueurs:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// GET utilisateurs disponibles pour associer un joueur (admin seulement)
router.get('/players/user-options', verifyToken, requireManageGames, async (req, res) => {
    try {
        const [userOptions] = await pool.query(`
            SELECT 
                u.id,
                u.username,
                u.email,
                n.id AS player_id
            FROM users u
            LEFT JOIN nyxariens n ON n.user_id = u.id AND n.is_deleted = 0
            WHERE u.is_deleted = 0
            ORDER BY u.username ASC
        `)

        res.json(userOptions.map((option) => ({
            id: option.id,
            username: option.username,
            email: option.email,
            player_id: option.player_id
        })))
    } catch (error) {
        console.error('Erreur récupération utilisateurs disponibles:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// GET un joueur avec son historique
router.get('/players/:id', async (req, res) => {
    try {
        const { id } = req.params

        const playerResult = await pool.query(`
            SELECT * FROM nyxariens WHERE id = ? AND is_deleted = 0
        `, [id])

        if (playerResult[0].length === 0) {
            return res.status(404).json({ message: 'Joueur non trouvé' })
        }

        const historyResult = await pool.query(`
            SELECT
                lu.id,
                lu.name,
                g.name as game_name,
                lup.joined_at,
                lup.left_at
            FROM line_up_players lup
            JOIN line_ups lu ON lup.line_up_id = lu.id AND lu.is_deleted = 0
            LEFT JOIN games g ON lu.game_id = g.id AND g.is_deleted = 0
            WHERE lup.player_id = ? AND lup.is_deleted = 0
            ORDER BY lup.joined_at DESC
        `, [id])

        res.json({
            ...playerResult[0][0],
            history: historyResult[0]
        })
    } catch (error) {
        console.error('Erreur récupération joueur:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

router.get('/players/:id/trackmania/stats', async (req, res) => {
    if (typeof fetch !== 'function') {
        return res.status(500).json({ message: 'Intégration Trackmania.io indisponible sur ce serveur.' })
    }

    try {
        const { id } = req.params

        const [players] = await pool.query(`
            SELECT n.id, n.pseudo, u.trackmania_io_url
            FROM nyxariens n
            LEFT JOIN users u ON n.user_id = u.id AND u.is_deleted = 0
            WHERE n.id = ? AND n.is_deleted = 0
        `, [id])

        if (players.length === 0) {
            return res.status(404).json({ message: 'Joueur non trouvé' })
        }

        const player = players[0]
        const trackmaniaLink = player.trackmania_io_url

        if (!trackmaniaLink) {
            return res.status(404).json({ message: 'Aucun profil Trackmania.io n\'est associé à ce joueur.' })
        }

        const slug = extractTrackmaniaSlug(trackmaniaLink)

        if (!slug) {
            return res.status(400).json({ message: 'Lien Trackmania.io invalide.' })
        }

        const cached = getCachedTrackmaniaStats(slug)
        if (cached) {
            return res.json({
                player: {
                    id: player.id,
                    pseudo: player.pseudo,
                    trackmaniaLink,
                    trackmaniaSlug: slug
                },
                trackmania: cached.data,
                meta: {
                    fromCache: true,
                    fetchedAt: new Date().toISOString(),
                    cacheStoredAt: new Date(cached.storedAt).toISOString(),
                    cacheExpiresAt: new Date(cached.expiresAt).toISOString()
                }
            })
        }

        const response = await fetch(`${TRACKMANIA_API_BASE_URL}${encodeURIComponent(slug)}`, {
            headers: {
                'User-Agent': TRACKMANIA_USER_AGENT,
                'Accept': 'application/json'
            }
        })

        if (response.status === 404) {
            return res.status(404).json({ message: 'Profil Trackmania.io introuvable.' })
        }

        if (!response.ok) {
            const errorText = await response.text().catch(() => '')
            return res.status(502).json({ message: 'Trackmania.io a renvoyé une erreur.', details: errorText.slice(0, 200) })
        }

        const rawText = await response.text()
        let rawData
        try {
            rawData = JSON.parse(rawText)
        } catch (parseError) {
            console.error('Erreur parsing Trackmania.io:', parseError)
            return res.status(502).json({ message: 'Réponse Trackmania.io invalide.' })
        }

        if (rawData && typeof rawData === 'object' && rawData.error) {
            return res.status(404).json({ message: 'Profil Trackmania.io introuvable.' })
        }

        const stats = prepareTrackmaniaPayload(rawData)

        if (!stats) {
            return res.status(502).json({ message: 'Impossible de formater les données Trackmania.io.' })
        }

        const cacheEntry = setCachedTrackmaniaStats(slug, stats)

        res.json({
            player: {
                id: player.id,
                pseudo: player.pseudo,
                trackmaniaLink,
                trackmaniaSlug: slug
            },
            trackmania: stats,
            meta: {
                fromCache: false,
                fetchedAt: new Date().toISOString(),
                cacheStoredAt: new Date(cacheEntry.storedAt).toISOString(),
                cacheExpiresAt: new Date(cacheEntry.expiresAt).toISOString()
            }
        })
    } catch (error) {
        console.error('Erreur récupération stats Trackmania:', error)
        res.status(502).json({ message: 'Erreur lors de la récupération des statistiques Trackmania.io.' })
    }
})

// POST créer un joueur (admin seulement)
// CAS A : createUser=true + email → crée un compte user automatiquement avec rôle nyxar
// CAS B : user_id fourni → lie le nyxarien à un user existant
router.post('/players', verifyToken, requireManageGames, async (req, res) => {
    const conn = await pool.getConnection()
    try {
        const { pseudo, first_name, last_name, image_url, image_url_hover, birth_date, catch_phrase, user_id, createUser, email } = req.body

        let linkedUserId = null
        let pseudoValue = typeof pseudo === 'string' ? pseudo.trim() : ''
        let tempPassword = null

        await conn.beginTransaction()

        if (createUser) {
            // CAS A — auto-création du compte user
            if (!email || !email.trim()) {
                await conn.rollback()
                return res.status(400).json({ message: 'Email requis pour créer un compte' })
            }
            if (!pseudoValue) {
                await conn.rollback()
                return res.status(400).json({ message: 'Pseudo requis' })
            }

            // Vérifier que l'email et le username ne sont pas déjà pris
            const [emailCheck] = await conn.query('SELECT id FROM users WHERE email = ?', [email.trim()])
            if (emailCheck.length > 0) {
                await conn.rollback()
                return res.status(400).json({ message: 'Cet email est déjà utilisé' })
            }
            const [usernameCheck] = await conn.query('SELECT id FROM users WHERE username = ?', [pseudoValue])
            if (usernameCheck.length > 0) {
                await conn.rollback()
                return res.status(400).json({ message: 'Ce username est déjà pris' })
            }

            // Générer un mot de passe aléatoire (20 caractères alphanumériques + symboles)
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*'
            tempPassword = Array.from(crypto.randomBytes(20)).map(b => chars[b % chars.length]).join('')
            const passwordHash = await bcrypt.hash(tempPassword, 10)

            const [userResult] = await conn.query(
                'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
                [pseudoValue, email.trim(), passwordHash]
            )
            linkedUserId = userResult.insertId

            // Assigner le rôle "nyxar"
            const [nyxarRole] = await conn.query('SELECT id FROM role WHERE name = ?', ['nyxar'])
            if (nyxarRole.length > 0) {
                await conn.query(
                    'INSERT IGNORE INTO role_user (user_id, role_id) VALUES (?, ?)',
                    [linkedUserId, nyxarRole[0].id]
                )
            }

        } else if (user_id !== undefined && user_id !== null && user_id !== '') {
            // CAS B — lier à un user existant
            const parsedUserId = parseInt(user_id, 10)
            if (Number.isNaN(parsedUserId)) {
                await conn.rollback()
                return res.status(400).json({ message: 'Identifiant utilisateur invalide' })
            }

            const [userRows] = await conn.query(
                'SELECT id, username FROM users WHERE id = ? AND is_deleted = 0',
                [parsedUserId]
            )
            if (userRows.length === 0) {
                await conn.rollback()
                return res.status(404).json({ message: 'Utilisateur non trouvé' })
            }

            const [existingLink] = await conn.query(
                'SELECT id FROM nyxariens WHERE user_id = ? AND is_deleted = 0',
                [parsedUserId]
            )
            if (existingLink.length > 0) {
                await conn.rollback()
                return res.status(400).json({ message: 'Cet utilisateur est déjà lié à un joueur' })
            }

            linkedUserId = parsedUserId
            if (!pseudoValue) {
                pseudoValue = userRows[0].username || ''
            }

            // Assigner le rôle "nyxar" si pas déjà présent
            const [nyxarRole] = await conn.query('SELECT id FROM role WHERE name = ?', ['nyxar'])
            if (nyxarRole.length > 0) {
                await conn.query(
                    'INSERT IGNORE INTO role_user (user_id, role_id) VALUES (?, ?)',
                    [linkedUserId, nyxarRole[0].id]
                )
            }
        }

        if (!pseudoValue) {
            await conn.rollback()
            return res.status(400).json({ message: 'Pseudo requis' })
        }

        let sanitizedImage = null
        if (image_url && !image_url.includes('..') && !image_url.includes('\\')) {
            sanitizedImage = image_url
        }
        let sanitizedHoverImage = null
        if (image_url_hover && !image_url_hover.includes('..') && !image_url_hover.includes('\\')) {
            sanitizedHoverImage = image_url_hover
        }

        const [insertResult] = await conn.query(
            `INSERT INTO nyxariens (pseudo, first_name, last_name, image_url, image_url_hover, birth_date, catch_phrase, user_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [pseudoValue, first_name || null, last_name || null, sanitizedImage, sanitizedHoverImage, birth_date || null, catch_phrase || null, linkedUserId]
        )
        const [player] = await conn.query('SELECT * FROM nyxariens WHERE id = ?', [insertResult.insertId])

        await conn.commit()

        const response = { message: 'Joueur créé', player: player[0] }
        if (tempPassword) {
            response.tempPassword = tempPassword
        }
        res.status(201).json(response)
    } catch (error) {
        await conn.rollback()
        console.error('Erreur création joueur:', error)
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'Ce pseudo existe déjà' })
        }
        res.status(500).json({ message: 'Erreur serveur' })
    } finally {
        conn.release()
    }
})

// PUT modifier un joueur (admin seulement)
router.put('/players/:id', verifyToken, requireManageGames, async (req, res) => {
    try {
        const { id } = req.params
        const { pseudo, first_name, last_name, image_url, image_url_hover, birth_date, catch_phrase, user_id } = req.body

        let pseudoValue = typeof pseudo === 'string' ? pseudo.trim() : (pseudo ?? null)

        let sanitizedImage = image_url
        if (image_url && (image_url.includes('..') || image_url.includes('\\'))) {
            return res.status(400).json({ message: 'Chemin d\'image invalide' })
        }

        let sanitizedHoverImage = image_url_hover
        if (image_url_hover && (image_url_hover.includes('..') || image_url_hover.includes('\\'))) {
            return res.status(400).json({ message: 'Chemin d\'image invalide' })
        }

        // Récupérer l'ancienne image avant mise à jour
        const [currentPlayer] = await pool.query(
            'SELECT image_url, image_url_hover, user_id FROM nyxariens WHERE id = ?',
            [id]
        )

        if (currentPlayer.length > 0) {
            const oldImageUrl = currentPlayer[0].image_url
            if (oldImageUrl && oldImageUrl !== image_url) {
                deleteImageFile(oldImageUrl, 'players')
            }

            const oldHoverUrl = currentPlayer[0].image_url_hover
            if (oldHoverUrl && oldHoverUrl !== image_url_hover) {
                deleteImageFile(oldHoverUrl, 'players')
            }
        }

        let linkedUserId = currentPlayer.length > 0 ? currentPlayer[0].user_id : null

        if (user_id !== undefined) {
            if (user_id === null || user_id === '') {
                linkedUserId = null
            } else {
                const parsedUserId = parseInt(user_id, 10)
                if (Number.isNaN(parsedUserId)) {
                    return res.status(400).json({ message: 'Identifiant utilisateur invalide' })
                }

                const [userRows] = await pool.query(
                    'SELECT id, username FROM users WHERE id = ? AND is_deleted = 0',
                    [parsedUserId]
                )

                if (userRows.length === 0) {
                    return res.status(404).json({ message: 'Utilisateur non trouvé' })
                }

                const [existingLink] = await pool.query(
                    'SELECT id FROM nyxariens WHERE user_id = ? AND id != ? AND is_deleted = 0',
                    [parsedUserId, id]
                )

                if (existingLink.length > 0) {
                    return res.status(400).json({ message: 'Cet utilisateur est déjà lié à un autre joueur' })
                }

                linkedUserId = parsedUserId
                if (!pseudoValue || (typeof pseudoValue === 'string' && pseudoValue.trim() === '')) {
                    pseudoValue = userRows[0].username || null
                }
            }
        }

        const pseudoToUpdate = (typeof pseudoValue === 'string' && pseudoValue.trim() !== '') ? pseudoValue.trim() : null

        await pool.query(
            `UPDATE nyxariens
             SET pseudo = COALESCE(?, pseudo), first_name = ?, last_name = ?, image_url = ?, image_url_hover = ?, birth_date = ?, catch_phrase = ?, user_id = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [pseudoToUpdate, first_name || null, last_name || null, sanitizedImage, sanitizedHoverImage || null, birth_date || null, catch_phrase || null, linkedUserId || null, id]
        )

        // Récupérer le joueur mis à jour
        const [updatedPlayer] = await pool.query(
            'SELECT * FROM nyxariens WHERE id = ?',
            [id]
        )

        if (updatedPlayer.length === 0) {
            return res.status(404).json({ message: 'Joueur non trouvé' })
        }

        res.json({
            message: 'Joueur mise à jour',
            player: updatedPlayer[0]
        })
    } catch (error) {
        console.error('Erreur mise à jour joueur:', error)
        if (error.code === '23505' || error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'Ce pseudo existe déjà' })
        }
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// DELETE un joueur (admin seulement) - soft delete
router.delete('/players/:id', verifyToken, requireManageGames, async (req, res) => {
    try {
        const { id } = req.params

        // Récupérer les images avant suppression
        const [currentPlayer] = await pool.query(
            'SELECT image_url, image_url_hover FROM nyxariens WHERE id = ? AND is_deleted = 0',
            [id]
        )

        const result = await pool.query(
            'UPDATE nyxariens SET is_deleted = 1 WHERE id = ? AND is_deleted = 0',
            [id]
        );
        const deleted = result[0].affectedRows > 0;

        if (!deleted) {
            return res.status(404).json({ message: 'Joueur non trouvé' });
        }

        // Supprimer les images du serveur
        if (currentPlayer.length > 0) {
            if (currentPlayer[0].image_url) {
                deleteImageFile(currentPlayer[0].image_url, 'players')
            }
            if (currentPlayer[0].image_url_hover) {
                deleteImageFile(currentPlayer[0].image_url_hover, 'players')
            }
        }

        res.json({ message: 'Joueur supprimé' })
    } catch (error) {
        console.error('Erreur suppression joueur:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// POST ajouter un joueur à un line-up
router.post('/line-ups/:lineUpId/players/:playerId', verifyToken, requireManageGames, async (req, res) => {
    try {
        const { lineUpId, playerId } = req.params

        const result = await pool.query(
            `INSERT INTO line_up_players (line_up_id, player_id, left_at) 
             VALUES (?, ?, NULL) 
             ON DUPLICATE KEY UPDATE left_at = NULL`,
            [lineUpId, playerId]
        )

        res.json({
            message: 'Joueur ajouté au line-up',
            lineUpPlayer: result[0]
        })
    } catch (error) {
        console.error('Erreur ajout joueur:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// PUT retirer un joueur d'un line-up
router.put('/line-ups/:lineUpId/players/:playerId/remove', verifyToken, requireManageGames, async (req, res) => {
    try {
        const { lineUpId, playerId } = req.params

        const [result] = await pool.query(
            `UPDATE line_up_players 
             SET left_at = CURRENT_TIMESTAMP
             WHERE line_up_id = ? AND player_id = ?`,
            [lineUpId, playerId]
        )

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Joueur non trouvé dans ce line-up' })
        }

        // Récupérer le joueur mis à jour
        const [updatedPlayer] = await pool.query(
            `SELECT lup.*, p.pseudo, p.first_name, p.last_name
             FROM line_up_players lup
             JOIN nyxariens p ON lup.player_id = p.id
             WHERE lup.line_up_id = ? AND lup.player_id = ?`,
            [lineUpId, playerId]
        )

        res.json({
            message: 'Joueur retiré du line-up',
            lineUpPlayer: updatedPlayer[0]
        })
    } catch (error) {
        console.error('Erreur retrait joueur:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// POST upload image joueur
router.post('/upload/player', verifyToken, requireManageGames, (req, res) => {
    try {
        if (!req.files || !req.files.image) {
            return res.status(400).json({ message: 'Aucun fichier trouvé' })
        }

        const image = req.files.image
        const ext = path.extname(image.name)
        const baseFilename = sanitizeFilename(path.basename(image.name, ext))
        const filename = `${baseFilename}-${Date.now()}${ext}`
        const uploadPath = path.join(playersUploadsDir, filename)

        image.mv(uploadPath, (err) => {
            if (err) {
                return res.status(500).json({ message: 'Erreur upload' })
            }

            res.json({
                message: 'Image uploadée',
                filename: filename,
                url: `/uploads/players/${filename}`
            })
        })
    } catch (error) {
        console.error('Erreur upload:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// POST upload image line-up
router.post('/upload/lineup', verifyToken, requireManageGames, (req, res) => {
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
                url: `/uploads/line_ups/${filename}`
            })
        })
    } catch (error) {
        console.error('Erreur upload:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

export default router
