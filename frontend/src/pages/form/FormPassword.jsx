import { useState, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthContext } from '../../context/AuthContext'
import { API_URL } from '../../services/api'

export default function FormPassword() {
    const { token } = useContext(AuthContext)
    const navigate = useNavigate()

    const [error, setError] = useState(null)
    const [success, setSuccess] = useState(null)
    const [saving, setSaving] = useState(false)
    const [formData, setFormData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    })

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError(null)
        setSuccess(null)

        // Validation
        if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
            setError('Tous les champs sont requis')
            return
        }

        if (formData.newPassword.length < 6) {
            setError('Le nouveau mot de passe doit contenir au moins 6 caracteres')
            return
        }

        if (formData.newPassword !== formData.confirmPassword) {
            setError('Les mots de passe ne correspondent pas')
            return
        }

        setSaving(true)

        try {
            const response = await fetch(`${API_URL}/api/auth/change-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    currentPassword: formData.currentPassword,
                    newPassword: formData.newPassword
                })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.message || 'Erreur lors du changement de mot de passe')
            }

            setSuccess('Mot de passe modifie avec succes')
            setFormData({
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            })

            // Rediriger vers le profil après 2 secondes
            setTimeout(() => {
                navigate('/profile')
            }, 2000)
        } catch (err) {
            setError(err.message)
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="l-form-page l-form-page--narrow">
            <div className="c-form-header">
                <h1>Changer mon mot de passe</h1>
                <div className="c-form-header__actions">
                    <button type="button" className="btn btn-secondary" onClick={() => navigate('/profile')}>
                        Retour au profil
                    </button>
                </div>
            </div>

            <div className="c-form-shell">
                {error && <div className="error-message">{error}</div>}
                {success && <div className="success-message">{success}</div>}

                <form onSubmit={handleSubmit} className="l-form-stack">
                    <div className="c-form-section">
                        <h3>Modification du mot de passe</h3>

                        <div className="l-form-stack--fields">
                            <div className="f-field">
                                <label htmlFor="currentPassword">Mot de passe actuel *</label>
                                <input
                                    id="currentPassword"
                                    type="password"
                                    placeholder="Entrez votre mot de passe actuel"
                                    value={formData.currentPassword}
                                    onChange={(e) => setFormData({...formData, currentPassword: e.target.value})}
                                    required
                                />
                            </div>

                            <div className="f-field">
                                <label htmlFor="newPassword">Nouveau mot de passe *</label>
                                <input
                                    id="newPassword"
                                    type="password"
                                    placeholder="Minimum 6 caracteres"
                                    value={formData.newPassword}
                                    onChange={(e) => setFormData({...formData, newPassword: e.target.value})}
                                    required
                                />
                            </div>

                            <div className="f-field">
                                <label htmlFor="confirmPassword">Confirmer le nouveau mot de passe *</label>
                                <input
                                    id="confirmPassword"
                                    type="password"
                                    placeholder="Retapez le nouveau mot de passe"
                                    value={formData.confirmPassword}
                                    onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                                    required
                                />
                            </div>
                        </div>

                        <div className="c-form-actions">
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={saving}
                            >
                                {saving ? 'Modification...' : 'Modifier le mot de passe'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    )
}
