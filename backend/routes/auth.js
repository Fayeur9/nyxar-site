import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import rateLimit from 'express-rate-limit'
import pool from '../db.js'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import fileUpload from 'express-fileupload'
import { fetchUserRoleDetails, aggregatePermissions } from '../utils/roles.js'
import { deleteImageFile } from '../utils/imageUpload.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = express.Router()

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { message: 'Trop de tentatives, réessayez dans 15 minutes' }
})

// Dossier pour les uploads de profils utilisateurs
const profileUploadsDir = path.join(__dirname, '../../frontend/public/uploads/users')
if (!fs.existsSync(profileUploadsDir)) {
    fs.mkdirSync(profileUploadsDir, { recursive: true })
}

// Middleware pour vérifier le JWT
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]

    if (!token) {
        return res.status(401).json({ message: 'Token requis' })
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Token invalide' })
        }
        req.user = user
        next()
    })
}

// Récupérer les rôles détaillés et permissions d'un utilisateur
async function getUserRoleContext(userId) {
    try {
        const roleDetails = await fetchUserRoleDetails(userId)
        return {
            roleDetails,
            roleNames: roleDetails.map(role => role.name),
            permissions: aggregatePermissions(roleDetails)
        }
    } catch (error) {
        console.error('Erreur fetch rôles:', error)
        return {
            roleDetails: [],
            roleNames: [],
            permissions: {
                manageGames: false,
                adminFull: false,
                viewSite: false
            }
        }
    }
}

// Register
router.post('/register', authLimiter, async (req, res) => {
    try {
        const { username, email, password } = req.body

        if (!username || !email || !password) {
            return res.status(400).json({ message: 'Tous les champs sont requis' })
        }

        // Vérifier si l'utilisateur existe
        const userExists = await pool.query(
            'SELECT * FROM users WHERE email = ? OR username = ?',
            [email, username]
        )

        if (userExists[0].length > 0) {
            return res.status(400).json({ message: 'Email ou username déjà utilisé' })
        }

        // Hacher le password
        const hashedPassword = await bcrypt.hash(password, 10)

        // Créer l'utilisateur
        const [result] = await pool.query(
            'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
            [username, email, hashedPassword]
        )

        const userId = result.insertId

        // Assigner le rôle 'user' par défaut
        const [roleResult] = await pool.query(
            'SELECT id FROM role WHERE name = ?',
            ['user']
        )

        if (roleResult.length > 0) {
            await pool.query(
                'INSERT INTO role_user (user_id, role_id) VALUES (?, ?)',
                [userId, roleResult[0].id]
            )
        }

        const { roleDetails, roleNames, permissions } = await getUserRoleContext(userId)

        const user = {
            id: userId,
            username,
            email,
            image_url: null,
            roles: roleNames,
            roleDetails,
            permissions
        }

        // Créer le JWT
        const token = jwt.sign(
            { id: user.id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        )

        res.json({
            message: 'Inscription réussie',
            user,
            token
        })
    } catch (error) {
        console.error('Erreur register:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// Login
router.post('/login', authLimiter, async (req, res) => {
    try {
        const { username, password } = req.body

        if (!username || !password) {
            return res.status(400).json({ message: 'Username et password requis' })
        }

        // Chercher l'utilisateur
        const result = await pool.query(
            'SELECT * FROM users WHERE username = ? OR email = ?',
            [username, username]
        )

        if (result[0].length === 0) {
            return res.status(401).json({ message: 'Identifiants invalides' })
        }

        const user = result[0][0]

        // Vérifier le password
        const passwordValid = await bcrypt.compare(password, user.password_hash)

        if (!passwordValid) {
            return res.status(401).json({ message: 'Identifiants invalides' })
        }

        // Récupérer les rôles détaillés
        const { roleDetails, roleNames, permissions } = await getUserRoleContext(user.id)

        // Créer le JWT
        const token = jwt.sign(
            { id: user.id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        )

        res.json({
            message: 'Connexion réussie',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                image_url: user.image_url,
                roles: roleNames,
                roleDetails,
                permissions
            },
            token
        })
    } catch (error) {
        console.error('Erreur login:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// Récupérer le profil de l'utilisateur connecté
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const [result] = await pool.query(
            'SELECT id, username, email, image_url, created_at FROM users WHERE id = ? AND is_deleted = 0',
            [req.user.id]
        )

        if (result.length === 0) {
            return res.status(404).json({ message: 'Utilisateur non trouvé' })
        }

        const user = result[0]
        const { roleDetails, roleNames, permissions } = await getUserRoleContext(user.id)

        res.json({
            user: { ...user, roles: roleNames, roleDetails, permissions }
        })
    } catch (error) {
        console.error('Erreur fetch profil:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// Mettre à jour le profil (pseudo et image)
router.put('/profile', authenticateToken, async (req, res) => {
    try {
        const { username, image_url } = req.body
        const userId = req.user.id

        // Vérifier si le nouveau username est déjà pris (si changé)
        if (username) {
            const [existing] = await pool.query(
                'SELECT id FROM users WHERE username = ? AND id != ? AND is_deleted = 0',
                [username, userId]
            )
            if (existing.length > 0) {
                return res.status(400).json({ message: 'Ce pseudo est déjà utilisé' })
            }
        }

        // Si on change l'image, supprimer l'ancienne du système de fichiers
        if (image_url !== undefined) {
            const [currentUser] = await pool.query(
                'SELECT image_url FROM users WHERE id = ?',
                [userId]
            )
            const oldImageUrl = currentUser[0]?.image_url

            if (oldImageUrl && oldImageUrl !== image_url) {
                deleteImageFile(oldImageUrl, 'users')
            }
        }

        // Construire la requête de mise à jour
        const updates = []
        const values = []

        if (username) {
            updates.push('username = ?')
            values.push(username)
        }
        if (image_url !== undefined) {
            updates.push('image_url = ?')
            values.push(image_url)
        }

        if (updates.length === 0) {
            return res.status(400).json({ message: 'Aucune donnée à mettre à jour' })
        }

        values.push(userId)
        await pool.query(
            `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
            values
        )

        // Récupérer l'utilisateur mis à jour
        const [result] = await pool.query(
            'SELECT id, username, email, image_url FROM users WHERE id = ?',
            [userId]
        )

        const { roleDetails, roleNames, permissions } = await getUserRoleContext(userId)

        res.json({
            message: 'Profil mis à jour',
            user: { ...result[0], roles: roleNames, roleDetails, permissions }
        })
    } catch (error) {
        console.error('Erreur mise à jour profil:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// Changer le mot de passe
router.post('/change-password', authenticateToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body
        const userId = req.user.id

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Mot de passe actuel et nouveau mot de passe requis' })
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'Le nouveau mot de passe doit contenir au moins 6 caractères' })
        }

        // Récupérer le mot de passe actuel
        const [result] = await pool.query(
            'SELECT password_hash FROM users WHERE id = ? AND is_deleted = 0',
            [userId]
        )

        if (result.length === 0) {
            return res.status(404).json({ message: 'Utilisateur non trouvé' })
        }

        // Vérifier le mot de passe actuel
        const passwordValid = await bcrypt.compare(currentPassword, result[0].password_hash)
        if (!passwordValid) {
            return res.status(401).json({ message: 'Mot de passe actuel incorrect' })
        }

        // Hacher le nouveau mot de passe
        const hashedPassword = await bcrypt.hash(newPassword, 10)

        // Mettre à jour le mot de passe
        await pool.query(
            'UPDATE users SET password_hash = ? WHERE id = ?',
            [hashedPassword, userId]
        )

        res.json({ message: 'Mot de passe modifié avec succès' })
    } catch (error) {
        console.error('Erreur changement mot de passe:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

// Upload d'image de profil
router.post('/upload/profile', authenticateToken, async (req, res) => {
    try {
        if (!req.files || !req.files.image) {
            return res.status(400).json({ message: 'Aucune image fournie' })
        }

        const image = req.files.image
        const ext = path.extname(image.name)
        const sanitizedName = image.name.replace(ext, '').replace(/[^a-zA-Z0-9]/g, '_')
        const filename = `${sanitizedName}-${Date.now()}${ext}`
        const filepath = path.join(profileUploadsDir, filename)

        await image.mv(filepath)

        const url = `/uploads/users/${filename}`

        res.json({ url })
    } catch (error) {
        console.error('Erreur upload image profil:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

export default router
export { authenticateToken }
