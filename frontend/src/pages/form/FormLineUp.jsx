import { useState, useEffect, useContext } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { AuthContext } from '../../context/AuthContext'
import { API_URL } from '../../services/api'

export default function FormLineUp() {
    const { token, user } = useContext(AuthContext)
    const navigate = useNavigate()
    const location = useLocation()
    const editingLineUp = location.state?.lineup
    const comeFrom = location.state?.from?.pathname

    // Déterminer où revenir
    const getBackPath = () => {
        if (comeFrom?.includes('/admin')) {
            return '/admin'
        }
        return '/teams'
    }

    // Vérifier si l'utilisateur est admin
    if (user?.role !== 'admin') {
        return (
            <div className="l-form-page l-form-page--narrow">
                <h1>Accès réservé</h1>
                <p>Vous n'avez pas les droits nécessaires pour accéder à cette page.</p>
                <button onClick={() => navigate('/')} className="btn-primary">Retour à l'accueil</button>
            </div>
        )
    }

    const [error, setError] = useState(null)
    const [uploading, setUploading] = useState(false)
    const [games, setGames] = useState([])
    const [formData, setFormData] = useState({
        name: editingLineUp?.name || '',
        image_url: editingLineUp?.image_url || '',
        color: editingLineUp?.color || '#667eea',
        game_id: editingLineUp?.game_id || ''
    })

    useEffect(() => {
        fetchGames()
    }, [])

    const fetchGames = async () => {
        try {
            const headers = token ? { 'Authorization': `Bearer ${token}` } : {}
            const response = await fetch(`${API_URL}/api/noty/games`, { headers })
            if (!response.ok) throw new Error('Erreur récupération jeux')
            const data = await response.json()
            setGames(data)
        } catch (err) {
            setError(err.message)
        }
    }

    const handleImageUpload = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return

        setUploading(true)
        try {
            const formDataUpload = new FormData()
            formDataUpload.append('image', file)

            const response = await fetch(`${API_URL}/api/line-ups/upload/lineup`, {
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

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!formData.name) {
            setError('Nom requis')
            return
        }

        try {
            const method = editingLineUp ? 'PUT' : 'POST'
            const url = editingLineUp
                ? `${API_URL}/api/line-ups/line-ups/${editingLineUp.id}`
                : `${API_URL}/api/line-ups/line-ups`

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: formData.name,
                    image_url: formData.image_url,
                    color: formData.color,
                    game_id: formData.game_id ? parseInt(formData.game_id) : null
                })
            })

            if (!response.ok) throw new Error('Erreur création/modification line-up')

            navigate(getBackPath())
        } catch (err) {
            setError(err.message)
        }
    }

    return (
        <div className="l-form-page l-form-page--narrow">
            <div className="c-form-header">
                <h1>{editingLineUp ? '✏️ Modifier la Line-up' : '📋 Ajouter une Line-up'}</h1>
                <div className="c-form-header__actions">
                    <button type="button" className="btn btn-secondary" onClick={() => navigate(getBackPath())}>
                        ← Retour
                    </button>
                    <button type="button" className="btn btn-primary" onClick={handleSubmit}>
                        {editingLineUp ? '✓ Sauvegarder' : '✓ Créer'}
                    </button>
                </div>
            </div>

            <div className="c-form-shell">
                {error && <div className="error-message">{error}</div>}

                <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="lineup-form">
                    <div className="l-form-grid l-form-grid--media">
                        {/* Image à gauche */}
                        <div className="f-field c-form-media">
                            <label htmlFor="image-input" className="c-form-image-upload">
                                {formData.image_url && (
                                    <img src={formData.image_url} alt="Aperçu" className="c-form-image-upload__preview" />
                                )}
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

                        {/* Champs à droite */}
                        <div className="l-form-stack--fields">
                            <div className="f-field">
                                <label htmlFor="name">Nom *</label>
                                <input
                                    id="name"
                                    type="text"
                                    placeholder="Ex: Équipe Alpha"
                                    value={formData.name}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                    required
                                />
                            </div>

                            <div className="f-field">
                                <label htmlFor="color">Couleur</label>
                                <div className="c-form-color-picker">
                                    <input
                                        id="color"
                                        type="color"
                                        className="c-form-color-picker__input"
                                        value={formData.color}
                                        onChange={(e) => setFormData({...formData, color: e.target.value})}
                                    />
                                    <span className="c-form-color-picker__value">{formData.color}</span>
                                </div>
                            </div>

                            <div className="f-field">
                                <label htmlFor="game">Jeu</label>
                                <select
                                    id="game"
                                    value={formData.game_id}
                                    onChange={(e) => setFormData({...formData, game_id: e.target.value})}
                                >
                                    <option value="">Aucun jeu</option>
                                    {games.map(game => (
                                        <option key={game.id} value={game.id}>{game.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    )
}
