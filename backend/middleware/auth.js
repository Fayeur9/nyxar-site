import jwt from 'jsonwebtoken'
import { fetchUserRoleDetails, aggregatePermissions, hasRole } from '../utils/roles.js'

const UNAUTHORIZED_MESSAGE = 'Accès refusé'

export function verifyToken(req, res, next) {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]

    if (!token) {
        return res.status(401).json({ message: 'Token manquant' })
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        req.user = decoded
        req.userId = decoded.id
        next()
    } catch (err) {
        return res.status(403).json({ message: 'Token invalide' })
    }
}

// Middleware optionnel : tente de vérifier le token mais ne bloque pas si absent/invalide
export function optionalVerifyToken(req, res, next) {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]
    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET)
            req.user = decoded
            req.userId = decoded.id
        } catch {}
    }
    next()
}

async function loadRoleContext(req) {
    if (!req.userId && req.user?.id) {
        req.userId = req.user.id
    }

    if (req.roleDetails && req.userPermissions) {
        return req.roleDetails
    }

    if (!req.userId) {
        const error = new Error('Utilisateur non authentifié')
        error.statusCode = 401
        throw error
    }

    const roleDetails = await fetchUserRoleDetails(req.userId)
    if (!roleDetails || roleDetails.length === 0) {
        const error = new Error('Aucun rôle assigné')
        error.statusCode = 403
        throw error
    }

    req.roleDetails = roleDetails
    req.userRoles = roleDetails.map((role) => role.name)
    req.userPermissions = aggregatePermissions(roleDetails)
    return roleDetails
}

export async function attachRoleContext(req, res, next) {
    try {
        await loadRoleContext(req)
        next()
    } catch (error) {
        const status = error.statusCode || 500
        const message = status === 500 ? 'Erreur serveur' : error.message
        if (status === 500) {
            console.error('Erreur chargement roles:', error)
        }
        return res.status(status).json({ message })
    }
}

export function requirePermission(permissionKey) {
    return async (req, res, next) => {
        try {
            if (!permissionKey) {
                throw new Error('Permission requise non définie')
            }

            await loadRoleContext(req)

            if (!req.userPermissions?.[permissionKey]) {
                return res.status(403).json({ message: UNAUTHORIZED_MESSAGE })
            }

            next()
        } catch (error) {
            const status = error.statusCode || 500
            const message = status === 500 ? 'Erreur serveur' : error.message
            if (status === 500) {
                console.error('Erreur permission middleware:', error)
            }
            return res.status(status).json({ message })
        }
    }
}

export const requireAdminFull = requirePermission('adminFull')
export const requireManageGames = requirePermission('manageGames')
export const requireViewSite = requirePermission('viewSite')

// Middleware pour les routes accessibles aux rôles 'admin' et 'nyxar' (spécifique NOTY)
export async function requireNyxarOrAdmin(req, res, next) {
    try {
        await loadRoleContext(req)
        const roleDetails = req.roleDetails || []
        if (!hasRole(roleDetails, 'admin') && !hasRole(roleDetails, 'nyxar')) {
            return res.status(403).json({ message: UNAUTHORIZED_MESSAGE })
        }
        next()
    } catch (error) {
        const status = error.statusCode || 500
        const message = status === 500 ? 'Erreur serveur' : error.message
        if (status === 500) console.error('Erreur permission middleware:', error)
        return res.status(status).json({ message })
    }
}
