import { useState, useEffect, useContext, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_URL } from '../services/api'
import { resetAllGuessMapAttempts } from '../services/guessMap'
import { AuthContext } from '../context/AuthContext'
import '../styles/pages/PageWeekPlanner.css'

const DIFFICULTIES = [
    { value: 'offert', label: 'Offert' },
    { value: 'facile', label: 'Facile' },
    { value: 'moyen', label: 'Moyen' },
    { value: 'difficile', label: 'Difficile' },
    { value: 'introuvable', label: 'Introuvable' }
]

const normalizeDateKey = (value) => {
    if (!value) {
        return ''
    }

    if (typeof value === 'string') {
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            return value
        }
        const parsed = new Date(value)
        if (!Number.isNaN(parsed.getTime())) {
            return parsed.toISOString().slice(0, 10)
        }
        return value
    }

    if (value instanceof Date) {
        return value.toISOString().slice(0, 10)
    }

    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) {
        return parsed.toISOString().slice(0, 10)
    }

    return `${value}`
}

const initializeWeekChallenges = () => {
    const today = new Date()
    const challenges = []
    for (let i = 0; i < 7; i++) {
        const date = new Date(today)
        date.setDate(date.getDate() + i)
        challenges.push({
            date: date.toISOString().slice(0, 10),
            difficulty: 'moyen',
            tmxId: '',
            imageFile: null,
            imagePreview: '',
            saving: false,
            message: '',
            existingChallenge: null,
            isEditing: true
        })
    }
    return challenges
}

const formatDayName = (dateObj) => {
    const name = dateObj.toLocaleDateString('fr-FR', { weekday: 'long' })
    return name.charAt(0).toUpperCase() + name.slice(1)
}

export default function PageWeekPlanner() {
    const { token } = useContext(AuthContext)
    const navigate = useNavigate()
    const [weekChallenges, setWeekChallenges] = useState(() => initializeWeekChallenges())
    const [previewChallenge, setPreviewChallenge] = useState(null)
    const [loadingExisting, setLoadingExisting] = useState(false)
    const [plannerError, setPlannerError] = useState('')
    const weekDatesRef = useRef(null)

    if (!weekDatesRef.current) {
        weekDatesRef.current = weekChallenges.map(challenge => normalizeDateKey(challenge.date))
    }

    const fetchExistingChallenges = useCallback(async () => {
        if (!token) {
            return
        }

        const dates = weekDatesRef.current || []
        const from = dates[0]
        const to = dates[dates.length - 1]

        setLoadingExisting(true)
        setPlannerError('')

        try {
            const url = new URL(`${API_URL}/api/admin/guess-map/challenges`)
            if (from) url.searchParams.set('from', from)
            if (to) url.searchParams.set('to', to)
            url.searchParams.set('limit', '50')

            const res = await fetch(url.toString(), {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            })

            const data = await res.json().catch(() => null)

            if (!res.ok || !Array.isArray(data)) {
                const message = data?.message || 'Erreur lors du chargement des défis existants'
                throw new Error(message)
            }

            const byDate = new Map(
                data.map(challenge => {
                    const normalizedDate = normalizeDateKey(challenge.date)
                    return [normalizedDate, { ...challenge, date: normalizedDate }]
                })
            )

            setWeekChallenges(prev => prev.map(challenge => {
                const key = normalizeDateKey(challenge.date)
                const existing = byDate.get(key) || null
                if (!existing) {
                    return {
                        ...challenge,
                        existingChallenge: null,
                        isEditing: true
                    }
                }

                if (challenge.isEditing && challenge.saving) {
                    return {
                        ...challenge,
                        existingChallenge: existing
                    }
                }

                return {
                    ...challenge,
                    existingChallenge: existing,
                    difficulty: existing.difficulty,
                    tmxId: existing.tmxId,
                    imageFile: null,
                    imagePreview: '',
                    message: '',
                    isEditing: false,
                    saving: false
                }
            }))
        } catch (error) {
            setPlannerError(error.message)
        } finally {
            setLoadingExisting(false)
        }
    }, [token])

    useEffect(() => {
        fetchExistingChallenges()
    }, [fetchExistingChallenges])

    const updateChallengeAt = (index, updater) => {
        setWeekChallenges(prev => {
            const updated = [...prev]
            updated[index] = updater({ ...updated[index] })
            return updated
        })
    }

    const handleChallengeChange = (index, field, value) => {
        updateChallengeAt(index, current => {
            current[field] = value
            current.message = ''
            current.isEditing = true
            return current
        })
    }

    const handleChallengeImage = (index, file) => {
        if (!file) {
            return
        }

        const reader = new FileReader()
        reader.onload = () => {
            const originalDataUrl = reader.result
            const img = new Image()
            img.onload = () => {
                const maxWidth = 1280
                const maxHeight = 960
                let { width, height } = img

                const shouldResize = width > maxWidth || height > maxHeight
                const shouldCompress = file.size > 2500000 || shouldResize

                let finalDataUrl = originalDataUrl

                if (shouldCompress) {
                    const canvas = document.createElement('canvas')

                    if (width > maxWidth || height > maxHeight) {
                        if (width > height) {
                            height = Math.round((height * maxWidth) / width)
                            width = maxWidth
                        } else {
                            width = Math.round((width * maxHeight) / height)
                            height = maxHeight
                        }
                    }

                    canvas.width = width
                    canvas.height = height
                    const ctx = canvas.getContext('2d')
                    ctx.drawImage(img, 0, 0, width, height)

                    const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
                    const quality = mimeType === 'image/jpeg' ? 0.85 : undefined
                    finalDataUrl = canvas.toDataURL(mimeType, quality)
                }

                updateChallengeAt(index, current => {
                    current.imageFile = file
                    current.imagePreview = finalDataUrl
                    current.message = ''
                    current.isEditing = true
                    return current
                })
            }
            img.src = reader.result
        }
        reader.readAsDataURL(file)
    }

    const handleRemoveImage = (index) => {
        updateChallengeAt(index, current => {
            current.imageFile = null
            current.imagePreview = ''
            current.message = ''
            return current
        })
    }

    const handleStartEdit = (index) => {
        updateChallengeAt(index, current => {
            if (current.existingChallenge) {
                current.difficulty = current.existingChallenge.difficulty
                current.tmxId = current.existingChallenge.tmxId
            }
            current.isEditing = true
            current.message = ''
            return current
        })
    }

    const handleCancelEdit = (index) => {
        updateChallengeAt(index, current => {
            if (current.existingChallenge) {
                current.difficulty = current.existingChallenge.difficulty
                current.tmxId = current.existingChallenge.tmxId
                current.imagePreview = ''
                current.imageFile = null
                current.isEditing = false
            } else {
                current.difficulty = 'moyen'
                current.tmxId = ''
                current.imagePreview = ''
                current.imageFile = null
                current.isEditing = true
            }
            current.saving = false
            current.message = ''
            return current
        })
    }

    const handleResetDay = async (index) => {
        const challenge = weekChallenges[index]
        const hasExisting = Boolean(challenge.existingChallenge)

        if (!hasExisting) {
            updateChallengeAt(index, current => ({
                ...current,
                difficulty: 'moyen',
                tmxId: '',
                imagePreview: '',
                imageFile: null,
                existingChallenge: null,
                message: '',
                isEditing: true,
                saving: false
            }))
            return
        }

        if (!token) {
            updateChallengeAt(index, current => ({
                ...current,
                message: '❌ Non authentifié'
            }))
            return
        }

        updateChallengeAt(index, current => ({
            ...current,
            saving: true,
            message: '⏳ Réinitialisation...'
        }))

        try {
            const res = await fetch(`${API_URL}/api/admin/guess-map/challenges/${challenge.existingChallenge.id}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`
                }
            })

            const data = await res.json().catch(() => null)

            if (!res.ok) {
                const message = data?.message || 'Erreur lors de la réinitialisation'
                throw new Error(message)
            }

            updateChallengeAt(index, current => ({
                ...current,
                difficulty: 'moyen',
                tmxId: '',
                imagePreview: '',
                imageFile: null,
                existingChallenge: null,
                saving: false,
                isEditing: true,
                message: '✅ Défi réinitialisé'
            }))

            fetchExistingChallenges()
        } catch (error) {
            updateChallengeAt(index, current => ({
                ...current,
                saving: false,
                message: `❌ ${error.message}`
            }))
        }
    }

    const handleResetAttemptsForDay = async (index) => {
        if (!token) {
            updateChallengeAt(index, current => ({
                ...current,
                message: '❌ Non authentifié'
            }))
            return
        }

        const challenge = weekChallenges[index]
        const challengeId = challenge.existingChallenge?.id
        const confirmMessage = challengeId
            ? 'Réinitialiser les essais de tous les joueurs pour ce défi ?'
            : 'Réinitialiser les essais de tous les joueurs pour le dernier défi publié ?'

        if (!window.confirm(confirmMessage)) {
            return
        }

        updateChallengeAt(index, current => ({
            ...current,
            saving: true,
            message: '⏳ Réinitialisation des essais en cours...'
        }))

        try {
            const result = await resetAllGuessMapAttempts(token, challengeId)
            const cleared = Number.isFinite(result?.clearedAttempts) ? result.clearedAttempts : 0
            const attemptLabel = cleared === 1 ? 'tentative' : 'tentatives'

            updateChallengeAt(index, current => ({
                ...current,
                saving: false,
                message: `✅ Essais réinitialisés (${cleared} ${attemptLabel} supprimée${cleared > 1 ? 's' : ''})`
            }))
        } catch (error) {
            updateChallengeAt(index, current => ({
                ...current,
                saving: false,
                message: `❌ ${error.message}`
            }))
        }
    }

    const handlePublishDay = async (index) => {
        const challenge = weekChallenges[index]
        const hasExisting = Boolean(challenge.existingChallenge)
        const trimmedTmxId = challenge.tmxId.trim()
        const imageSource = challenge.imagePreview || challenge.existingChallenge?.imageDataUrl || ''

        if (!trimmedTmxId) {
            updateChallengeAt(index, current => ({
                ...current,
                message: '❌ Numéro TMX requis'
            }))
            return
        }

        if (!hasExisting && !challenge.imagePreview) {
            updateChallengeAt(index, current => ({
                ...current,
                message: '❌ Image requise'
            }))
            return
        }

        if (!imageSource) {
            updateChallengeAt(index, current => ({
                ...current,
                message: '❌ Image introuvable'
            }))
            return
        }

        if (!token) {
            updateChallengeAt(index, current => ({
                ...current,
                message: '❌ Non authentifié'
            }))
            return
        }

        const pendingMessage = hasExisting ? '⏳ Mise à jour...' : '⏳ Publication...'

        updateChallengeAt(index, current => ({
            ...current,
            saving: true,
            message: pendingMessage
        }))

        try {
            const payload = {
                difficulty: challenge.difficulty,
                tmxId: trimmedTmxId
            }

            if (!hasExisting) {
                payload.date = challenge.date
                payload.imageDataUrl = challenge.imagePreview
            } else if (challenge.imagePreview) {
                payload.imageDataUrl = challenge.imagePreview
            }

            const endpoint = hasExisting
                ? `${API_URL}/api/admin/guess-map/challenges/${challenge.existingChallenge.id}`
                : `${API_URL}/api/admin/guess-map/challenges`

            const res = await fetch(endpoint, {
                method: hasExisting ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            })

            const data = await res.json().catch(() => null)

            if (!res.ok) {
                const message = data?.message || 'Erreur lors de la sauvegarde'
                throw new Error(message)
            }

            const updatedChallenge = data?.challenge

            updateChallengeAt(index, current => ({
                ...current,
                saving: false,
                message: hasExisting ? '✅ Défi mis à jour' : '✅ Défi publié',
                difficulty: hasExisting ? current.difficulty : 'moyen',
                tmxId: hasExisting ? current.tmxId : '',
                imagePreview: '',
                imageFile: null,
                isEditing: hasExisting ? false : true,
                existingChallenge: updatedChallenge
                    ? { ...updatedChallenge, date: normalizeDateKey(updatedChallenge.date) }
                    : current.existingChallenge
            }))

            fetchExistingChallenges()
        } catch (error) {
            updateChallengeAt(index, current => ({
                ...current,
                saving: false,
                message: `❌ ${error.message}`
            }))
        }
    }

    return (
        <>
            <div className="page-week-planner">
                <div className="planner-container">
                    <div className="planner-header">
                        <button className="back-btn" onClick={() => navigate('/admin/games')}>
                            ← Retour
                        </button>
                        <h1>📅 Planifier Guess the Map</h1>
                        <p className="planner-subtitle">Configurez les défis semaine par semaine, jour par jour</p>
                        {loadingExisting && <p className="planner-loading">Chargement des défis existants...</p>}
                        {plannerError && <p className="planner-error">{plannerError}</p>}
                    </div>

                    <div className="week-challenges-list">
                        {weekChallenges.map((challenge, index) => {
                            const dateObj = new Date(challenge.date)
                            const dayName = formatDayName(dateObj)
                            const fullDate = dateObj.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
                            const hasExisting = Boolean(challenge.existingChallenge)
                            const isEditing = challenge.isEditing
                            const imageSource = challenge.imagePreview || challenge.existingChallenge?.imageDataUrl || ''
                            const publishDisabled = challenge.saving || !challenge.tmxId.trim() || (!hasExisting && !challenge.imagePreview)
                            const difficultyForDisplay = hasExisting ? challenge.existingChallenge?.difficulty : challenge.difficulty
                            const tmxForDisplay = hasExisting ? challenge.existingChallenge?.tmxId : challenge.tmxId

                            return (
                                <div
                                    key={challenge.date}
                                    className={`challenge-row ${isEditing ? 'editing' : ''} ${hasExisting ? 'published' : ''}`}
                                >
                                    <div className="row-date">
                                        <span className="day-name">{dayName}</span>
                                        <span className="full-date">{fullDate}</span>
                                    </div>

                                    {isEditing ? (
                                        <>
                                            <div className="row-fields">
                                                <div className="field-group">
                                                    <label>Difficulté</label>
                                                    <select
                                                        value={challenge.difficulty}
                                                        onChange={(e) => handleChallengeChange(index, 'difficulty', e.target.value)}
                                                        disabled={challenge.saving}
                                                    >
                                                        {DIFFICULTIES.map(({ value, label }) => (
                                                            <option key={value} value={value}>
                                                                {label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div className="field-group">
                                                    <label>Numéro TMX</label>
                                                    <input
                                                        type="text"
                                                        placeholder="ex: 12345678"
                                                        value={challenge.tmxId}
                                                        onChange={(e) => handleChallengeChange(index, 'tmxId', e.target.value)}
                                                        disabled={challenge.saving}
                                                    />
                                                </div>

                                                <div className="image-thumb-wrapper">
                                                    <span className="field-label">Image</span>
                                                    <label className={`image-thumb ${imageSource ? 'has-image' : 'empty'}`}>
                                                        {imageSource ? (
                                                            <img src={imageSource} alt={`Défi Guess the Map ${fullDate}`} />
                                                        ) : (
                                                            <span>Ajouter</span>
                                                        )}
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            onChange={(e) => e.target.files && handleChallengeImage(index, e.target.files[0])}
                                                            disabled={challenge.saving}
                                                        />
                                                    </label>
                                                    {challenge.imagePreview && (
                                                        <button
                                                            type="button"
                                                            className="link-btn"
                                                            onClick={() => handleRemoveImage(index)}
                                                            disabled={challenge.saving}
                                                        >
                                                            Retirer l'image
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="row-actions">
                                                {challenge.message && (
                                                    <span className={`message ${challenge.message.includes('✅') ? 'success' : challenge.message.includes('⏳') ? 'loading' : 'error'}`}>
                                                        {challenge.message}
                                                    </span>
                                                )}

                                                <div className="action-buttons">
                                                    {imageSource && (
                                                        <button
                                                            type="button"
                                                            className="preview-btn"
                                                            onClick={() => setPreviewChallenge({
                                                                ...(challenge.existingChallenge || {}),
                                                                imageDataUrl: imageSource,
                                                                fullDate,
                                                                dayName,
                                                                difficulty: challenge.difficulty,
                                                                tmxId: challenge.tmxId
                                                            })}
                                                            disabled={challenge.saving}
                                                        >
                                                            Voir l'image
                                                        </button>
                                                    )}
                                                    {hasExisting && (
                                                        <button
                                                            type="button"
                                                            className="secondary-btn"
                                                            onClick={() => handleCancelEdit(index)}
                                                            disabled={challenge.saving}
                                                        >
                                                            Annuler
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        className="secondary-btn"
                                                        onClick={() => handleResetAttemptsForDay(index)}
                                                        disabled={challenge.saving || !hasExisting}
                                                        title="Remettre tous les joueurs à 3 essais"
                                                    >
                                                        🔄 Reset essais joueurs
                                                    </button>
                                                    <button
                                                        className="publish-btn"
                                                        onClick={() => handlePublishDay(index)}
                                                        disabled={publishDisabled}
                                                    >
                                                        {challenge.saving ? '⏳' : hasExisting ? 'Mettre à jour' : 'Publier'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="danger-btn"
                                                        onClick={() => handleResetDay(index)}
                                                        disabled={challenge.saving}
                                                    >
                                                        Réinitialiser
                                                    </button>
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="row-summary">
                                                <div className="summary-item">
                                                    <span className="summary-label">Difficulté</span>
                                                    <span className={`difficulty-pill difficulty-${difficultyForDisplay}`}>
                                                        {DIFFICULTIES.find(d => d.value === difficultyForDisplay)?.label || difficultyForDisplay}
                                                    </span>
                                                </div>
                                                <div className="summary-item">
                                                    <span className="summary-label">Numéro TMX</span>
                                                    <span className="tmx-badge">{tmxForDisplay}</span>
                                                </div>
                                            </div>

                                            <div className="row-actions">
                                                {challenge.message && (
                                                    <span className={`message ${challenge.message.includes('✅') ? 'success' : challenge.message.includes('⏳') ? 'loading' : 'error'}`}>
                                                        {challenge.message}
                                                    </span>
                                                )}
                                                <div className="action-buttons">
                                                    {challenge.existingChallenge?.imageDataUrl && (
                                                        <button
                                                            type="button"
                                                            className="preview-btn"
                                                            onClick={() => setPreviewChallenge({
                                                                ...challenge.existingChallenge,
                                                                fullDate,
                                                                dayName
                                                            })}
                                                        >
                                                            Voir l'image
                                                        </button>
                                                    )}
                                                    {hasExisting && (
                                                        <button
                                                            type="button"
                                                            className="secondary-btn"
                                                            onClick={() => handleResetAttemptsForDay(index)}
                                                            disabled={challenge.saving}
                                                            title="Remettre tous les joueurs à 3 essais"
                                                        >
                                                            🔄 Reset essais joueurs
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        className="secondary-btn"
                                                        onClick={() => handleStartEdit(index)}
                                                    >
                                                        Modifier
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="danger-btn"
                                                        onClick={() => handleResetDay(index)}
                                                    >
                                                        Réinitialiser
                                                    </button>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>

            {previewChallenge && (
                <div className="modal-overlay" onClick={() => setPreviewChallenge(null)}>
                    <div className="confirm-modal preview-modal" onClick={(e) => e.stopPropagation()}>
                        <h2>Défi du {previewChallenge.fullDate}</h2>
                        {previewChallenge.dayName && <p><strong>Jour :</strong> {previewChallenge.dayName}</p>}
                        <p><strong>Difficulté :</strong> {previewChallenge.difficulty}</p>
                        <p><strong>Numéro TMX :</strong> {previewChallenge.tmxId}</p>
                        {previewChallenge.tmxUrl && (
                            <p>
                                <a href={previewChallenge.tmxUrl} target="_blank" rel="noopener noreferrer">
                                    Ouvrir sur Trackmania Exchange
                                </a>
                            </p>
                        )}
                        {previewChallenge.imageDataUrl ? (
                            <img src={previewChallenge.imageDataUrl} alt={`Défi Guess the Map ${previewChallenge.fullDate}`} className="preview-image" />
                        ) : (
                            <p>Aucune image disponible.</p>
                        )}
                        <button className="close-modal-btn" onClick={() => setPreviewChallenge(null)}>
                            Fermer
                        </button>
                    </div>
                </div>
            )}
        </>
    )
}
