import { useState, useCallback, useMemo } from 'react'
import { AuthContext } from './AuthContext.js'

function normalizeUser(rawUser) {
    if (!rawUser) {
        return null
    }

    const roles = Array.isArray(rawUser.roles)
        ? rawUser.roles
        : rawUser.role
            ? [rawUser.role]
            : []

    const roleDetails = Array.isArray(rawUser.roleDetails)
        ? rawUser.roleDetails
        : []

    const permissions = {
        manageGames: Boolean(rawUser.permissions?.manageGames),
        adminFull: Boolean(rawUser.permissions?.adminFull),
        viewSite: Boolean(rawUser.permissions?.viewSite)
    }

    const derivedRole = roles.includes('admin')
        ? 'admin'
        : roles[0] || rawUser.role || 'user'

    return {
        ...rawUser,
        roles,
        roleDetails,
        permissions,
        role: derivedRole
    }
}

function loadStoredUser() {
    try {
        const stored = localStorage.getItem('user')
        return stored ? normalizeUser(JSON.parse(stored)) : null
    } catch {
        return null
    }
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(loadStoredUser)
    const [token, setToken] = useState(() => localStorage.getItem('token') || null)
    const loading = false

    const login = useCallback((userData, authToken) => {
        const normalizedUser = normalizeUser(userData)
        setUser(normalizedUser)
        setToken(authToken)
        localStorage.setItem('token', authToken)
        localStorage.setItem('user', JSON.stringify(normalizedUser))
    }, [])

    const logout = useCallback(() => {
        setUser(null)
        setToken(null)
        localStorage.removeItem('token')
        localStorage.removeItem('user')
    }, [])

    // Mettre à jour les données utilisateur (après modification du profil)
    const updateUser = useCallback((userData) => {
        const normalizedUser = normalizeUser(userData)
        setUser(normalizedUser)
        localStorage.setItem('user', JSON.stringify(normalizedUser))
    }, [])

    // Ajout d'une fonction pour vérifier si l'utilisateur est admin
    const isAdmin = useCallback(() => Boolean(user?.permissions?.adminFull), [user])

    const hasPermission = useCallback((permissionKey) => {
        if (!permissionKey) return false
        return Boolean(user?.permissions?.[permissionKey])
    }, [user])

    const canViewSite = hasPermission('viewSite')

    const contextValue = useMemo(() => ({
        user,
        token,
        loading,
        login,
        logout,
        updateUser,
        isAdmin,
        hasPermission,
        canViewSite
    }), [user, token, loading, login, logout, updateUser, isAdmin, hasPermission, canViewSite])

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    )
}
