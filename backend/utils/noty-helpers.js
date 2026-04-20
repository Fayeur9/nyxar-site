import jwt from 'jsonwebtoken'
import pool from '../db.js'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { fetchUserRoleDetails, hasRole } from './roles.js'
import { ensureUploadDir } from './imageUpload.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const UPLOADS_BASE = path.join(__dirname, '../../frontend/public')

export async function logAdminAction(userId, action, targetType, targetId = null, details = null) {
    try {
        await pool.query(
            'INSERT INTO admin_audit_log (user_id, action, target_type, target_id, details) VALUES (?, ?, ?, ?, ?)',
            [userId, action, targetType, targetId, details ? JSON.stringify(details) : null]
        )
    } catch (err) {
        // Ne pas faire échouer la requête principale si le log échoue
        console.error('Erreur log audit:', err.message)
    }
}

/**
 * Déplace un fichier uploadé depuis le dossier temp vers le dossier de la campagne.
 * Ex: /uploads/noty/campaign/temp/file.png → /uploads/noty/campaign/3/file.png
 */
export function moveFromTemp(url, subDir, campaignId) {
    const filename = path.basename(url)
    const oldPath = path.join(UPLOADS_BASE, 'uploads', subDir, 'temp', filename)
    const newDir = ensureUploadDir(`${subDir}/${campaignId}`)
    const newPath = path.join(newDir, filename)

    try {
        if (fs.existsSync(oldPath)) {
            fs.renameSync(oldPath, newPath)
        } else {
            console.warn(`moveFromTemp: fichier source introuvable: ${oldPath}`)
            return url // garder l'URL originale si le fichier source n'existe pas
        }
    } catch (err) {
        console.error('Erreur déplacement fichier temp:', err.message)
        return url // garder l'URL originale en cas d'échec
    }

    return `/uploads/${subDir}/${campaignId}/${filename}`
}

// Cache mémoire pour le Hall of Fame (TTL 5 min)
export let hallOfFameCache = { data: null, timestamp: 0 }
export const HOF_CACHE_TTL = 5 * 60 * 1000

export const hasNyxarOrAdminAccess = (roleDetails = []) =>
    hasRole(roleDetails, 'admin') || hasRole(roleDetails, 'nyxar')

// Middleware optionnel : tente de charger le contexte utilisateur sans imposer l'authentification
export const optionalRoleContext = async (req, res, next) => {
    req.isAuthenticated = false
    req.roleDetails = []
    req.userRoles = []

    const token = req.headers.authorization?.split(' ')[1]
    if (!token) {
        return next()
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        req.user = decoded
        req.userId = decoded.id
        const roleDetails = await fetchUserRoleDetails(decoded.id)
        req.roleDetails = roleDetails
        req.userRoles = roleDetails.map((role) => role.name)
        req.isAuthenticated = true
    } catch (error) {
        console.error('Token invalide (optional noty):', error)
    }

    next()
}

// Génère les colonnes SQL de calcul de points NOTY pour une référence de colonne donnée.
// ref est toujours une référence SQL (ex: 'p.id', '-cn.id') — jamais une entrée utilisateur.
export function pointsColumns(ref) {
    return `SUM(CASE WHEN v.first_choice = ${ref} THEN 3 ELSE 0 END) +
                        SUM(CASE WHEN v.second_choice = ${ref} THEN 2 ELSE 0 END) +
                        SUM(CASE WHEN v.third_choice = ${ref} THEN 1 ELSE 0 END) as total_points,
                        SUM(CASE WHEN v.first_choice = ${ref} THEN 1 ELSE 0 END) as first_count,
                        SUM(CASE WHEN v.second_choice = ${ref} THEN 1 ELSE 0 END) as second_count,
                        SUM(CASE WHEN v.third_choice = ${ref} THEN 1 ELSE 0 END) as third_count,
                        COUNT(DISTINCT v.id) as vote_count`
}

// Helper : résultats de plusieurs catégories en batch (évite N+1)
// Prend un tableau de catégories {id, nominee_type} et un campaignId optionnel.
// Retourne un map { categoryId → results[] } trié par points desc.
export async function fetchCategoryResultsBatch(categories, campaignId = null) {
    if (!categories || categories.length === 0) return {}

    const campaignFilter = campaignId ? ' AND v.noty_campaign_id = ?' : ''
    const campaignParam = campaignId ? [campaignId] : []

    const playerCatIds = categories
        .filter(c => !c.nominee_type || c.nominee_type === 'player')
        .map(c => c.id)

    const customCatIds = categories
        .filter(c => c.nominee_type && c.nominee_type !== 'player')
        .map(c => c.id)

    const results = {}
    for (const c of categories) results[c.id] = []

    const queries = []

    if (playerCatIds.length > 0) {
        // Joueurs nominés dans les catégories de type "player"
        queries.push(
            pool.query(
                `SELECT v.category_id, p.id, p.pseudo, p.image_url, ${pointsColumns('p.id')}
                 FROM nyxariens p
                 JOIN votes v ON v.category_id IN (?)${campaignFilter}
                    AND v.is_deleted = 0
                    AND (v.first_choice = p.id OR v.second_choice = p.id OR v.third_choice = p.id)
                 WHERE p.is_deleted = 0
                 GROUP BY v.category_id, p.id`,
                [playerCatIds, ...campaignParam]
            ).then(([rows]) => rows)
        )

        // Custom nominees dans les catégories de type "player" (IDs négatifs)
        queries.push(
            pool.query(
                `SELECT v.category_id, -cn.id as id, cn.title as pseudo, cn.media_url as image_url, ${pointsColumns('-cn.id')}
                 FROM custom_nominees cn
                 JOIN votes v ON v.category_id IN (?)${campaignFilter}
                    AND v.is_deleted = 0
                    AND cn.category_id = v.category_id
                    AND (v.first_choice = -cn.id OR v.second_choice = -cn.id OR v.third_choice = -cn.id)
                 WHERE cn.is_deleted = 0
                 GROUP BY v.category_id, cn.id`,
                [playerCatIds, ...campaignParam]
            ).then(([rows]) => rows)
        )
    }

    if (customCatIds.length > 0) {
        // Custom nominees dans les catégories non-player (image, sound, video, url)
        queries.push(
            pool.query(
                `SELECT v.category_id, cn.id, cn.title as pseudo, cn.media_url as image_url, ${pointsColumns('cn.id')}
                 FROM custom_nominees cn
                 JOIN votes v ON v.category_id IN (?)${campaignFilter}
                    AND v.is_deleted = 0
                    AND cn.category_id = v.category_id
                    AND (v.first_choice = cn.id OR v.second_choice = cn.id OR v.third_choice = cn.id)
                 WHERE cn.is_deleted = 0
                 GROUP BY v.category_id, cn.id`,
                [customCatIds, ...campaignParam]
            ).then(([rows]) => rows)
        )
    }

    const allRows = (await Promise.all(queries)).flat()
    for (const row of allRows) {
        if (results[row.category_id] !== undefined) {
            results[row.category_id].push(row)
        }
    }

    // Trier chaque catégorie par points DESC, puis tie-breaking
    for (const catId of Object.keys(results)) {
        results[catId].sort((a, b) => {
            const ptsDiff = parseFloat(b.total_points || 0) - parseFloat(a.total_points || 0)
            if (ptsDiff !== 0) return ptsDiff
            const firstDiff = (b.first_count || 0) - (a.first_count || 0)
            if (firstDiff !== 0) return firstDiff
            const secondDiff = (b.second_count || 0) - (a.second_count || 0)
            if (secondDiff !== 0) return secondDiff
            return (b.third_count || 0) - (a.third_count || 0)
        })
    }

    return results
}

// Helper : résultats d'une catégorie (type-aware)
export async function fetchCategoryResults(categoryId, nomineeType, campaignId = null) {
    const campaignFilter = campaignId ? ' AND v.noty_campaign_id = ?' : ''
    const campaignParams = campaignId ? [campaignId] : []

    if (nomineeType === 'player') {
        const [results] = await pool.query(
            `SELECT id, pseudo, image_url, total_points, first_count, second_count, third_count, vote_count FROM (
                SELECT p.id, p.pseudo, p.image_url, ${pointsColumns('p.id')}
                FROM nyxariens p
                JOIN votes v ON v.category_id = ?${campaignFilter}
                    AND v.is_deleted = 0
                    AND (v.first_choice = p.id OR v.second_choice = p.id OR v.third_choice = p.id)
                WHERE p.is_deleted = 0
                GROUP BY p.id

                UNION ALL

                SELECT -cn.id as id, cn.title as pseudo, cn.media_url as image_url, ${pointsColumns('-cn.id')}
                FROM custom_nominees cn
                JOIN votes v ON v.category_id = ?${campaignFilter}
                    AND v.is_deleted = 0
                    AND (v.first_choice = -cn.id OR v.second_choice = -cn.id OR v.third_choice = -cn.id)
                WHERE cn.category_id = ? AND cn.is_deleted = 0
                GROUP BY cn.id
            ) combined
            ORDER BY total_points DESC, first_count DESC, second_count DESC, third_count DESC`,
            [categoryId, ...campaignParams, categoryId, ...campaignParams, categoryId]
        )
        return results
    }

    // Custom nominees (image, sound, video, url)
    const [results] = await pool.query(
        `SELECT cn.id, cn.title AS pseudo, cn.media_url AS image_url, ${pointsColumns('cn.id')}
         FROM custom_nominees cn
         JOIN votes v ON v.category_id = ?${campaignFilter}
            AND v.is_deleted = 0
            AND (v.first_choice = cn.id OR v.second_choice = cn.id OR v.third_choice = cn.id)
         WHERE cn.category_id = ? AND cn.is_deleted = 0
         GROUP BY cn.id
         ORDER BY total_points DESC, first_count DESC, second_count DESC, third_count DESC`,
        [categoryId, ...campaignParams, categoryId]
    )
    return results
}
