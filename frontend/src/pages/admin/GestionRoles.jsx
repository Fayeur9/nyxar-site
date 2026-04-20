import { useContext, useEffect, useMemo, useState } from 'react'
import { AuthContext } from '../../context/AuthContext'
import { API_URL } from '../../services/api'
import '../../styles/pages/GestionRoles.css'

const DEFAULT_PERMISSIONS = ['manageGames', 'adminFull', 'viewSite']
const COLOR_PRESETS = [
    '#99AAB5', '#5865F2', '#ED4245', '#FEE75C', '#57F287', '#EB459E', '#1ABC9C', '#FAA61A',
    '#E67E22', '#E74C3C', '#C27C0E', '#11806A', '#3498DB', '#71368A', '#AD1457', '#23272A'
]

const ROLE_ORDER = ['admin', 'Staff', 'CEO', 'Compétitive Nyxar', 'Main Nyxar', 'Academy']

const EMPTY_ROLE = {
    id: null,
    name: '',
    description: '',
    color: '#6C5CE7',
    icon: null,
    permissions: {
        manageGames: false,
        adminFull: false,
        viewSite: false
    }
}

export default function GestionRoles() {
    const { token, hasPermission } = useContext(AuthContext)
    const [roles, setRoles] = useState([])
    const [availablePermissions, setAvailablePermissions] = useState(DEFAULT_PERMISSIONS)
    const [selectedRoleId, setSelectedRoleId] = useState(null)
    const [formData, setFormData] = useState(EMPTY_ROLE)
    const [activeTab, setActiveTab] = useState('display')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [feedback, setFeedback] = useState(null)
    const [iconFile, setIconFile] = useState(null)

    const canEdit = hasPermission('adminFull')

    const sortRoles = (rolesList) => {
        const sorted = [...rolesList].sort((a, b) => {
            const indexA = ROLE_ORDER.findIndex(name => name.toLowerCase() === a.name.toLowerCase())
            const indexB = ROLE_ORDER.findIndex(name => name.toLowerCase() === b.name.toLowerCase())
            if (indexA === -1 && indexB === -1) return 0
            if (indexA === -1) return 1
            if (indexB === -1) return -1
            return indexA - indexB
        })
        return sorted
    }

    const permissionLabels = useMemo(() => ({
        manageGames: 'Gérer les jeux',
        adminFull: 'Administration complète',
        viewSite: 'Voir le site'
    }), [])

    const permissionDescriptions = useMemo(() => ({
        manageGames: 'Ajout des mini-jeux, line-ups, sponsors et contenus vitrine.',
        adminFull: 'Accès total aux paramètres, utilisateurs et modules sensibles.',
        viewSite: 'Peut se connecter et parcourir les pages protégées.'
    }), [])

    useEffect(() => {
        if (!token) return
        loadRoles()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token])

    const loadRoles = async () => {
        setLoading(true)
        setFeedback(null)
        try {
            const response = await fetch(`${API_URL}/api/admin/roles`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            })
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error(errorData.message || `Erreur ${response.status}: impossible de charger les rôles`)
            }
            const data = await response.json()
            const rolesData = data.items || (Array.isArray(data) ? data : [])
            const sortedRoles = sortRoles(rolesData)
            setRoles(sortedRoles)
            setAvailablePermissions(data.availablePermissions || DEFAULT_PERMISSIONS)
            if (sortedRoles.length > 0) {
                selectRole(sortedRoles[0])
            } else {
                resetForm()
            }
        } catch (error) {
            console.error('Erreur chargement rôles:', error)
            setFeedback({ type: 'error', message: error.message })
        } finally {
            setLoading(false)
        }
    }

    const resetForm = () => {
        setSelectedRoleId(null)
        setFormData(EMPTY_ROLE)
        setActiveTab('display')
    }

    const selectRole = (role) => {
        setSelectedRoleId(role.id)
        setFormData({
            id: role.id,
            name: role.name || '',
            description: role.description || '',
            color: role.color || '#6C5CE7',
            icon: role.icon || null,
            permissions: {
                manageGames: Boolean(role.permissions?.manageGames),
                adminFull: Boolean(role.permissions?.adminFull),
                viewSite: Boolean(role.permissions?.viewSite)
            }
        })
        setIconFile(null)
        setActiveTab('display')
    }

    const handleInputChange = (field, value) => {
        setFormData((prev) => ({
            ...prev,
            [field]: value
        }))
    }

    const handlePermissionToggle = (key) => {
        setFormData((prev) => ({
            ...prev,
            permissions: {
                ...prev.permissions,
                [key]: !prev.permissions[key]
            }
        }))
    }

    const handleIconChange = (e) => {
        const file = e.target.files?.[0]
        if (file) {
            setIconFile(file)
            const reader = new FileReader()
            reader.onload = (event) => {
                setFormData(prev => ({
                    ...prev,
                    icon: event.target?.result
                }))
            }
            reader.readAsDataURL(file)
        }
    }

    const handleSubmit = async (event) => {
        event.preventDefault()
        if (!formData.name.trim()) {
            setFeedback({ type: 'error', message: 'Le nom du rôle est requis.' })
            return
        }
        setSaving(true)
        setFeedback(null)
        try {
            const isEdition = Boolean(formData.id)
            const endpoint = isEdition
                ? `${API_URL}/api/admin/roles/${formData.id}`
                : `${API_URL}/api/admin/roles`
            const method = isEdition ? 'PUT' : 'POST'

            let response
            if (iconFile) {
                const formDataObj = new FormData()
                formDataObj.append('name', formData.name.trim())
                formDataObj.append('description', formData.description?.trim() || '')
                formDataObj.append('color', formData.color)
                formDataObj.append('icon', iconFile)
                Object.keys(formData.permissions).forEach(key => {
                    formDataObj.append(`permissions[${key}]`, formData.permissions[key])
                })

                response = await fetch(endpoint, {
                    method,
                    headers: {
                        Authorization: `Bearer ${token}`
                    },
                    body: formDataObj
                })
            } else {
                const payload = {
                    name: formData.name.trim(),
                    description: formData.description?.trim() || null,
                    color: formData.color,
                    permissions: formData.permissions
                }
                response = await fetch(endpoint, {
                    method,
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify(payload)
                })
            }

            if (!response.ok) {
                const errorPayload = await response.json().catch(() => ({}))
                throw new Error(errorPayload.message || 'Enregistrement impossible')
            }

            await loadRoles()
            setIconFile(null)
            setFeedback({
                type: 'success',
                message: isEdition ? 'Rôle mis à jour' : 'Rôle créé avec succès'
            })
        } catch (error) {
            console.error('Erreur sauvegarde rôle:', error)
            setFeedback({ type: 'error', message: error.message })
        } finally {
            setSaving(false)
        }
    }

    const renderRoleList = () => {
        if (loading) {
            return <div className="role-sidebar__state">Chargement des rôles...</div>
        }
        if (!roles.length) {
            return <div className="role-sidebar__state">Aucun rôle pour le moment.</div>
        }
        return roles.map((role) => (
            <button
                key={role.id}
                type="button"
                className={`role-chip${selectedRoleId === role.id ? ' is-active' : ''}`}
                onClick={() => selectRole(role)}
            >
                <span className="role-chip__color" style={{ 
                    backgroundColor: role.icon ? 'transparent' : role.color,
                    backgroundImage: role.icon ? `url(${role.icon})` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                }} />
                <div>
                    <p className="role-chip__title">{role.name}</p>
                    <p className="role-chip__meta">
                        {availablePermissions
                            .filter((key) => role.permissions?.[key])
                            .map((key) => permissionLabels[key] || key)
                            .join(' • ') || 'Aucune permission'}
                    </p>
                </div>
            </button>
        ))
    }

    const renderDisplayTab = () => (
        <div className="role-tab-panel">
            <div className="role-field">
                <label htmlFor="role-name">Nom du rôle</label>
                <input
                    id="role-name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    disabled={!canEdit}
                />
            </div>

            <div className="role-field">
                <label htmlFor="role-description">Description</label>
                <textarea
                    id="role-description"
                    rows="3"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    disabled={!canEdit}
                />
            </div>

            <div className="role-field">
                <div className="role-field__label">
                    <label>Couleur du rôle</label>
                    <span>{formData.color?.toUpperCase()}</span>
                </div>
                <div className="role-color-picker">
                    <div className="role-color-picker__input">
                        <input
                            type="color"
                            value={formData.color}
                            onChange={(e) => handleInputChange('color', e.target.value)}
                            disabled={!canEdit}
                        />
                        <span>Personnaliser</span>
                    </div>
                    <div className="role-color-grid">
                        {COLOR_PRESETS.map((color) => (
                            <button
                                key={color}
                                type="button"
                                className={`role-color-swatch${formData.color === color ? ' is-active' : ''}`}
                                style={{ backgroundColor: color }}
                                onClick={() => handleInputChange('color', color)}
                                disabled={!canEdit}
                            >
                                {formData.color === color && <span>✓</span>}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="role-field role-icon-field">
                <div className="role-icon-preview" style={{ backgroundColor: formData.icon ? 'transparent' : formData.color, backgroundImage: formData.icon ? `url(${formData.icon})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center' }}>
                    {!formData.icon && (formData.name || '?').slice(0, 1).toUpperCase()}
                </div>
                <div>
                    <p>Icône de rôle</p>
                    <label className="role-icon-label">
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleIconChange}
                            disabled={!canEdit}
                            style={{ display: 'none' }}
                        />
                        <span className="role-icon-button">Choisir une image</span>
                    </label>
                    <p className="role-hint">Icône optionnelle (64x64 min). Format : PNG, JPG</p>
                </div>
            </div>
        </div>
    )

    const renderPermissionsTab = () => (
        <div className="role-tab-panel">
            <div className="role-permission-grid">
                {availablePermissions.map((permissionKey) => (
                    <label
                        key={permissionKey}
                        className={`role-permission-card${formData.permissions[permissionKey] ? ' is-active' : ''}`}
                    >
                        <input
                            type="checkbox"
                            checked={Boolean(formData.permissions[permissionKey])}
                            onChange={() => handlePermissionToggle(permissionKey)}
                            disabled={!canEdit}
                        />
                        <span className="role-toggle" aria-hidden="true" />
                        <div>
                            <p>{permissionLabels[permissionKey] || permissionKey}</p>
                            <small>{permissionDescriptions[permissionKey] || 'Permission personnalisée.'}</small>
                        </div>
                    </label>
                ))}
            </div>
        </div>
    )

    return (
        <div className="role-page">
            <div className="role-page__header">
                <div>
                    <h1>Gestion des rôles</h1>
                </div>
                <button
                    type="button"
                    className="role-button role-button--ghost"
                    onClick={resetForm}
                    disabled={!canEdit}
                >
                    + Nouveau rôle
                </button>
            </div>

            {feedback && (
                <div className={`role-alert role-alert--${feedback.type}`}>
                    {feedback.message}
                </div>
            )}

            <div className="role-manager">
                <aside className="role-sidebar">
                    <div className="role-sidebar__header">
                        <h4>Rôles</h4>
                        <span>{roles.length}</span>
                    </div>
                    <div className="role-sidebar__list">
                        {renderRoleList()}
                    </div>
                </aside>

                <section className="role-editor">
                    <form onSubmit={handleSubmit}>
                        <header className="role-editor__summary">
                            <div>
                                <h2>{formData.name || 'Nouveau rôle'}</h2>
                                <p>{formData.description || 'Ajoutez une description pour contextualiser le rôle.'}</p>
                            </div>
                            <div className="role-preview" style={{ borderColor: formData.color, color: formData.color }}>
                                @{formData.name || 'role-name'}
                            </div>
                        </header>

                        <nav className="role-tabs">
                            <button
                                type="button"
                                className={activeTab === 'display' ? 'is-active' : ''}
                                onClick={() => setActiveTab('display')}
                            >
                                Affichage
                            </button>
                            <button
                                type="button"
                                className={activeTab === 'permissions' ? 'is-active' : ''}
                                onClick={() => setActiveTab('permissions')}
                            >
                                Permissions
                            </button>
                        </nav>

                        {activeTab === 'display' ? renderDisplayTab() : renderPermissionsTab()}

                        <div className="role-form__actions">
                            <button type="submit" className="role-button role-button--primary" disabled={!canEdit || saving}>
                                {saving ? 'Enregistrement...' : formData.id ? 'Mettre à jour' : 'Créer le rôle'}
                            </button>
                        </div>
                    </form>
                </section>
            </div>
        </div>
    )
}
