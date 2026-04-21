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


export default router
