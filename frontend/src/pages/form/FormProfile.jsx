import { useState, useContext, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthContext } from '../../context/AuthContext'
import { API_URL } from '../../services/api'

export default function FormProfile() {
    const { user, token, updateUser } = useContext(AuthContext)
    const navigate = useNavigate()

    const [error, setError] = useState(null)
    const [success, setSuccess] = useState(null)
    const [uploading, setUploading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [formData, setFormData] = useState({
        username: user?.username || '',
        email: user?.email || '',
        image_url: user?.image_url || ''
    })
    const [showPasswordForm, setShowPasswordForm] = useState(false)
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    })
    const [passwordSaving, setPasswordSaving] = useState(false)
    const [passwordError, setPasswordError] = useState(null)
    const [passwordSuccess, setPasswordSuccess] = useState(null)

    // Mettre à jour le formulaire si l'utilisateur change
    useEffect(() => {
        if (user) {
            setFormData({
                username: user.username || '',
                email: user.email || '',
                image_url: user.image_url || ''
            })
        }
    }, [user])

    const resetPasswordFeedback = () => {
        setPasswordError(null)
        setPasswordSuccess(null)
    }

    const handleImageUpload = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return

        setUploading(true)
        setError(null)
        try {
            const formDataUpload = new FormData()
            formDataUpload.append('image', file)

            const response = await fetch(`${API_URL}/api/auth/upload/profile`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formDataUpload
            })

            if (!response.ok) throw new Error('Erreur upload image')
            const data = await response.json()
            setFormData({ ...formData, image_url: data.url })
        } catch (err) {
            setError(err.message)
        } finally {
            setUploading(false)
        }
    }

    const handlePasswordSubmit = async (e) => {
        e.preventDefault()
        resetPasswordFeedback()

        if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
            setPasswordError('Tous les champs sont requis')
            return
        }

        if (passwordForm.newPassword.length < 6) {
            setPasswordError('Le nouveau mot de passe doit contenir au moins 6 caractères')
            return
        }

        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            setPasswordError('Les mots de passe ne correspondent pas')
            return
        }

        setPasswordSaving(true)

        try {
            const response = await fetch(`${API_URL}/api/auth/change-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    currentPassword: passwordForm.currentPassword,
                    newPassword: passwordForm.newPassword
                })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.message || 'Erreur lors du changement de mot de passe')
            }

            setPasswordSuccess('Mot de passe modifié avec succès')
            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
        } catch (err) {
            setPasswordError(err.message)
        } finally {
            setPasswordSaving(false)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!formData.username) {
            setError('Le pseudo est requis')
            return
        }

        setSaving(true)
        setError(null)
        setSuccess(null)

        try {
            const response = await fetch(`${API_URL}/api/auth/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    username: formData.username,
                    image_url: formData.image_url
                })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.message || 'Erreur lors de la mise à jour')
            }

            // Mettre à jour le contexte avec les nouvelles données
            updateUser(data.user)
            setSuccess('Profil mis à jour avec succès')
        } catch (err) {
            setError(err.message)
        } finally {
            setSaving(false)
        }
    }

    if (!user) {
        return (
            <div className="l-form-page">
                <p>Chargement...</p>
            </div>
        )
    }

    const renderImageContent = () => {
        if (uploading) {
            return <span className="c-form-uploading">Telechargement...</span>
        }

        if (formData.image_url) {
            return (
                <img
                    src={formData.image_url}
                    alt="Photo de profil"
                    className="c-form-image-upload__preview"
                />
            )
        }

        return (
            <div className="c-form-image-placeholder">
                <span className="c-form-image-placeholder__initial">
                    {user.username.charAt(0).toUpperCase()}
                </span>
                <span className="c-form-image-placeholder__text">Cliquez pour ajouter une photo</span>
            </div>
        )
    }

    return (
        <div className="l-form-page">
            <div className="c-form-header">
                <h1>Mon Profil</h1>
                <div className="c-form-header__actions">
                    <button type="button" className="btn btn-secondary" onClick={() => navigate('/')}>
                        Retour
                    </button>
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleSubmit}
                        disabled={saving}
                    >
                        {saving ? 'Sauvegarde...' : 'Sauvegarder'}
                    </button>
                </div>
            </div>

            <div className="c-form-shell">
                {error && <div className="error-message">{error}</div>}
                {success && <div className="success-message">{success}</div>}

                <form onSubmit={handleSubmit} className="l-form-stack">
                    <div className="c-form-section">
                        <h3>Informations du profil</h3>

                        <div className="l-form-grid l-form-grid--media">
                            <div className="f-field c-form-media">
                                <label htmlFor="image-input" className="c-form-image-upload">
                                    {renderImageContent()}
                                </label>
                                <input
                                    id="image-input"
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    disabled={uploading}
                                    style={{ display: 'none' }}
                                />
                            </div>

                            <div className="l-form-stack--fields">
                                <div className="f-field">
                                    <label htmlFor="username">Pseudo *</label>
                                    <input
                                        id="username"
                                        type="text"
                                        placeholder="Votre pseudo"
                                        value={formData.username}
                                        onChange={(e) => setFormData({...formData, username: e.target.value})}
                                        required
                                    />
                                </div>

                                <div className="f-field">
                                    <label htmlFor="email">Email</label>
                                    <input
                                        id="email"
                                        type="email"
                                        value={formData.email}
                                        disabled
                                        className="input-disabled"
                                    />
                                    <small className="input-hint">L'email ne peut pas être modifié</small>
                                </div>
                            </div>
                        </div>
                    </div>
                </form>

                <div className="c-form-section">
                    <h3>Sécurité</h3>
                    <div className="f-field">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => {
                                const next = !showPasswordForm
                                setShowPasswordForm(next)
                                if (!next) {
                                    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
                                }
                                resetPasswordFeedback()
                            }}
                        >
                            {showPasswordForm ? 'Fermer le formulaire' : 'Changer mon mot de passe'}
                        </button>
                    </div>

                    {showPasswordForm && (
                        <form className="l-form-stack password-form" onSubmit={handlePasswordSubmit}>
                            {passwordError && <div className="error-message">{passwordError}</div>}
                            {passwordSuccess && <div className="success-message">{passwordSuccess}</div>}

                            <div className="l-form-stack--fields">
                                <div className="f-field">
                                    <label htmlFor="currentPassword">Mot de passe actuel *</label>
                                    <input
                                        id="currentPassword"
                                        type="password"
                                        placeholder="Mot de passe actuel"
                                        value={passwordForm.currentPassword}
                                        onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="f-field">
                                    <label htmlFor="newPassword">Nouveau mot de passe *</label>
                                    <input
                                        id="newPassword"
                                        type="password"
                                        placeholder="Minimum 6 caractères"
                                        value={passwordForm.newPassword}
                                        onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="f-field">
                                    <label htmlFor="confirmPassword">Confirmer le nouveau mot de passe *</label>
                                    <input
                                        id="confirmPassword"
                                        type="password"
                                        placeholder="Répétez le nouveau mot de passe"
                                        value={passwordForm.confirmPassword}
                                        onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="c-form-actions">
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={passwordSaving}
                                >
                                    {passwordSaving ? 'Enregistrement...' : 'Mettre à jour le mot de passe'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    )
}
