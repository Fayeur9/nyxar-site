import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react'
import { AuthContext } from '../../context/AuthContext'
import { API_URL } from '../../services/api'

const EMPTY_EDIT_DATA = {
    username: '',
    roles: [],
    trackmaniaLink: ''
}

const USERS_PER_PAGE = 10

const UserManagementTable = () => {
    const { token, loading: authLoading } = useContext(AuthContext)
    const [users, setUsers] = useState([])
    const [roles, setRoles] = useState([])
    const [tableLoading, setTableLoading] = useState(true)
    const [error, setError] = useState(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [filterRoleId, setFilterRoleId] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [selectedUserIds, setSelectedUserIds] = useState(new Set())
    const [bulkRoleUpdating, setBulkRoleUpdating] = useState(false)
    const [editingUserId, setEditingUserId] = useState(null)
    const [editData, setEditData] = useState({ ...EMPTY_EDIT_DATA })
    const [isSaving, setIsSaving] = useState(false)
    const [isRoleUpdating, setIsRoleUpdating] = useState(false)
    const [linkModalUser, setLinkModalUser] = useState(null)
    const [linkModalValue, setLinkModalValue] = useState('')
    const [linkModalSaving, setLinkModalSaving] = useState(false)
    const [linkModalError, setLinkModalError] = useState(null)

    useEffect(() => {
        if (authLoading) return

        if (!token) {
            setUsers([])
            setRoles([])
            setTableLoading(false)
            return
        }

        loadData()
    }, [token, authLoading])

    const loadData = async () => {
        setTableLoading(true)
        setError(null)
        try {
            await Promise.all([fetchUsers(), fetchRoles()])
        } catch {
            // L'erreur est déjà stockée dans setError
        } finally {
            setTableLoading(false)
        }
    }

    const fetchUsers = async () => {
        try {
            const response = await fetch(`${API_URL}/api/admin/users`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            })
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error(errorData.message || `Erreur ${response.status}: recuperation utilisateurs`)
            }
            const data = await response.json()
            setUsers(data)
        } catch (err) {
            setUsers([])
            setError(err.message)
            console.error('Erreur chargement utilisateurs:', err)
        }
    }

    const fetchRoles = async () => {
        try {
            const response = await fetch(`${API_URL}/api/admin/roles`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            })
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error(errorData.message || `Erreur ${response.status}: recuperation roles`)
            }
            const data = await response.json()
            // API retourne { items: [], availablePermissions: [] }
            setRoles(data.items || data)
        } catch (err) {
            console.error('Erreur chargement roles:', err)
            setRoles([])
        }
    }

    const filteredUsers = useMemo(() => {
        let result = users

        if (filterRoleId) {
            const roleId = parseInt(filterRoleId, 10)
            result = result.filter((user) =>
                user.roles.some((role) => role.id === roleId)
            )
        }

        const query = searchTerm.trim().toLowerCase()
        if (query) {
            result = result.filter((user) => {
                const usernameMatch = user.username?.toLowerCase().includes(query)
                const emailMatch = user.email?.toLowerCase().includes(query)
                const playerMatch = user.player?.pseudo?.toLowerCase().includes(query)
                const linkMatch = user.trackmaniaLink?.toLowerCase().includes(query)
                return usernameMatch || emailMatch || playerMatch || linkMatch
            })
        }

        return result
    }, [searchTerm, filterRoleId, users])

    const totalPages = Math.max(1, Math.ceil(filteredUsers.length / USERS_PER_PAGE))

    const paginatedUsers = useMemo(() => {
        const start = (currentPage - 1) * USERS_PER_PAGE
        return filteredUsers.slice(start, start + USERS_PER_PAGE)
    }, [filteredUsers, currentPage])

    // Reset page quand les filtres changent
    useEffect(() => {
        setCurrentPage(1)
    }, [searchTerm, filterRoleId])

    // Selection helpers
    const allPageSelected = paginatedUsers.length > 0 && paginatedUsers.every((u) => selectedUserIds.has(u.id))

    const toggleSelectUser = useCallback((userId) => {
        setSelectedUserIds((prev) => {
            const next = new Set(prev)
            if (next.has(userId)) {
                next.delete(userId)
            } else {
                next.add(userId)
            }
            return next
        })
    }, [])

    const toggleSelectAllPage = useCallback(() => {
        setSelectedUserIds((prev) => {
            const next = new Set(prev)
            if (allPageSelected) {
                paginatedUsers.forEach((u) => next.delete(u.id))
            } else {
                paginatedUsers.forEach((u) => next.add(u.id))
            }
            return next
        })
    }, [allPageSelected, paginatedUsers])

    const handleBulkAddRole = async (roleId) => {
        if (!roleId || selectedUserIds.size === 0 || bulkRoleUpdating) return
        setBulkRoleUpdating(true)
        try {
            const response = await fetch(`${API_URL}/api/admin/users/bulk/roles`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    userIds: Array.from(selectedUserIds),
                    roleId: parseInt(roleId, 10)
                })
            })
            if (!response.ok) {
                const err = await response.json().catch(() => ({}))
                throw new Error(err.message || 'Erreur ajout role en bulk')
            }
            setSelectedUserIds(new Set())
            await loadData()
        } catch (err) {
            console.error('Erreur bulk add role:', err)
            alert('Erreur: ' + err.message)
        } finally {
            setBulkRoleUpdating(false)
        }
    }

    const handleBulkRemoveRole = async (roleId) => {
        if (!roleId || selectedUserIds.size === 0 || bulkRoleUpdating) return
        setBulkRoleUpdating(true)
        try {
            const response = await fetch(`${API_URL}/api/admin/users/bulk/roles`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    userIds: Array.from(selectedUserIds),
                    roleId: parseInt(roleId, 10)
                })
            })
            const data = await response.json()
            if (!response.ok) {
                throw new Error(data.message || 'Erreur suppression role en bulk')
            }
            if (data.skipped?.length > 0) {
                alert(data.message)
            }
            setSelectedUserIds(new Set())
            await loadData()
        } catch (err) {
            console.error('Erreur bulk remove role:', err)
            alert('Erreur: ' + err.message)
        } finally {
            setBulkRoleUpdating(false)
        }
    }

    const resetModal = () => {
        setEditingUserId(null)
        setEditData({ ...EMPTY_EDIT_DATA })
        setIsSaving(false)
        setIsRoleUpdating(false)
    }

    const handleEdit = (user) => {
        if (!user) return
        setEditingUserId(user.id)
        setEditData({
            username: user.username || '',
            roles: user.roles || [],
            trackmaniaLink: user.trackmaniaLink || ''
        })
    }

    const handleSave = async () => {
        if (!editData.username?.trim()) {
            alert("Le nom d'utilisateur est requis")
            return
        }

        setIsSaving(true)
        try {
            const response = await fetch(`${API_URL}/api/admin/users/${editingUserId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    username: editData.username.trim(),
                    trackmaniaLink: editData.trackmaniaLink
                })
            })

            if (!response.ok) {
                const errorResponse = await response.json()
                throw new Error(errorResponse.message || 'Erreur mise a jour utilisateur')
            }

            resetModal()
            await loadData()
            alert('Utilisateur mis a jour avec succes')
        } catch (err) {
            console.error('Erreur:', err)
            setIsSaving(false)
            alert('Erreur: ' + err.message)
        }
    }

    const handleCancel = () => {
        resetModal()
    }

    const handleAddRole = async (roleId) => {
        if (!roleId || !editingUserId || isRoleUpdating) return
        setIsRoleUpdating(true)
        try {
            const response = await fetch(`${API_URL}/api/admin/users/${editingUserId}/roles`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ roleId: parseInt(roleId, 10) })
            })
            if (!response.ok) throw new Error('Erreur ajout role')

            const roleToAdd = roles.find((role) => role.id === parseInt(roleId, 10))
            if (roleToAdd && !editData.roles.some((role) => role.id === roleToAdd.id)) {
                setEditData((prev) => ({
                    ...prev,
                    roles: [...prev.roles, roleToAdd]
                }))
            }
        } catch (err) {
            console.error('Erreur:', err)
            alert('Erreur: ' + err.message)
        } finally {
            setIsRoleUpdating(false)
        }
    }

    const handleRemoveRole = async (roleId) => {
        if (!editingUserId || isRoleUpdating) return
        setIsRoleUpdating(true)
        try {
            const response = await fetch(`${API_URL}/api/admin/users/${editingUserId}/roles/${roleId}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`
                }
            })
            if (!response.ok) throw new Error('Erreur suppression role')

            setEditData((prev) => ({
                ...prev,
                roles: prev.roles.filter((role) => role.id !== roleId)
            }))
        } catch (err) {
            console.error('Erreur:', err)
            alert('Erreur: ' + err.message)
        } finally {
            setIsRoleUpdating(false)
        }
    }

    const openLinkModal = (user) => {
        if (!user) return
        setLinkModalUser(user)
        setLinkModalValue(user.trackmaniaLink || '')
        setLinkModalError(null)
        setLinkModalSaving(false)
    }

    const closeLinkModal = () => {
        setLinkModalUser(null)
        setLinkModalValue('')
        setLinkModalSaving(false)
        setLinkModalError(null)
    }

    const handleLinkSave = async () => {
        if (!linkModalUser) return

        const payload = {
            username: linkModalUser.username,
            trackmaniaLink: linkModalValue.trim() ? linkModalValue.trim() : null
        }

        setLinkModalSaving(true)
        setLinkModalError(null)

        try {
            const response = await fetch(`${API_URL}/api/admin/users/${linkModalUser.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error(errorData.message || 'Erreur mise a jour lien Trackmania')
            }

            closeLinkModal()
            await loadData()
        } catch (err) {
            console.error('Erreur mise a jour lien Trackmania:', err)
            setLinkModalSaving(false)
            setLinkModalError(err.message)
        }
    }

    const isLoading = authLoading || tableLoading
    const hasUsers = filteredUsers.length > 0
    const hasActiveFilters = searchTerm || filterRoleId

    return (
        <div>
            <div className="c-admin-filters">
                <div className="f-field c-admin-filters__search">
                    <label htmlFor="user-search">Rechercher</label>
                    <input
                        id="user-search"
                        type="text"
                        placeholder="Nom d'utilisateur, email ou joueur"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="f-field c-admin-filters__role">
                    <label htmlFor="user-role-filter">Filtrer par role</label>
                    <select
                        id="user-role-filter"
                        value={filterRoleId}
                        onChange={(e) => setFilterRoleId(e.target.value)}
                    >
                        <option value="">Tous les roles</option>
                        {roles.map((role) => (
                            <option key={role.id} value={role.id}>{role.name}</option>
                        ))}
                    </select>
                </div>
                <div className="c-admin-filters__meta">
                    {filteredUsers.length} / {users.length} utilisateurs
                </div>
                {hasActiveFilters && (
                    <div className="c-admin-filters__actions">
                        <button
                            type="button"
                            className="c-admin-button c-admin-button--sm c-admin-button--secondary"
                            onClick={() => { setSearchTerm(''); setFilterRoleId('') }}
                        >
                            Effacer les filtres
                        </button>
                    </div>
                )}
            </div>

            {selectedUserIds.size > 0 && (
                <div className="c-bulk-actions">
                    <span className="c-bulk-actions__count">
                        {selectedUserIds.size} utilisateur{selectedUserIds.size > 1 ? 's' : ''} selectionne{selectedUserIds.size > 1 ? 's' : ''}
                    </span>
                    <div className="c-bulk-actions__group">
                        <select
                            id="bulk-add-role"
                            defaultValue=""
                            onChange={(e) => {
                                if (e.target.value) {
                                    handleBulkAddRole(e.target.value)
                                    e.target.value = ''
                                }
                            }}
                            disabled={bulkRoleUpdating}
                        >
                            <option value="">Ajouter un role...</option>
                            {roles.map((role) => (
                                <option key={role.id} value={role.id}>{role.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="c-bulk-actions__group">
                        <select
                            id="bulk-remove-role"
                            defaultValue=""
                            onChange={(e) => {
                                if (e.target.value) {
                                    handleBulkRemoveRole(e.target.value)
                                    e.target.value = ''
                                }
                            }}
                            disabled={bulkRoleUpdating}
                        >
                            <option value="">Retirer un role...</option>
                            {roles.map((role) => (
                                <option key={role.id} value={role.id}>{role.name}</option>
                            ))}
                        </select>
                    </div>
                    <button
                        type="button"
                        className="c-admin-button c-admin-button--sm c-admin-button--secondary"
                        onClick={() => setSelectedUserIds(new Set())}
                    >
                        Deselectionner
                    </button>
                    {bulkRoleUpdating && <span className="c-bulk-actions__loading">Mise a jour...</span>}
                </div>
            )}

            {error && (
                <div className="c-admin-alert c-admin-alert--error">{error}</div>
            )}

            {isLoading ? (
                <div className="c-admin-state loading">Chargement des utilisateurs...</div>
            ) : !hasUsers ? (
                <div className="c-admin-state c-admin-state--empty">
                    <p>Aucun utilisateur ne correspond a votre recherche.</p>
                </div>
            ) : (
                <>
                    <div className="l-admin-table">
                        <table className="c-admin-table">
                            <thead>
                                <tr>
                                    <th className="c-admin-table__cell--checkbox">
                                        <input
                                            type="checkbox"
                                            checked={allPageSelected}
                                            onChange={toggleSelectAllPage}
                                        />
                                    </th>
                                    <th className="c-admin-table__cell--title">Nom d'utilisateur</th>
                                    <th>Email</th>
                                    <th>Joueur lie</th>
                                    <th>Roles</th>
                                    <th className="c-admin-table__actions">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedUsers.map((user) => (
                                    <tr key={user.id} className={`c-admin-table__row${selectedUserIds.has(user.id) ? ' c-admin-table__row--selected' : ''}`}>
                                        <td className="c-admin-table__cell--checkbox">
                                            <input
                                                type="checkbox"
                                                checked={selectedUserIds.has(user.id)}
                                                onChange={() => toggleSelectUser(user.id)}
                                            />
                                        </td>
                                        <td className="c-admin-table__cell--title">{user.username}</td>
                                        <td>{user.email}</td>
                                        <td>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-start' }}>
                                                {user.player ? (
                                                    <span className="c-admin-chip c-admin-chip--accent">{user.player.pseudo}</span>
                                                ) : (
                                                    <span className="c-admin-table__placeholder">--</span>
                                                )}
                                                {user.trackmaniaLink && (
                                                    <a
                                                        href={user.trackmaniaLink}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="c-admin-link-badge"
                                                    >
                                                        Trackmania.io
                                                    </a>
                                                )}
                                                {!user.player && (
                                                    <button
                                                        type="button"
                                                        className="c-admin-button c-admin-button--sm c-admin-button--primary"
                                                        onClick={() => openLinkModal(user)}
                                                        disabled={editingUserId !== null}
                                                    >
                                                        Lie
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="c-admin-chip-list">
                                                {user.roles.map((role) => (
                                                    <span key={role.id} className="c-admin-chip c-admin-chip--info">{role.name}</span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="c-admin-table__actions">
                                            <button
                                                type="button"
                                                className="c-admin-button c-admin-button--sm c-admin-button--warning"
                                                onClick={() => handleEdit(user)}
                                                disabled={editingUserId !== null}
                                            >
                                                Modifier
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {totalPages > 1 && (
                        <div className="c-pagination">
                            <button
                                type="button"
                                className="c-pagination__btn"
                                disabled={currentPage <= 1}
                                onClick={() => setCurrentPage((p) => p - 1)}
                            >
                                Precedent
                            </button>
                            <div className="c-pagination__pages">
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                    <button
                                        key={page}
                                        type="button"
                                        className={`c-pagination__page${page === currentPage ? ' c-pagination__page--active' : ''}`}
                                        onClick={() => setCurrentPage(page)}
                                    >
                                        {page}
                                    </button>
                                ))}
                            </div>
                            <button
                                type="button"
                                className="c-pagination__btn"
                                disabled={currentPage >= totalPages}
                                onClick={() => setCurrentPage((p) => p + 1)}
                            >
                                Suivant
                            </button>
                        </div>
                    )}
                </>
            )}

            {editingUserId && (
                <div className="c-modal-overlay" onClick={handleCancel}>
                    <div className="c-modal-panel" onClick={(e) => e.stopPropagation()}>
                        <div className="c-modal-panel__header">
                            <div className="c-modal-panel__header-content">
                                <h2 className="c-modal-panel__title">Edition utilisateur</h2>
                            </div>
                            <button type="button" className="c-modal-panel__close" onClick={handleCancel}>✕</button>
                        </div>

                        <div className="c-modal-panel__body c-modal-panel__body--scroll">
                            <div className="l-form-stack">
                                <fieldset className="c-edit-section">
                                    <legend className="c-edit-section__title">Informations</legend>
                                    <div className="f-field">
                                        <label htmlFor="user-username">Nom d'utilisateur</label>
                                        <input
                                            id="user-username"
                                            type="text"
                                            value={editData.username}
                                            onChange={(e) => setEditData({ ...editData, username: e.target.value })}
                                            disabled={isSaving}
                                        />
                                    </div>
                                    <div className="f-field">
                                        <label htmlFor="user-trackmania">Lien Trackmania.io</label>
                                        <input
                                            id="user-trackmania"
                                            type="url"
                                            placeholder="https://trackmania.io/#/player/..."
                                            value={editData.trackmaniaLink}
                                            onChange={(e) => setEditData({ ...editData, trackmaniaLink: e.target.value })}
                                            disabled={isSaving}
                                        />
                                        <small className="input-hint">URL ou ID du profil Trackmania.io (pour les stats via l'API)</small>
                                    </div>
                                </fieldset>

                                <fieldset className="c-edit-section">
                                    <legend className="c-edit-section__title">Roles</legend>
                                    <div className="f-field">
                                        <label>Roles assignes</label>
                                        {editData.roles.length > 0 ? (
                                            <div className="c-admin-chip-list">
                                                {editData.roles.map((role) => (
                                                    <span key={role.id} className="c-admin-chip c-admin-chip--info">
                                                        {role.name}
                                                        {editData.roles.length > 1 && (
                                                            <button
                                                                type="button"
                                                                className="c-admin-chip__remove"
                                                                onClick={() => handleRemoveRole(role.id)}
                                                                disabled={isRoleUpdating}
                                                            >
                                                                ✕
                                                            </button>
                                                        )}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : (
                                            <span className="c-admin-table__placeholder">Aucun role assigne</span>
                                        )}
                                    </div>
                                    <div className="f-field">
                                        <label htmlFor="user-role-add">Ajouter un role</label>
                                        <select
                                            id="user-role-add"
                                            defaultValue=""
                                            onChange={(e) => {
                                                const value = e.target.value
                                                if (value) {
                                                    handleAddRole(value)
                                                    e.target.value = ''
                                                }
                                            }}
                                            disabled={isRoleUpdating}
                                        >
                                            <option value="">Selectionner un role</option>
                                            {roles
                                                .filter((role) => !editData.roles.some((assigned) => assigned.id === role.id))
                                                .map((role) => (
                                                    <option key={role.id} value={role.id}>{role.name}</option>
                                                ))}
                                        </select>
                                    </div>
                                </fieldset>
                            </div>
                        </div>

                        <div className="c-modal-panel__footer">
                            <div className="c-form-actions">
                                <button
                                    type="button"
                                    className="c-admin-button c-admin-button--secondary"
                                    onClick={handleCancel}
                                    disabled={isSaving}
                                >
                                    Annuler
                                </button>
                                <button
                                    type="button"
                                    className="c-admin-button c-admin-button--primary"
                                    onClick={handleSave}
                                    disabled={isSaving}
                                >
                                    {isSaving ? 'Enregistrement...' : 'Enregistrer les modifications'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {linkModalUser && (
                <div className="c-modal-overlay" onClick={closeLinkModal}>
                    <div className="c-modal-panel" onClick={(e) => e.stopPropagation()}>
                        <div className="c-modal-panel__header">
                            <div className="c-modal-panel__header-content">
                                <h2 className="c-modal-panel__title">Lien Trackmania.io</h2>
                                <p>Associez un profil Trackmania.io à {linkModalUser.username}</p>
                            </div>
                            <button type="button" className="c-modal-panel__close" onClick={closeLinkModal}>✕</button>
                        </div>

                        <div className="c-modal-panel__body">
                            <div className="l-form-stack">
                                <div className="f-field">
                                    <label htmlFor="trackmania-link-input">URL du profil Trackmania.io</label>
                                    <input
                                        id="trackmania-link-input"
                                        type="url"
                                        placeholder="https://trackmania.io/#/player/..."
                                        value={linkModalValue}
                                        onChange={(e) => setLinkModalValue(e.target.value)}
                                        disabled={linkModalSaving}
                                    />
                                    <small className="input-hint">Laissez vide pour retirer le lien.</small>
                                </div>
                                {linkModalError && (
                                    <div className="c-admin-alert c-admin-alert--error">{linkModalError}</div>
                                )}
                            </div>
                        </div>

                        <div className="c-modal-panel__footer">
                            <div className="c-form-actions">
                                <button
                                    type="button"
                                    className="c-admin-button c-admin-button--secondary"
                                    onClick={closeLinkModal}
                                    disabled={linkModalSaving}
                                >
                                    Annuler
                                </button>
                                <button
                                    type="button"
                                    className="c-admin-button c-admin-button--primary"
                                    onClick={handleLinkSave}
                                    disabled={linkModalSaving}
                                >
                                    {linkModalSaving ? 'Enregistrement...' : 'Enregistrer'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default UserManagementTable