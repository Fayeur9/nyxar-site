import express from 'express'
import jwt from 'jsonwebtoken'
import pool from '../db.js'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = express.Router()

// Helper pour génerer un nom de fichier unique
const generateUniqueFilename = (originalFilename) => {
    const ext = path.extname(originalFilename)
    const name = Date.now() + '-' + Math.random().toString(36).substring(2, 8)
    return name + ext
}

// Middleware pour vérifier le JWT
const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1]
    
    if (!token) {
        return res.status(401).json({ message: 'Token manquant' })
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        req.userId = decoded.id
        next()
    } catch (error) {
        console.error('Token verification error:', error.message)
        return res.status(401).json({ message: `Token invalide: ${error.message}` })
    }
}

// Middleware pour vérifier le rôle admin
const checkAdminOnly = async (req, res, next) => {
    try {
        const [userRoles] = await pool.query(
            'SELECT r.name FROM role r JOIN role_user ru ON r.id = ru.role_id WHERE ru.user_id = ?',
            [req.userId]
        )

        if (userRoles.length === 0) {
            console.error(`No roles found for user ${req.userId}`)
            return res.status(403).json({ message: 'Accès réservé aux admins (pas de rôle assigné)' })
        }

        const roles = userRoles.map(r => r.name)
        if (!roles.includes('admin')) {
            console.error(`User ${req.userId} has roles [${roles.join(', ')}] but admin required`)
            return res.status(403).json({ message: `Accès réservé aux admins (rôle actuel: ${roles.join(', ')})` })
        }

        req.userRoles = roles
        next()
    } catch (error) {
        console.error('Erreur vérification admin:', error)
        return res.status(500).json({ message: `Erreur serveur: ${error.message}` })
    }
}

// --- Gestion Wordle: mot du jour ---

// Récupérer les derniers mots du jour (pour l'admin)
router.get('/wordle/daily-word', verifyToken, checkAdminOnly, async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT id, word, effective_date
             FROM daily_words
             ORDER BY effective_date DESC
             LIMIT 30`
        )
        res.json(rows)
    } catch (error) {
        console.error('Erreur récupération mots du jour Wordle:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// Définir / mettre à jour le mot du jour
router.post('/wordle/daily-word', verifyToken, checkAdminOnly, async (req, res) => {
    try {
        let { word, date } = req.body

        if (!word) {
            return res.status(400).json({ message: 'Mot requis' })
        }

        word = String(word).trim().toUpperCase()

        if (word.length < 5 || word.length > 8) {
            return res.status(400).json({ message: 'Le mot doit faire entre 5 et 8 lettres' })
        }

        const effectiveDate = date || new Date().toISOString().slice(0, 10)
        const mode = req.body.mode || 'simple'

        await pool.query(
            `INSERT INTO daily_words (word, mode, effective_date)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE word = VALUES(word)`,
            [word, mode, effectiveDate]
        )

        res.json({ success: true, word, mode, effective_date: effectiveDate })
    } catch (error) {
        console.error('Erreur définition mot du jour Wordle:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// GET tous les utilisateurs avec leurs rôles et player lié
router.get('/users', verifyToken, checkAdminOnly, async (req, res) => {
    try {
        const [users] = await pool.query(`
            SELECT 
                u.id,
                u.username,
                u.email,
                u.created_at,
                u.trackmania_io_url,
                n.id as player_id,
                n.pseudo,
                n.image_url
            FROM users u
            LEFT JOIN nyxariens n ON u.id = n.user_id
            WHERE u.is_deleted = 0
            ORDER BY u.created_at DESC
        `)

        // Récupérer les rôles pour chaque utilisateur
        const usersWithRoles = await Promise.all(
            users.map(async (user) => {
                const [roles] = await pool.query(
                    'SELECT r.id, r.name FROM role r JOIN role_user ru ON r.id = ru.role_id WHERE ru.user_id = ?',
                    [user.id]
                )
                return {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    created_at: user.created_at,
                    trackmaniaLink: user.trackmania_io_url || null,
                    player: user.player_id ? {
                        id: user.player_id,
                        pseudo: user.pseudo,
                        image_url: user.image_url
                    } : null,
                    roles: roles.map(r => ({ id: r.id, name: r.name }))
                }
            })
        )

        res.json(usersWithRoles)
    } catch (error) {
        console.error('Erreur récupération utilisateurs:', error)
        res.status(500).json({ message: `Erreur serveur: ${error.message}` })
    }
})

// GET tous les rôles disponibles
router.get('/roles', verifyToken, checkAdminOnly, async (req, res) => {
    try {
        const [roles] = await pool.query('SELECT id, name, description, color, permissions FROM role ORDER BY name')
        const parsedRoles = roles.map(role => {
            let permissions = {}
            if (role.permissions) {
                try {
                    permissions = JSON.parse(role.permissions)
                } catch (parseError) {
                    console.warn(`Warning: Failed to parse permissions for role ${role.id}:`, parseError.message)
                    permissions = {}
                }
            }
            return {
                ...role,
                permissions
            }
        })
        res.json({ items: parsedRoles, availablePermissions: ['manageGames', 'adminFull', 'viewSite'] })
    } catch (error) {
        console.error('Erreur récupération rôles:', error)
        res.status(500).json({ message: `Erreur serveur: ${error.message}` })
    }
})

// POST créer un nouveau rôle
router.post('/roles', verifyToken, checkAdminOnly, async (req, res) => {
    try {
        const { name, description, color, permissions } = req.body

        if (!name) {
            return res.status(400).json({ message: 'Le nom du rôle est requis' })
        }

        await pool.query(
            'INSERT INTO role (name, description, color, permissions) VALUES (?, ?, ?, ?)',
            [name, description || null, color || '#6C5CE7', JSON.stringify(permissions || {})]
        )

        res.json({ message: 'Rôle créé avec succès' })
    } catch (error) {
        console.error('Erreur création rôle:', error)
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'Un rôle avec ce nom existe déjà' })
        }
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// PUT modifier un rôle
router.put('/roles/:roleId', verifyToken, checkAdminOnly, async (req, res) => {
    try {
        const { roleId } = req.params
        const { name, description, color, permissions } = req.body

        if (!name) {
            return res.status(400).json({ message: 'Le nom du rôle est requis' })
        }

        await pool.query(
            'UPDATE role SET name = ?, description = ?, color = ?, permissions = ? WHERE id = ?',
            [name, description || null, color || '#6C5CE7', JSON.stringify(permissions || {}), roleId]
        )

        res.json({ message: 'Rôle mis à jour avec succès' })
    } catch (error) {
        console.error('Erreur modification rôle:', error)
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'Un rôle avec ce nom existe déjà' })
        }
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// POST assigner un rôle à un utilisateur
router.post('/users/:userId/roles', verifyToken, checkAdminOnly, async (req, res) => {
    try {
        const { userId } = req.params
        const { roleId } = req.body

        if (!roleId) {
            return res.status(400).json({ message: 'roleId requis' })
        }

        // Vérifier que l'utilisateur existe
        const [user] = await pool.query('SELECT id FROM users WHERE id = ?', [userId])
        if (user.length === 0) {
            return res.status(404).json({ message: 'Utilisateur non trouvé' })
        }

        // Vérifier que le rôle existe
        const [role] = await pool.query('SELECT id FROM role WHERE id = ?', [roleId])
        if (role.length === 0) {
            return res.status(404).json({ message: 'Rôle non trouvé' })
        }

        // Vérifier que l'association n'existe pas
        const [existing] = await pool.query(
            'SELECT id FROM role_user WHERE user_id = ? AND role_id = ?',
            [userId, roleId]
        )

        if (existing.length > 0) {
            return res.status(400).json({ message: 'Cet utilisateur a déjà ce rôle' })
        }

        // Ajouter le rôle
        await pool.query(
            'INSERT INTO role_user (user_id, role_id) VALUES (?, ?)',
            [userId, roleId]
        )

        res.json({ message: 'Rôle assigné avec succès' })
    } catch (error) {
        console.error('Erreur assignation rôle:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// DELETE retirer un rôle à un utilisateur
router.delete('/users/:userId/roles/:roleId', verifyToken, checkAdminOnly, async (req, res) => {
    try {
        const { userId, roleId } = req.params

        // Vérifier que l'association existe
        const [existing] = await pool.query(
            'SELECT id FROM role_user WHERE user_id = ? AND role_id = ?',
            [userId, roleId]
        )

        if (existing.length === 0) {
            return res.status(404).json({ message: 'Association rôle-utilisateur non trouvée' })
        }

        // Vérifier que l'utilisateur aura au moins un rôle après suppression
        const [otherRoles] = await pool.query(
            'SELECT COUNT(*) as count FROM role_user WHERE user_id = ?',
            [userId]
        )

        if (otherRoles[0].count === 1) {
            return res.status(400).json({ message: 'Un utilisateur doit avoir au moins un rôle' })
        }

        // Retirer le rôle
        await pool.query(
            'DELETE FROM role_user WHERE user_id = ? AND role_id = ?',
            [userId, roleId]
        )

        res.json({ message: 'Rôle retiré avec succès' })
    } catch (error) {
        console.error('Erreur suppression rôle:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// POST ajouter un rôle à plusieurs utilisateurs en bulk
router.post('/users/bulk/roles', verifyToken, checkAdminOnly, async (req, res) => {
    try {
        const { userIds, roleId } = req.body

        if (!Array.isArray(userIds) || userIds.length === 0 || !roleId) {
            return res.status(400).json({ message: 'userIds (tableau non vide) et roleId requis' })
        }

        // Vérifier que le rôle existe
        const [role] = await pool.query('SELECT id FROM role WHERE id = ?', [roleId])
        if (role.length === 0) {
            return res.status(404).json({ message: 'Rôle non trouvé' })
        }

        // Insérer en ignorant les doublons
        const values = userIds.map(uid => [uid, roleId])
        await pool.query(
            'INSERT IGNORE INTO role_user (user_id, role_id) VALUES ?',
            [values]
        )

        res.json({ message: `Rôle assigné à ${userIds.length} utilisateur(s)` })
    } catch (error) {
        console.error('Erreur assignation rôle en bulk:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// DELETE retirer un rôle à plusieurs utilisateurs en bulk
router.delete('/users/bulk/roles', verifyToken, checkAdminOnly, async (req, res) => {
    try {
        const { userIds, roleId } = req.body

        if (!Array.isArray(userIds) || userIds.length === 0 || !roleId) {
            return res.status(400).json({ message: 'userIds (tableau non vide) et roleId requis' })
        }

        // Vérifier pour chaque user qu'il aura encore au moins 1 rôle après suppression
        const [roleCounts] = await pool.query(
            `SELECT user_id, COUNT(*) as count FROM role_user WHERE user_id IN (?) GROUP BY user_id`,
            [userIds]
        )

        const usersWithOneRole = roleCounts
            .filter(r => r.count <= 1)
            .map(r => r.user_id)

        const usersToUpdate = userIds.filter(uid => !usersWithOneRole.includes(uid))

        if (usersToUpdate.length === 0) {
            return res.status(400).json({
                message: 'Aucun utilisateur modifié : tous n\'ont qu\'un seul rôle',
                skipped: usersWithOneRole
            })
        }

        await pool.query(
            'DELETE FROM role_user WHERE user_id IN (?) AND role_id = ?',
            [usersToUpdate, roleId]
        )

        const skippedCount = userIds.length - usersToUpdate.length
        const msg = skippedCount > 0
            ? `Rôle retiré de ${usersToUpdate.length} utilisateur(s). ${skippedCount} ignoré(s) (rôle unique).`
            : `Rôle retiré de ${usersToUpdate.length} utilisateur(s)`

        res.json({ message: msg, skipped: usersWithOneRole })
    } catch (error) {
        console.error('Erreur suppression rôle en bulk:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// GET tous les joueurs disponibles (non liés ou liés au user actuel)
router.get('/players', verifyToken, checkAdminOnly, async (req, res) => {
    try {
        const [players] = await pool.query(`
            SELECT 
                n.id,
                n.pseudo,
                n.image_url,
                n.user_id,
                u.username
            FROM nyxariens n
            LEFT JOIN users u ON n.user_id = u.id
            WHERE n.is_deleted = 0
            ORDER BY n.pseudo ASC
        `)

        res.json(players)
    } catch (error) {
        console.error('Erreur récupération joueurs:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// PUT mettre à jour un utilisateur (username, trackmaniaLink)
router.put('/users/:userId', verifyToken, checkAdminOnly, async (req, res) => {
    try {
        const { userId } = req.params
        const { username, trackmaniaLink } = req.body

        // Vérifier que l'utilisateur existe
        const [user] = await pool.query('SELECT username FROM users WHERE id = ?', [userId])
        if (user.length === 0) {
            return res.status(404).json({ message: 'Utilisateur non trouvé' })
        }

        const oldUsername = user[0].username

        // Mettre à jour le username
        if (username && username !== oldUsername) {
            // Vérifier l'unicité du nouveau username
            const [existing] = await pool.query('SELECT id FROM users WHERE username = ? AND id != ?', [username, userId])
            if (existing.length > 0) {
                return res.status(400).json({ message: 'Ce nom d\'utilisateur est déjà pris' })
            }

            await pool.query('UPDATE users SET username = ? WHERE id = ?', [username, userId])

            // Si un player est lié, mettre à jour son pseudo
            const [linkedPlayer] = await pool.query('SELECT id FROM nyxariens WHERE user_id = ?', [userId])
            if (linkedPlayer.length > 0) {
                const [existingPseudo] = await pool.query('SELECT id FROM nyxariens WHERE pseudo = ? AND id != ?', [username, linkedPlayer[0].id])
                if (existingPseudo.length > 0) {
                    return res.status(400).json({ message: 'Ce pseudo est déjà pris' })
                }
                await pool.query('UPDATE nyxariens SET pseudo = ? WHERE id = ?', [username, linkedPlayer[0].id])
                console.log(`✓ Pseudo du joueur synchronisé: ${oldUsername} -> ${username}`)
            }
        }

        if (trackmaniaLink !== undefined) {
            const sanitizedLink = typeof trackmaniaLink === 'string' && trackmaniaLink.trim() !== ''
                ? trackmaniaLink.trim()
                : null
            await pool.query('UPDATE users SET trackmania_io_url = ? WHERE id = ?', [sanitizedLink, userId])
        }

        res.json({ message: 'Utilisateur mis à jour avec succès' })
    } catch (error) {
        console.error('Erreur mise à jour utilisateur:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// --- Gestion des défis Guess the Map ---

router.get('/guess-map/challenges', verifyToken, checkAdminOnly, async (req, res) => {
    try {
        const rangeParam = parseInt(req.query.range ?? '30', 10)
        const range = Number.isNaN(rangeParam) ? 30 : Math.min(Math.max(rangeParam, 1), 90)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const endDate = new Date(today)
        endDate.setDate(endDate.getDate() + range)

        const [rows] = await pool.query(
            `SELECT id, challenge_date, difficulty, tmx_id, tmx_url, image_mime, image_data, created_by, created_at, updated_at
             FROM guess_map_challenges
             WHERE challenge_date BETWEEN ? AND ?
             ORDER BY challenge_date ASC`,
            [today.toISOString().split('T')[0], endDate.toISOString().split('T')[0]]
        )

        const challenges = rows.map(row => ({
            id: row.id,
            date: row.challenge_date,
            difficulty: row.difficulty,
            tmxId: row.tmx_id,
            tmxUrl: row.tmx_url,
            imageDataUrl: row.image_data ? `data:${row.image_mime};base64,${row.image_data.toString('base64')}` : null,
            createdBy: row.created_by,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        }))

        res.json(challenges)
    } catch (error) {
        console.error('Erreur récupération défis Guess Map:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// Helper pour valider et extraire image depuis DataURL
const extractImagePayload = (imageDataUrl, maxBytes = 5242880) => {
    if (!imageDataUrl) return { shouldUpdate: false }
    
    try {
        const match = imageDataUrl.match(/^data:image\/([a-z]+);base64,(.+)$/)
        if (!match) throw new Error('Format DataURL invalide')
        
        const [, ext, base64] = match
        const buffer = Buffer.from(base64, 'base64')
        
        if (buffer.length > maxBytes) {
            throw new Error(`L'image est trop volumineuse (max ${maxBytes / 1024 / 1024}MB)`)
        }
        
        return {
            shouldUpdate: true,
            mime: `image/${ext}`,
            buffer
        }
    } catch (err) {
        throw new Error(err.message || 'Erreur traitement image')
    }
}

router.post('/guess-map/challenges', verifyToken, checkAdminOnly, async (req, res) => {
    try {
        const { date, difficulty, tmxId, imageDataUrl } = req.body || {}
        
        if (!date || !date.match(/^\d{4}-\d{2}-\d{2}$/)) {
            return res.status(400).json({ message: 'Date invalide' })
        }
        
        if (!['offert', 'facile', 'moyen', 'difficile', 'introuvable'].includes(difficulty)) {
            return res.status(400).json({ message: 'Difficulté invalide' })
        }
        
        const tmxIdStr = (tmxId ?? '').toString().trim()
        if (!tmxIdStr) {
            return res.status(400).json({ message: 'TMX ID requis' })
        }

        // Vérifier absence de conflit de date
        const [conflict] = await pool.query(
            'SELECT id FROM guess_map_challenges WHERE challenge_date = ?',
            [date]
        )
        if (conflict.length > 0) {
            return res.status(409).json({ message: 'Un défi existe déjà pour cette date' })
        }

        const imagePayload = extractImagePayload(imageDataUrl, 5242880)
        if (!imagePayload.shouldUpdate || !imagePayload.buffer) {
            return res.status(400).json({ message: 'Image requise pour le défi' })
        }

        const tmxUrl = `https://trackmania.exchange/tracks/${encodeURIComponent(tmxIdStr)}`
        const [result] = await pool.query(
            `INSERT INTO guess_map_challenges (challenge_date, difficulty, tmx_id, tmx_url, image_mime, image_data, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [date, difficulty, tmxIdStr, tmxUrl, imagePayload.mime, imagePayload.buffer, req.userId]
        )

        const [rows] = await pool.query(
            `SELECT id, challenge_date, difficulty, tmx_id, tmx_url, image_mime, image_data, created_by, created_at, updated_at
             FROM guess_map_challenges WHERE id = ?`,
            [result.insertId]
        )

        const challenge = rows[0]
        res.status(201).json({
            id: challenge.id,
            date: challenge.challenge_date,
            difficulty: challenge.difficulty,
            tmxId: challenge.tmx_id,
            tmxUrl: challenge.tmx_url,
            imageDataUrl: `data:${challenge.image_mime};base64,${challenge.image_data.toString('base64')}`,
            createdBy: challenge.created_by,
            createdAt: challenge.created_at,
            updatedAt: challenge.updated_at
        })
    } catch (error) {
        console.error('Erreur création défi Guess Map:', error)
        res.status(500).json({ message: error.message || 'Erreur serveur' })
    }
})

router.delete('/guess-map/attempts', verifyToken, checkAdminOnly, async (req, res) => {
    try {
        const { challengeId: challengeParam } = req.query

        let targetChallengeId = null
        if (challengeParam) {
            targetChallengeId = Number.parseInt(challengeParam, 10)
            if (Number.isNaN(targetChallengeId)) {
                return res.status(400).json({ message: 'Identifiant de défi invalide' })
            }
            const [challengeExists] = await pool.query(
                'SELECT id FROM guess_map_challenges WHERE id = ? LIMIT 1',
                [targetChallengeId]
            )
            if (challengeExists.length === 0) {
                return res.status(404).json({ message: 'Défi introuvable' })
            }
        } else {
            const [[latestChallenge]] = await pool.query(
                `SELECT id FROM guess_map_challenges
                 WHERE challenge_date <= CURDATE()
                 ORDER BY challenge_date DESC, created_at DESC
                 LIMIT 1`
            )
            if (!latestChallenge) {
                return res.status(404).json({ message: 'Aucun défi disponible pour réinitialiser les essais.' })
            }
            targetChallengeId = latestChallenge.id
        }

        const [result] = await pool.query(
            'DELETE FROM guess_map_attempts WHERE challenge_id = ?',
            [targetChallengeId]
        )

        res.json({
            success: true,
            clearedAttempts: result.affectedRows,
            challengeId: targetChallengeId
        })
    } catch (error) {
        console.error('Erreur reset global essais Guess Map:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

router.delete('/guess-map/attempts/:userId', verifyToken, checkAdminOnly, async (req, res) => {
    try {
        const { userId } = req.params
        const challengeParam = req.query.challengeId
        const parsedUserId = Number.parseInt(userId, 10)
        if (Number.isNaN(parsedUserId)) {
            return res.status(400).json({ message: 'Identifiant utilisateur invalide' })
        }

        let targetChallengeId = null
        if (challengeParam) {
            targetChallengeId = Number.parseInt(challengeParam, 10)
            if (Number.isNaN(targetChallengeId)) {
                return res.status(400).json({ message: 'Identifiant de défi invalide' })
            }
            const [challengeExists] = await pool.query(
                'SELECT id FROM guess_map_challenges WHERE id = ? LIMIT 1',
                [targetChallengeId]
            )
            if (challengeExists.length === 0) {
                return res.status(404).json({ message: 'Défi introuvable' })
            }
        } else {
            const [[latestChallenge]] = await pool.query(
                `SELECT id FROM guess_map_challenges
                 WHERE challenge_date <= CURDATE()
                 ORDER BY challenge_date DESC, created_at DESC
                 LIMIT 1`
            )
            if (!latestChallenge) {
                return res.status(404).json({ message: 'Aucun défi disponible pour réinitialiser les essais.' })
            }
            targetChallengeId = latestChallenge.id
        }

        const [result] = await pool.query(
            'DELETE FROM guess_map_attempts WHERE challenge_id = ? AND user_id = ?',
            [targetChallengeId, parsedUserId]
        )

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Aucune tentative à réinitialiser pour cet utilisateur.' })
        }

        res.json({
            success: true,
            clearedAttempts: result.affectedRows,
            challengeId: targetChallengeId
        })
    } catch (error) {
        console.error('Erreur reset essais Guess Map:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

router.put('/guess-map/challenges/:challengeId', verifyToken, checkAdminOnly, async (req, res) => {
    try {
        const { challengeId } = req.params
        const { date, difficulty, tmxId, imageDataUrl } = req.body || {}

        const [existing] = await pool.query('SELECT id FROM guess_map_challenges WHERE id = ?', [challengeId])
        if (existing.length === 0) {
            return res.status(404).json({ message: 'Défi introuvable' })
        }

        if (date && !date.match(/^\d{4}-\d{2}-\d{2}$/)) {
            return res.status(400).json({ message: 'Date invalide' })
        }

        if (difficulty && !['offert', 'facile', 'moyen', 'difficile', 'introuvable'].includes(difficulty)) {
            return res.status(400).json({ message: 'Difficulté invalide' })
        }

        const imagePayload = imageDataUrl ? extractImagePayload(imageDataUrl, 5242880) : { shouldUpdate: false }
        const fields = []
        const values = []

        if (date) {
            // Vérifier absence de conflit de date
            const [conflict] = await pool.query(
                'SELECT id FROM guess_map_challenges WHERE challenge_date = ? AND id != ?',
                [date, challengeId]
            )
            if (conflict.length > 0) {
                return res.status(409).json({ message: 'Un autre défi est déjà prévu à cette date' })
            }
            fields.push('challenge_date = ?')
            values.push(date)
        }

        if (difficulty) {
            fields.push('difficulty = ?')
            values.push(difficulty)
        }

        if (tmxId) {
            const tmxIdStr = tmxId.toString().trim()
            fields.push('tmx_id = ?', 'tmx_url = ?')
            values.push(tmxIdStr, `https://trackmania.exchange/tracks/${encodeURIComponent(tmxIdStr)}`)
        }

        if (imagePayload.shouldUpdate) {
            fields.push('image_mime = ?', 'image_data = ?')
            values.push(imagePayload.mime, imagePayload.buffer)
        }

        if (fields.length === 0) {
            return res.status(400).json({ message: 'Aucun champ à mettre à jour' })
        }

        values.push(challengeId)
        await pool.query(`UPDATE guess_map_challenges SET ${fields.join(', ')} WHERE id = ?`, values)

        const [rows] = await pool.query(
            `SELECT id, challenge_date, difficulty, tmx_id, tmx_url, image_mime, image_data, created_by, created_at, updated_at
             FROM guess_map_challenges WHERE id = ?`,
            [challengeId]
        )

        const challenge = rows[0]
        res.json({
            id: challenge.id,
            date: challenge.challenge_date,
            difficulty: challenge.difficulty,
            tmxId: challenge.tmx_id,
            tmxUrl: challenge.tmx_url,
            imageDataUrl: challenge.image_data ? `data:${challenge.image_mime};base64,${challenge.image_data.toString('base64')}` : null,
            createdBy: challenge.created_by,
            createdAt: challenge.created_at,
            updatedAt: challenge.updated_at
        })
    } catch (error) {
        console.error('Erreur modification défi Guess Map:', error)
        res.status(500).json({ message: error.message || 'Erreur serveur' })
    }
})

router.delete('/guess-map/challenges/:challengeId', verifyToken, checkAdminOnly, async (req, res) => {
    try {
        const { challengeId } = req.params

        const [existing] = await pool.query('SELECT id FROM guess_map_challenges WHERE id = ?', [challengeId])
        if (existing.length === 0) {
            return res.status(404).json({ message: 'Défi introuvable' })
        }

        await pool.query('DELETE FROM guess_map_challenges WHERE id = ?', [challengeId])
        res.json({ message: 'Défi supprimé' })
    } catch (error) {
        console.error('Erreur suppression défi Guess Map:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

export default router
