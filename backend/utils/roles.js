import pool from '../db.js'

export const ROLE_PERMISSION_KEYS = ['manageGames', 'adminFull', 'viewSite']
export const DEFAULT_ROLE_COLOR = '#6C5CE7'

export function parseRolePermissions(rawValue) {
    if (!rawValue) {
        return {}
    }
    if (typeof rawValue === 'object' && !Array.isArray(rawValue)) {
        return rawValue
    }
    try {
        return JSON.parse(rawValue)
    } catch (error) {
        return {}
    }
}

export function sanitizePermissions(input = {}) {
    const permissions = {}
    ROLE_PERMISSION_KEYS.forEach((key) => {
        permissions[key] = Boolean(input[key])
    })
    return permissions
}

export function normalizeRoleRow(row = {}) {
    return {
        id: row.id,
        name: row.name,
        description: row.description,
        color: row.color || DEFAULT_ROLE_COLOR,
        permissions: sanitizePermissions(parseRolePermissions(row.permissions)),
        created_at: row.created_at,
        updated_at: row.updated_at
    }
}

export async function fetchUserRoleDetails(userId) {
    const [rows] = await pool.query(
        `SELECT r.id, r.name, r.description, r.color, r.permissions
         FROM role r
         INNER JOIN role_user ru ON r.id = ru.role_id
         WHERE ru.user_id = ?`,
        [userId]
    )
    return rows.map(normalizeRoleRow)
}

export function aggregatePermissions(roleDetails = []) {
    const aggregated = {
        manageGames: false,
        adminFull: false,
        viewSite: false
    }

    roleDetails.forEach((role) => {
        if (role.name === 'admin') {
            aggregated.manageGames = true
            aggregated.adminFull = true
            aggregated.viewSite = true
        }
        if (role.name === 'moderator') {
            aggregated.viewSite = true
        }

        const permissions = sanitizePermissions(role.permissions)
        ROLE_PERMISSION_KEYS.forEach((key) => {
            if (permissions[key]) {
                aggregated[key] = true
            }
        })
    })

    return aggregated
}

export function hasPermission(roleDetails = [], permissionKey) {
    if (!ROLE_PERMISSION_KEYS.includes(permissionKey)) {
        return false
    }
    const permissions = aggregatePermissions(roleDetails)
    return Boolean(permissions[permissionKey])
}

export function hasRole(roleDetails = [], roleName) {
    return roleDetails.some((role) => role.name === roleName)
}
