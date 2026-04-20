import { useState, useEffect, useMemo, useContext } from 'react'
import { AuthContext } from '../../../context/AuthContext'
import { API_URL } from '../../../services/api'

export default function PlayerForm({ data, onChange, onImageUpload, uploading }) {
    const { token } = useContext(AuthContext)
    const [userOptions, setUserOptions] = useState([])
    const [userOptionsLoading, setUserOptionsLoading] = useState(false)
    const isEditing = Boolean(data._editingId)

    useEffect(() => {
        if (!token) return
        let isMounted = true

        const fetchUserOptions = async () => {
            setUserOptionsLoading(true)
            try {
                const response = await fetch(`${API_URL}/api/line-ups/players/user-options`, {
                    headers: { Authorization: `Bearer ${token}` }
                })
                if (!response.ok) throw new Error('Erreur chargement utilisateurs')
                const result = await response.json()
                if (isMounted) setUserOptions(result)
            } catch (err) {
                console.error('Erreur récupération utilisateurs:', err)
                if (isMounted) setUserOptions([])
            } finally {
                if (isMounted) setUserOptionsLoading(false)
            }
        }

        fetchUserOptions()
        return () => { isMounted = false }
    }, [token])

    const availableUsers = useMemo(() => {
        if (!Array.isArray(userOptions)) return []
        return userOptions.filter((option) => {
            if (!option.player_id) return true
            if (data._editingId && option.player_id === data._editingId) return true
            return false
        })
    }, [userOptions, data._editingId])

    const handleUserChange = (value) => {
        onChange(prev => ({ ...prev, user_id: value }))
        if (!value) return

        const selected = userOptions.find(opt => String(opt.id) === String(value))
        if (selected?.username) {
            onChange(prev => ({ ...prev, user_id: value, pseudo: selected.username }))
        }
    }

    const handleModeChange = (createUser) => {
        onChange(prev => ({ ...prev, createUser, user_id: '', email: '' }))
    }

    // En mode édition, pas de toggle de création de compte
    const showModeToggle = !isEditing
    const createUser = Boolean(data.createUser)

    return (
        <div className="c-form-sections">
            <div className="c-form-section">
                <h3>Informations obligatoires</h3>

                <div className="l-form-grid l-form-grid--media">
                    <div className="f-field c-form-media">
                        <span className="c-form-image-upload__label">Image principale</span>
                        <label htmlFor="player-image-input" className="c-form-image-upload">
                            {data.image_url && !uploading ? (
                                <img src={data.image_url} alt="Aperçu" className="c-form-image-upload__preview" />
                            ) : uploading ? (
                                <span className="c-form-uploading">Téléchargement...</span>
                            ) : (
                                <span className="c-form-image-upload__placeholder">Ajouter l'image principale</span>
                            )}
                        </label>
                        <input
                            id="player-image-input"
                            type="file"
                            accept="image/*"
                            onChange={(e) => onImageUpload(e, 'image_url')}
                            disabled={uploading}
                            style={{ display: 'none' }}
                        />
                    </div>

                    <div className="f-field c-form-media">
                        <span className="c-form-image-upload__label">Image hover (optionnel)</span>
                        <label htmlFor="player-hover-image-input" className="c-form-image-upload">
                            {data.image_url_hover && !uploading ? (
                                <img src={data.image_url_hover} alt="Aperçu hover" className="c-form-image-upload__preview" />
                            ) : uploading ? (
                                <span className="c-form-uploading">Téléchargement...</span>
                            ) : (
                                <span className="c-form-image-upload__placeholder">Image pour l'effet 3D</span>
                            )}
                        </label>
                        <input
                            id="player-hover-image-input"
                            type="file"
                            accept="image/*"
                            onChange={(e) => onImageUpload(e, 'image_url_hover')}
                            disabled={uploading}
                            style={{ display: 'none' }}
                        />
                    </div>

                    <div className="l-form-stack--fields">
                        {showModeToggle && (
                            <div className="f-field">
                                <label>Compte utilisateur</label>
                                <div className="c-radio-group">
                                    <label className="c-radio-option">
                                        <input
                                            type="radio"
                                            name="player-user-mode"
                                            checked={!createUser}
                                            onChange={() => handleModeChange(false)}
                                        />
                                        Lier à un compte existant
                                    </label>
                                    <label className="c-radio-option">
                                        <input
                                            type="radio"
                                            name="player-user-mode"
                                            checked={createUser}
                                            onChange={() => handleModeChange(true)}
                                        />
                                        Créer un nouveau compte
                                    </label>
                                </div>
                            </div>
                        )}

                        {!isEditing && createUser ? (
                            <div className="f-field">
                                <label htmlFor="player-email">Email du compte *</label>
                                <input
                                    id="player-email"
                                    type="email"
                                    placeholder="joueur@exemple.com"
                                    value={data.email || ''}
                                    onChange={(e) => onChange(prev => ({ ...prev, email: e.target.value }))}
                                    required
                                />
                                <small className="input-hint">Un compte sera créé avec le pseudo comme nom d'utilisateur.</small>
                            </div>
                        ) : (
                            !isEditing && (
                                <div className="f-field">
                                    <label htmlFor="player-user">Utilisateur existant</label>
                                    <select
                                        id="player-user"
                                        value={data.user_id || ''}
                                        onChange={(e) => handleUserChange(e.target.value)}
                                        disabled={userOptionsLoading}
                                    >
                                        <option value="">Aucun utilisateur</option>
                                        {userOptionsLoading ? (
                                            <option value="" disabled>Chargement...</option>
                                        ) : (
                                            availableUsers.map((option) => (
                                                <option key={option.id} value={String(option.id)}>
                                                    {option.username}{option.email ? ` (${option.email})` : ''}
                                                </option>
                                            ))
                                        )}
                                    </select>
                                    {data.user_id && (
                                        <small className="input-hint">Le pseudo est synchronisé avec l'utilisateur sélectionné.</small>
                                    )}
                                </div>
                            )
                        )}

                        <div className="f-field">
                            <label htmlFor="player-pseudo">Pseudo *</label>
                            <input
                                id="player-pseudo"
                                type="text"
                                placeholder="Ex: ProPlayer123"
                                value={data.pseudo || ''}
                                onChange={(e) => onChange(prev => ({ ...prev, pseudo: e.target.value }))}
                                required
                                disabled={!createUser && Boolean(data.user_id)}
                                className={!createUser && data.user_id ? 'input-disabled' : undefined}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="c-form-section">
                <h3>Informations complémentaires</h3>

                <div className="l-form-grid">
                    <div className="f-field">
                        <label htmlFor="player-first-name">Prénom</label>
                        <input
                            id="player-first-name"
                            type="text"
                            placeholder="Jean"
                            value={data.first_name || ''}
                            onChange={(e) => onChange(prev => ({ ...prev, first_name: e.target.value }))}
                        />
                    </div>
                    <div className="f-field">
                        <label htmlFor="player-last-name">Nom</label>
                        <input
                            id="player-last-name"
                            type="text"
                            placeholder="Dupont"
                            value={data.last_name || ''}
                            onChange={(e) => onChange(prev => ({ ...prev, last_name: e.target.value }))}
                        />
                    </div>
                </div>

                <div className="f-field">
                    <label htmlFor="player-birth-date">Date de naissance</label>
                    <input
                        id="player-birth-date"
                        type="date"
                        value={data.birth_date || ''}
                        onChange={(e) => onChange(prev => ({ ...prev, birth_date: e.target.value }))}
                    />
                </div>

                <div className="f-field">
                    <label htmlFor="player-catch-phrase">Phrase d'accroche</label>
                    <textarea
                        id="player-catch-phrase"
                        placeholder="Une phrase qui représente le joueur..."
                        value={data.catch_phrase || ''}
                        onChange={(e) => onChange(prev => ({ ...prev, catch_phrase: e.target.value }))}
                        rows="3"
                    />
                </div>
            </div>
        </div>
    )
}
