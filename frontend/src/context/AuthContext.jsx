import { createContext, useState, useEffect, useCallback, useMemo } from 'react'

export const AuthContext = createContext()

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [token, setToken] = useState(null)
    const [loading, setLoading] = useState(true)

    const normalizeUser = useCallback((rawUser) => {
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
    }, [])

    // Charger l'utilisateur depuis localStorage
    useEffect(() => {
        const storedToken = localStorage.getItem('token')
        const storedUser = localStorage.getItem('user')

        if (storedToken && storedUser) {
            setToken(storedToken)
            const userData = JSON.parse(storedUser)
            setUser(normalizeUser(userData))
        }
        setLoading(false)
    }, [normalizeUser])

    const login = useCallback((userData, authToken) => {
        const normalizedUser = normalizeUser(userData)
        setUser(normalizedUser)
        setToken(authToken)
        localStorage.setItem('token', authToken)
        localStorage.setItem('user', JSON.stringify(normalizedUser))
    }, [normalizeUser])

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
    }, [normalizeUser])

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
