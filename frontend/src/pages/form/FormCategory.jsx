import { useState, useEffect } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { API_URL } from '../../services/api'

export default function FormCategory({ token }) {
    const { id } = useParams()
    const navigate = useNavigate()
    const location = useLocation()
    const isEdit = !!id
    const comeFrom = location.state?.from?.pathname

    // Déterminer où revenir
    const getBackPath = () => {
        if (comeFrom?.includes('/admin')) {
            return '/admin'
        }
        return '/noty'
    }

    const [games, setGames] = useState([])
    const [campaigns, setCampaigns] = useState([])
    const [allPlayers, setAllPlayers] = useState([])
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState(false)
    const [error, setError] = useState(null)
    const [successMessage, setSuccessMessage] = useState(null)

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        image_url: '',
        game_id: '',
        visible_by_nyxar: 0,
        noty_campaign_id: '',
        nominee_type: 'player'
    })
    const [tempNominees, setTempNominees] = useState([])
    const [customNominees, setCustomNominees] = useState([])
    const [newNomineeTitle, setNewNomineeTitle] = useState('')
    const [newNomineeUrl, setNewNomineeUrl] = useState('')
    const [nomineeUploading, setNomineeUploading] = useState(false)

    useEffect(() => {
        fetchGames()
        fetchCampaigns()
        fetchAllPlayers()
        if (isEdit) {
            fetchCategory()
        }
        setLoading(false)
    }, [])

    // Filtrer les joueurs en fonction du jeu sélectionné
    const getFilteredPlayers = () => {
        if (!formData.game_id) {
            return allPlayers // Catégorie globale : tous les joueurs
        }

        const gameId = parseInt(formData.game_id)
        // Filtrer les joueurs qui jouent au jeu sélectionné
        return allPlayers.filter(player => player.game_id === gameId)
    }

    const fetchGames = async () => {
        try {
            const response = await fetch(`${API_URL}/api/games`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (!response.ok) throw new Error('Erreur récupération jeux')
            const data = await response.json()
            setGames(data)
        } catch (err) {
            setError(err.message)
        }
    }

    const fetchCampaigns = async () => {
        try {
            const response = await fetch(`${API_URL}/api/noty/campaigns`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (!response.ok) throw new Error('Erreur récupération campagnes')
            const data = await response.json()
            setCampaigns(data)
            // Pré-sélectionner la campagne active si on crée une nouvelle catégorie
            if (!isEdit && data.length > 0) {
                const today = new Date().toISOString().split('T')[0]
                const activeCampaign = data.find(c => c.start_date <= today && c.end_date >= today)
                if (activeCampaign) {
                    setFormData(prev => ({ ...prev, noty_campaign_id: activeCampaign.id }))
                }
            }
        } catch (err) {
            console.error('Erreur fetch campaigns:', err)
        }
    }

    const fetchAllPlayers = async () => {
        try {
            const response = await fetch(`${API_URL}/api/line-ups/players`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (!response.ok) throw new Error('Erreur récupération joueurs')
            const data = await response.json()
            setAllPlayers(data)
        } catch (err) {
            console.error('Erreur fetch players:', err)
        }
    }

    const fetchCategory = async () => {
        try {
            const response = await fetch(`${API_URL}/api/noty/categories/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (!response.ok) throw new Error('Erreur récupération catégorie')
            const data = await response.json()
            const nomineeType = data.nominee_type || 'player'
            setFormData({
                title: data.title,
                description: data.description || '',
                image_url: data.image_url || '',
                game_id: data.game_id || '',
                visible_by_nyxar: data.visible_by_nyxar ?? 0,
                noty_campaign_id: data.noty_campaign_id || '',
                nominee_type: nomineeType
            })
            if (nomineeType === 'player') {
                fetchNomineesForEdit(id)
            } else {
                fetchCustomNomineesForEdit(id)
            }
        } catch (err) {
            setError(err.message)
        }
    }

    const fetchNomineesForEdit = async (categoryId) => {
        try {
            const response = await fetch(`${API_URL}/api/noty/categories/${categoryId}/nominees`)
            if (!response.ok) throw new Error('Erreur récupération nominés')
            const data = await response.json()
            setTempNominees(data.map(n => n.player_id))
        } catch (err) {
            console.error('Erreur fetch nominees:', err)
        }
    }

    const fetchCustomNomineesForEdit = async (categoryId) => {
        try {
            const response = await fetch(`${API_URL}/api/noty/categories/${categoryId}/custom-nominees`)
            if (!response.ok) throw new Error('Erreur récupération custom nominees')
            const data = await response.json()
            setCustomNominees(data.map(n => ({ id: n.id, title: n.title, media_url: n.media_url })))
        } catch (err) {
            console.error('Erreur fetch custom nominees:', err)
        }
    }

    const handleImageUpload = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return

        setUploading(true)
        try {
            const formDataUpload = new FormData()
            formDataUpload.append('file', file)

            const response = await fetch(`${API_URL}/api/noty/upload?type=thumbnail`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formDataUpload
            })

            if (!response.ok) throw new Error('Erreur upload image')
            const data = await response.json()
            setFormData(prev => ({ ...prev, image_url: data.url }))
            setError(null)
        } catch (err) {
            console.error('Upload error:', err)
            setError(err.message)
        } finally {
            setUploading(false)
        }
    }

    const handleNomineeFileUpload = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return

        setNomineeUploading(true)
        try {
            const formDataUpload = new FormData()
            formDataUpload.append('file', file)

            const response = await fetch(`${API_URL}/api/noty/upload?type=nominee`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formDataUpload
            })

            if (!response.ok) throw new Error('Erreur upload fichier')
            const data = await response.json()
            setNewNomineeUrl(data.url)
            setError(null)
        } catch (err) {
            setError(err.message)
        } finally {
            setNomineeUploading(false)
        }
    }

    const handleAddCustomNominee = () => {
        if (!newNomineeTitle.trim() || !newNomineeUrl.trim()) return
        setCustomNominees(prev => [...prev, { title: newNomineeTitle.trim(), media_url: newNomineeUrl.trim() }])
        setNewNomineeTitle('')
        setNewNomineeUrl('')
    }

    const handleRemoveCustomNominee = (index) => {
        setCustomNominees(prev => prev.filter((_, i) => i !== index))
    }

    const handleAddTempNominee = (playerId) => {
        if (!tempNominees.includes(playerId)) {
            setTempNominees([...tempNominees, playerId])
        }
    }

    const handleRemoveTempNominee = (playerId) => {
        setTempNominees(tempNominees.filter(id => id !== playerId))
    }

    const handleSubmitCategory = async (continueAdding = false) => {
        if (!formData.title) {
            setError('Titre requis')
            return
        }

        if (!formData.noty_campaign_id) {
            setError('Campagne NOTY requise')
            return
        }

        try {
            const method = isEdit ? 'PUT' : 'POST'
            const url = isEdit
                ? `${API_URL}/api/noty/categories/${id}`
                : `${API_URL}/api/noty/categories`

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    title: formData.title,
                    description: formData.description,
                    image_url: formData.image_url,
                    game_id: formData.nominee_type === 'player' && formData.game_id ? parseInt(formData.game_id) : null,
                    visible_by_nyxar: formData.visible_by_nyxar,
                    noty_campaign_id: parseInt(formData.noty_campaign_id),
                    nominee_type: formData.nominee_type
                })
            })
            if (!response.ok) throw new Error('Erreur création/modification catégorie')

            const newCategory = await response.json()

            // Ajouter les nominees selon le type
            if (formData.nominee_type === 'player') {
                for (const playerId of tempNominees) {
                    await fetch(`${API_URL}/api/noty/categories/${newCategory.id}/nominees`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ player_id: playerId })
                    })
                }
            } else {
                for (const nominee of customNominees) {
                    if (!nominee.id) {
                        await fetch(`${API_URL}/api/noty/categories/${newCategory.id}/custom-nominees`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({ title: nominee.title, media_url: nominee.media_url })
                        })
                    }
                }
            }

            if (isEdit) {
                setSuccessMessage('Catégorie modifiée avec succès')
                setTimeout(() => navigate(getBackPath()), 1500)
            } else {
                setSuccessMessage('Catégorie créée avec succès')
                if (continueAdding) {
                    // Réinitialiser le formulaire en gardant la campagne et le type
                    setFormData(prev => ({
                        title: '',
                        description: '',
                        image_url: '',
                        game_id: '',
                        visible_by_nyxar: 0,
                        noty_campaign_id: prev.noty_campaign_id,
                        nominee_type: prev.nominee_type
                    }))
                    setTempNominees([])
                    setCustomNominees([])
                } else {
                    navigate(getBackPath())
                }
            }
        } catch (err) {
            setError(err.message)
        }
    }

    if (loading) return <div className="c-form-state">Chargement...</div>

    return (
        <div className="l-form-page">
            <div className="l-form-stack">
                <div className="c-form-header">
                    <h1>{isEdit ? 'Modifier la catégorie' : 'Créer une nouvelle catégorie'}</h1>
                    <div className="c-form-header__actions">
                        <button className="btn btn-secondary" onClick={() => navigate(getBackPath())}>← Retour</button>
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => handleSubmitCategory(false)}
                        >
                            {isEdit ? '✓ Sauvegarder' : '✓ Créer'}
                        </button>
                    </div>
                </div>

                {error && <div className="error-message">{error}</div>}
                {successMessage && <div className="success-message">{successMessage}</div>}

                {/* Boutons d'action en haut */}
                <div className="c-form-toolbar">
                    {!isEdit && (
                        <button
                            type="button"
                            className="btn btn-primary-outline"
                            onClick={() => handleSubmitCategory(true)}
                        >
                            + Ajouter et continuer
                        </button>
                    )}
                </div>

                <form onSubmit={(e) => { e.preventDefault() }}>
                    <div className="c-form-section">
                        <h3>Informations de la catégorie</h3>

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

                            {/* À côté: titre, jeu, description */}
                            <div className="l-form-stack--fields">
                                <div className="f-field">
                                    <label htmlFor="title">Titre *</label>
                                    <input
                                        id="title"
                                        type="text"
                                        placeholder="Titre de la catégorie"
                                        value={formData.title}
                                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                                        required
                                    />
                                </div>

                                <div className="f-field">
                                    <label htmlFor="campaign">Campagne NOTY *</label>
                                    <select
                                        id="campaign"
                                        value={formData.noty_campaign_id}
                                        onChange={(e) => setFormData({...formData, noty_campaign_id: e.target.value})}
                                        required
                                    >
                                        <option value="">Sélectionner une campagne</option>
                                        {campaigns.map(campaign => {
                                            const today = new Date().toISOString().split('T')[0]
                                            const isActive = campaign.start_date <= today && campaign.end_date >= today
                                            return (
                                                <option key={campaign.id} value={campaign.id}>
                                                    {campaign.title}{isActive ? ' (En cours)' : ''}
                                                </option>
                                            )
                                        })}
                                    </select>
                                </div>

                                <div className="f-field">
                                    <label htmlFor="nominee_type">Type de nominés</label>
                                    <select
                                        id="nominee_type"
                                        value={formData.nominee_type}
                                        onChange={(e) => setFormData({...formData, nominee_type: e.target.value, game_id: ''})}
                                    >
                                        <option value="player">Joueurs</option>
                                        <option value="image">Images</option>
                                        <option value="sound">Sons</option>
                                        <option value="video">Vidéo (upload)</option>
                                        <option value="url">URL (YouTube, Twitch...)</option>
                                    </select>
                                </div>

                                {formData.nominee_type === 'player' && (
                                    <div className="f-field">
                                        <label htmlFor="game">Jeu (optionnel)</label>
                                        <select
                                            id="game"
                                            value={formData.game_id}
                                            onChange={(e) => setFormData({...formData, game_id: e.target.value})}
                                        >
                                            <option value="">Catégorie globale</option>
                                            {games.map(game => (
                                                <option key={game.id} value={game.id}>{game.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <div className="f-field">
                                    <label htmlFor="description">Description</label>
                                    <textarea
                                        id="description"
                                        placeholder="Description"
                                        value={formData.description}
                                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                                        rows={3}
                                    ></textarea>
                                </div>

                                <div className="f-field">
                                    <label className="c-form-checkbox">
                                        <input
                                            className="c-form-checkbox__input"
                                            type="checkbox"
                                            checked={formData.visible_by_nyxar === 1}
                                            onChange={(e) => setFormData({...formData, visible_by_nyxar: e.target.checked ? 1 : 0})}
                                        />
                                        <span>Visible à tout le monde</span>
                                    </label>
                                    <p className="c-form-help">Si coché, la catégorie est visible pour les visiteurs. Si décoché, seuls les utilisateurs avec le rôle nyxar ou admin pourront la voir.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section des nominés */}
                    <div className="c-form-section">
                        {formData.nominee_type === 'player' ? (
                            <>
                                <h3>Nominés ({tempNominees.length}/6)</h3>
                                <div className="c-form-nominee-grid">
                                    {getFilteredPlayers().map(player => (
                                        <button
                                            key={player.id}
                                            type="button"
                                            className={`c-form-nominee-card${tempNominees.includes(player.id) ? ' is-selected' : ''}`}
                                            onClick={() => !tempNominees.includes(player.id) && tempNominees.length < 6 && handleAddTempNominee(player.id)}
                                            disabled={tempNominees.includes(player.id) || tempNominees.length >= 6}
                                            title={player.first_name ? `${player.pseudo} (${player.first_name} ${player.last_name})` : player.pseudo}
                                        >
                                            {player.image_url && (
                                                <img src={player.image_url} alt={player.pseudo} className="c-form-nominee-card__image" />
                                            )}
                                            <span className="c-form-nominee-card__name">{player.pseudo}</span>
                                        </button>
                                    ))}
                                </div>
                                {tempNominees.length > 0 && (
                                    <div className="c-form-nominee-selection">
                                        <h5>Sélectionnés</h5>
                                        <div className="c-form-nominee-selection__list">
                                            {tempNominees.map((playerId, index) => {
                                                const player = allPlayers.find(p => p.id === playerId)
                                                return player ? (
                                                    <div key={playerId} className="c-form-nominee-selection__item">
                                                        <div className="c-form-nominee-selection__badge">{index + 1}</div>
                                                        {player.image_url && (
                                                            <img src={player.image_url} alt={player.pseudo} className="c-form-nominee-selection__image" />
                                                        )}
                                                        <div className="c-form-nominee-selection__info">
                                                            <span className="c-form-nominee-selection__name">{player.pseudo}</span>
                                                            {player.first_name && <span className="c-form-nominee-selection__detail">{player.first_name} {player.last_name}</span>}
                                                        </div>
                                                        <button type="button" className="btn-remove-small" onClick={() => handleRemoveTempNominee(playerId)}>✕</button>
                                                    </div>
                                                ) : null
                                            })}
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <>
                                <h3>Nominés custom ({customNominees.length})</h3>

                                {/* Formulaire ajout d'un nominee */}
                                <div className="c-form-custom-nominee-add">
                                    <div className="f-field">
                                        <label>Titre *</label>
                                        <input
                                            type="text"
                                            placeholder="Titre du nominé"
                                            value={newNomineeTitle}
                                            onChange={(e) => setNewNomineeTitle(e.target.value)}
                                        />
                                    </div>

                                    {formData.nominee_type === 'url' ? (
                                        <div className="f-field">
                                            <label>URL (YouTube, Twitch...) *</label>
                                            <input
                                                type="url"
                                                placeholder="https://www.youtube.com/watch?v=... ou https://clips.twitch.tv/..."
                                                value={newNomineeUrl}
                                                onChange={(e) => setNewNomineeUrl(e.target.value)}
                                            />
                                        </div>
                                    ) : (
                                        <div className="f-field">
                                            <label>{formData.nominee_type === 'sound' ? 'Fichier audio *' : formData.nominee_type === 'video' ? 'Fichier vidéo *' : 'Image *'}</label>
                                            {newNomineeUrl && <p className="c-form-help">Fichier : {newNomineeUrl.split('/').pop()}</p>}
                                            <input
                                                type="file"
                                                accept={formData.nominee_type === 'sound' ? 'audio/*' : formData.nominee_type === 'video' ? 'video/*' : 'image/*'}
                                                onChange={handleNomineeFileUpload}
                                                disabled={nomineeUploading}
                                            />
                                            {nomineeUploading && <span className="uploading">Upload en cours...</span>}
                                        </div>
                                    )}

                                    <button
                                        type="button"
                                        className="btn btn-primary-outline"
                                        onClick={handleAddCustomNominee}
                                        disabled={!newNomineeTitle.trim() || !newNomineeUrl.trim() || nomineeUploading}
                                    >
                                        + Ajouter
                                    </button>
                                </div>

                                {/* Liste des custom nominees */}
                                {customNominees.length > 0 && (
                                    <div className="c-form-nominee-selection">
                                        <h5>Nominés ajoutés</h5>
                                        <div className="c-form-nominee-selection__list">
                                            {customNominees.map((nominee, index) => (
                                                <div key={index} className="c-form-nominee-selection__item">
                                                    <div className="c-form-nominee-selection__badge">{index + 1}</div>
                                                    {formData.nominee_type === 'image' && nominee.media_url && (
                                                        <img src={nominee.media_url} alt={nominee.title} className="c-form-nominee-selection__image" />
                                                    )}
                                                    {formData.nominee_type === 'sound' && (
                                                        <audio controls src={nominee.media_url} style={{ height: 32, maxWidth: 200 }} />
                                                    )}
                                                    {formData.nominee_type === 'video' && nominee.media_url && (
                                                        <video src={nominee.media_url} className="c-form-nominee-selection__image" style={{ maxWidth: 120 }} muted />
                                                    )}
                                                    <div className="c-form-nominee-selection__info">
                                                        <span className="c-form-nominee-selection__name">{nominee.title}</span>
                                                        {formData.nominee_type === 'url' && (
                                                            <span className="c-form-nominee-selection__detail">{nominee.media_url}</span>
                                                        )}
                                                    </div>
                                                    <button type="button" className="btn-remove-small" onClick={() => handleRemoveCustomNominee(index)}>✕</button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    <div className="c-form-actions">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => navigate(getBackPath())}
                        >
                            ← Retour
                        </button>
                        {!isEdit && (
                            <button
                                type="button"
                                className="btn btn-primary-outline"
                                onClick={() => handleSubmitCategory(true)}
                            >
                                + Ajouter et continuer
                            </button>
                        )}
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => handleSubmitCategory(false)}
                        >
                            {isEdit ? '✓ Sauvegarder' : '✓ Créer'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
