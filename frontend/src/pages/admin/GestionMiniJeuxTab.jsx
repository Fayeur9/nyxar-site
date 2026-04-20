import { useState, useEffect, useContext, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { miniGames, getDefaultGameStatus } from '../../config/miniGamesConfig'
import { API_URL } from '../../services/api'
import { AuthContext } from '../../context/AuthContext.jsx'
import { fetchMiniGamesSettings, updateMiniGameStatus } from '../../services/miniGames'
import { fetchScoreboard, resetScores, deleteScore } from '../../services/scores'
import { resetGuessMapAttempts } from '../../services/guessMap'
import '../../styles/pages/AdminMiniJeuxTab.css'

export default function GestionMiniJeuxTab() {
    const { token } = useContext(AuthContext)
    const navigate = useNavigate()

    const [gameStatus, setGameStatus] = useState(getDefaultGameStatus())
    const [gameOrder, setGameOrder] = useState({})
    const [scoresByGame, setScoresByGame] = useState({})
    const [showConfirmModal, setShowConfirmModal] = useState(false)
    const [confirmAction, setConfirmAction] = useState(null)
    const [wordleWord, setWordleWord] = useState('')
    const [wordleDate, setWordleDate] = useState(() => new Date().toISOString().slice(0, 10))
    const [wordleSaving, setWordleSaving] = useState(false)
    const [wordleMessage, setWordleMessage] = useState('')
    const [statusSaving, setStatusSaving] = useState(null)
    const [pendingAction, setPendingAction] = useState(false)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [showWordleConfig, setShowWordleConfig] = useState(false)

    const buildGuessMapLeaderboard = useCallback((entries = []) => {
        return entries
            .filter((entry) => entry?.attempts)
            .sort((a, b) => {
                const pointsA = (a.latest_points ?? a.score ?? 0)
                const pointsB = (b.latest_points ?? b.score ?? 0)
                if (pointsA !== pointsB) return pointsB - pointsA
                const attemptsA = a.attempts ?? Number.MAX_SAFE_INTEGER
                const attemptsB = b.attempts ?? Number.MAX_SAFE_INTEGER
                if (attemptsA !== attemptsB) return attemptsA - attemptsB
                return (a.username || '').localeCompare(b.username || '')
            })
    }, [])

    const applyServerData = useCallback((data) => {
        if (!data) return
        const defaults = getDefaultGameStatus()
        setGameStatus({ ...defaults, ...data.statusMap })
        setGameOrder(data.orderMap)
        setScoresByGame(data.scoreboardEntries)
    }, [])

    const loadInitialData = useCallback(async () => {
        const settings = await fetchMiniGamesSettings()
        const statusMap = {}
        const orderMap = {}

        settings.forEach((item) => {
            statusMap[item.slug] = item.isActive
            orderMap[item.slug] = item.displayOrder
        })

        const scoreboardEntries = {}
        await Promise.all(
            miniGames.map(async (game) => {
                const order = 'desc'
                try {
                    const rows = await fetchScoreboard(game.slug, order)
                    scoreboardEntries[game.slug] = rows
                } catch (fetchError) {
                    console.error(`Erreur chargement scoreboard ${game.slug}:`, fetchError)
                    scoreboardEntries[game.slug] = []
                }
            })
        )

        return { statusMap, orderMap, scoreboardEntries }
    }, [])

    const loadScoresForGame = useCallback(async (slug) => {
        try {
            const order = 'desc'
            const rows = await fetchScoreboard(slug, order)
            setScoresByGame((prev) => ({ ...prev, [slug]: rows }))
        } catch (fetchError) {
            setScoresByGame((prev) => ({ ...prev, [slug]: [] }))
            setError(fetchError.message)
        }
    }, [])

    const loadWordleSettings = useCallback(async () => {
        try {
            if (!token) return
            const res = await fetch(`${API_URL}/api/admin/wordle/daily-word`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (!res.ok) return
            const data = await res.json()
            if (data && data.length > 0) {
                const latest = data[0]
                setWordleWord(latest.word || '')
                if (latest.effective_date) {
                    setWordleDate(latest.effective_date.slice(0, 10))
                }
            }
        } catch (err) {
            console.warn('Impossible de charger la configuration Wordle:', err)
        }
    }, [token])

    useEffect(() => {
        let cancelled = false
        const run = async () => {
            setLoading(true)
            setError(null)
            try {
                const data = await loadInitialData()
                if (!cancelled) {
                    applyServerData(data)
                }
            } catch (err) {
                if (!cancelled) {
                    setError(err.message)
                }
            } finally {
                if (!cancelled) {
                    setLoading(false)
                }
            }
        }
        run()
        return () => {
            cancelled = true
        }
    }, [loadInitialData, applyServerData])

    useEffect(() => {
        loadWordleSettings()
    }, [loadWordleSettings])

    const orderedMiniGames = useMemo(() => {
        return [...miniGames].sort((a, b) => {
            const orderA = gameOrder[a.slug] ?? a.id
            const orderB = gameOrder[b.slug] ?? b.id
            return orderA - orderB
        })
    }, [gameOrder])

    const MINI_GAMES_PER_PAGE = 10
    const [miniGamesPage, setMiniGamesPage] = useState(1)

    const filteredMiniGames = useMemo(() => {
        const query = searchQuery.toLowerCase()
        return orderedMiniGames.filter((game) => game.name?.toLowerCase().includes(query))
    }, [orderedMiniGames, searchQuery])

    const miniGamesTotalPages = Math.ceil(filteredMiniGames.length / MINI_GAMES_PER_PAGE)

    const paginatedMiniGames = useMemo(() => {
        const start = (miniGamesPage - 1) * MINI_GAMES_PER_PAGE
        return filteredMiniGames.slice(start, start + MINI_GAMES_PER_PAGE)
    }, [filteredMiniGames, miniGamesPage])

    useEffect(() => {
        setMiniGamesPage(1)
    }, [searchQuery])

    const toggleGameStatus = async (slug) => {
        if (!token) {
            setError('Authentification requise pour modifier le statut du mini-jeu.')
            return
        }
        const current = gameStatus[slug] !== false
        const next = !current
        setGameStatus((prev) => ({ ...prev, [slug]: next }))
        setStatusSaving(slug)
        setError(null)
        try {
            await updateMiniGameStatus(slug, { isActive: next }, token)
        } catch (err) {
            setGameStatus((prev) => ({ ...prev, [slug]: current }))
            setError(err.message)
        } finally {
            setStatusSaving(null)
        }
    }

    const deleteRecord = (game, entry) => {
        if (!entry?.user_id) return
        setConfirmAction({
            type: 'deleteRecord',
            title: `Supprimer le score de ${entry.username || 'Utilisateur'} ?`,
            message: 'Cette action est irréversible.',
            action: async () => {
                if (!token) {
                    setError('Authentification requise pour supprimer un score.')
                    return
                }
                setPendingAction(true)
                setError(null)
                try {
                    await deleteScore(game.slug, entry.user_id, token)
                    await loadScoresForGame(game.slug)
                    setShowConfirmModal(false)
                } catch (err) {
                    setError(err.message)
                } finally {
                    setPendingAction(false)
                }
            }
        })
        setShowConfirmModal(true)
    }

    const resetGameRecords = (game) => {
        setConfirmAction({
            type: 'resetGame',
            title: `Réinitialiser ${game.name} ?`,
            message: 'Tous les scores de ce jeu seront supprimés définitivement.',
            action: async () => {
                if (!token) {
                    setError('Authentification requise pour réinitialiser les scores.')
                    return
                }
                setPendingAction(true)
                setError(null)
                try {
                    await resetScores(game.slug, token)
                    await loadScoresForGame(game.slug)
                    setShowConfirmModal(false)
                } catch (err) {
                    setError(err.message)
                } finally {
                    setPendingAction(false)
                }
            }
        })
        setShowConfirmModal(true)
    }

    const resetGuessMapTries = (game, entry) => {
        if (game.slug !== 'guess_map' || !entry?.user_id) return
        setConfirmAction({
            type: 'resetGuessMapAttempts',
            title: `Réinitialiser les essais de ${entry.username || 'Compte inconnu'} ?`,
            message: 'Cet utilisateur pourra rejouer le défi Guess the Map en cours.',
            action: async () => {
                if (!token) {
                    setError('Authentification requise pour réinitialiser les essais.')
                    return
                }
                setPendingAction(true)
                setError(null)
                try {
                    await resetGuessMapAttempts(entry.user_id, token)
                    await loadScoresForGame(game.slug)
                    setShowConfirmModal(false)
                } catch (err) {
                    setError(err.message)
                } finally {
                    setPendingAction(false)
                }
            }
        })
        setShowConfirmModal(true)
    }

    const resetAllRecords = () => {
        setConfirmAction({
            type: 'resetAll',
            title: '⚠️ RÉINITIALISER TOUS LES JEUX ?',
            message: 'TOUS les scores de TOUS les jeux seront supprimés définitivement. Cette action est irréversible !',
            action: async () => {
                if (!token) {
                    setError('Authentification requise pour réinitialiser les scores.')
                    return
                }
                setPendingAction(true)
                setError(null)
                try {
                    await resetScores(null, token)
                    const data = await loadInitialData()
                    applyServerData(data)
                    setShowConfirmModal(false)
                } catch (err) {
                    setError(err.message)
                } finally {
                    setPendingAction(false)
                }
            }
        })
        setShowConfirmModal(true)
    }

    const openDetails = (game, records) => {
        setConfirmAction({
            type: 'viewDetails',
            title: `📊 ${game.icon} ${game.name}`,
            records,
            game
        })
        setShowConfirmModal(true)
    }

    const handleSaveWordle = async (e) => {
        e.preventDefault()
        if (!token) return
        if (!wordleWord || wordleWord.trim().length !== 5) {
            setWordleMessage('Le mot doit contenir exactement 5 lettres.')
            return
        }
        setWordleSaving(true)
        setWordleMessage('')
        try {
            const res = await fetch(`${API_URL}/api/admin/wordle/daily-word`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    word: wordleWord,
                    date: wordleDate
                })
            })
            if (!res.ok) {
                const data = await res.json().catch(() => ({}))
                throw new Error(data.message || 'Erreur lors de la sauvegarde du mot du jour')
            }
            setWordleMessage('Mot du jour enregistré avec succès.')
        } catch (err) {
            setWordleMessage(err.message)
        } finally {
            setWordleSaving(false)
        }
    }

    return (
        <div className="admin-mini-jeux-tab">
            <div className="tab-header">
                <h2>Gestion des Mini-Jeux</h2>
                <button className="danger-btn" onClick={resetAllRecords}>
                    🗑️ Réinitialiser TOUT
                </button>
            </div>

            {error && (
                <div className="admin-mini-jeux-alert" role="alert">
                    {error}
                </div>
            )}

            <div className="c-admin-filters">
                <div className="f-field c-admin-filters__search">
                    <label htmlFor="minigame-search">Rechercher</label>
                    <input
                        id="minigame-search"
                        type="text"
                        placeholder="Nom du jeu..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="c-admin-filters__meta">
                    {filteredMiniGames.length} / {miniGames.length} jeux
                </div>
            </div>

            <div className="games-table-container">
                <table className="games-table">
                    <thead>
                        <tr>
                            <th>JEU</th>
                            <th>STATUT</th>
                            <th>MEILLEUR SCORE</th>
                            <th>TOP JOUEUR</th>
                            <th>ACTIONS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={5}>Chargement des mini-jeux...</td>
                            </tr>
                        ) : filteredMiniGames.length === 0 ? (
                            <tr>
                                <td colSpan={5}>Aucun mini-jeu trouvé.</td>
                            </tr>
                        ) : (
                            paginatedMiniGames.map((game, index) => {
                                const rawScoreboard = scoresByGame[game.slug] || []
                                const displayScoreboard = game.slug === 'guess_map'
                                    ? buildGuessMapLeaderboard(rawScoreboard)
                                    : rawScoreboard
                                const bestRecord = displayScoreboard[0]
                                const displayScoreValue = game.slug === 'guess_map'
                                    ? bestRecord?.latest_points ?? bestRecord?.score
                                    : bestRecord?.score
                                const isActive = gameStatus[game.slug] !== false
                                const isSaving = statusSaving === game.slug
                                return (
                                    <tr key={game.id}>
                                        <td>
                                            <div className="game-name-cell">
                                                <span className="game-icon">{game.icon}</span>
                                                <span>{game.name}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="status-cell">
                                                <label className="toggle-switch">
                                                    <input
                                                        type="checkbox"
                                                        checked={isActive}
                                                        onChange={() => toggleGameStatus(game.slug)}
                                                        disabled={isSaving}
                                                    />
                                                    <span className="slider"></span>
                                                </label>
                                                <span className={`status-text ${isActive ? 'status-active' : 'status-inactive'}`}>
                                                    {isActive ? 'Actif' : 'Désactivé'}
                                                </span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="score-value">
                                                {bestRecord ? (
                                                    <>
                                                        {displayScoreValue} {game.scoreUnit}
                                                        {game.slug === 'guess_map' && bestRecord.attempts ? ` • ${bestRecord.attempts} essai${bestRecord.attempts > 1 ? 's' : ''}` : ''}
                                                    </>
                                                ) : '-'}
                                            </span>
                                        </td>
                                        <td>
                                            <span className="player-name">
                                                {bestRecord ? (bestRecord.username || 'Compte inconnu') : '-'}
                                            </span>
                                        </td>
                                        <td className="actions-cell">
                                            <div className="action-buttons">
                                                {game.component === 'wordle' ? (
                                                    <button
                                                        className="action-btn wordle-gear-btn"
                                                        onClick={() => {
                                                            setWordleMessage('')
                                                            setShowWordleConfig(true)
                                                        }}
                                                        title="Configurer le mot du jour"
                                                    >
                                                        ⚙️
                                                    </button>
                                                ) : game.component === 'guessMap' ? (
                                                    <button
                                                        className="action-btn guessmap-gear-btn"
                                                        onClick={() => navigate('/week-planner')}
                                                        title="Planifier la semaine"
                                                    >
                                                        📅
                                                    </button>
                                                ) : (
                                                    <span className="wordle-gear-placeholder" aria-hidden="true" />
                                                )}
                                                <button
                                                    className="action-btn details-btn"
                                                    onClick={() => openDetails(game, displayScoreboard)}
                                                    title="Voir les détails"
                                                >
                                                    📊 Détails
                                                </button>
                                                <button
                                                    className="action-btn reset-btn"
                                                    onClick={() => resetGameRecords(game)}
                                                    disabled={rawScoreboard.length === 0}
                                                    title="Réinitialiser"
                                                >
                                                    🔄 Reset
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {miniGamesTotalPages > 1 && (
                <div className="c-pagination">
                    <button
                        className="c-pagination__btn"
                        onClick={() => setMiniGamesPage(p => p - 1)}
                        disabled={miniGamesPage === 1}
                    >
                        &larr; Précédent
                    </button>
                    <div className="c-pagination__pages">
                        {Array.from({ length: miniGamesTotalPages }, (_, i) => i + 1).map(page => (
                            <button
                                key={page}
                                className={`c-pagination__page${page === miniGamesPage ? ' c-pagination__page--active' : ''}`}
                                onClick={() => setMiniGamesPage(page)}
                            >
                                {page}
                            </button>
                        ))}
                    </div>
                    <button
                        className="c-pagination__btn"
                        onClick={() => setMiniGamesPage(p => p + 1)}
                        disabled={miniGamesPage === miniGamesTotalPages}
                    >
                        Suivant &rarr;
                    </button>
                </div>
            )}

            {showConfirmModal && confirmAction && (
                <div className="modal-overlay" onClick={() => setShowConfirmModal(false)}>
                    <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
                        <h2>{confirmAction.title}</h2>
                        {confirmAction.type === 'viewDetails' ? (
                            <div className="details-content">
                                <div className="records-list-modal">
                                    {confirmAction.records.length === 0 ? (
                                        <p className="no-records">Aucun score enregistré</p>
                                    ) : (
                                        confirmAction.records.slice(0, 10).map((entry, index) => {
                                            const canDeleteEntry = Boolean(entry.user_id)
                                            return (
                                                <div key={entry.user_id || index} className="record-item">
                                                    <span className="record-rank">#{index + 1}</span>
                                                    <span className="record-player">{entry.username || 'Compte inconnu'}</span>
                                                    <span className="record-score">
                                                        {confirmAction.game.slug === 'guess_map'
                                                            ? (entry.latest_points ?? entry.score)
                                                            : entry.score}{' '}
                                                        {confirmAction.game.scoreUnit}
                                                        {confirmAction.game.slug === 'guess_map' && entry.attempts ? ` • ${entry.attempts} essai${entry.attempts > 1 ? 's' : ''}` : ''}
                                                    </span>
                                                    {confirmAction.game.slug === 'guess_map' && canDeleteEntry && (
                                                        <button
                                                            className="guessmap-reset-btn"
                                                            onClick={() => resetGuessMapTries(confirmAction.game, entry)}
                                                            title="Réinitialiser les essais Guess the Map"
                                                        >
                                                            🔄 Essais
                                                        </button>
                                                    )}
                                                    {canDeleteEntry && (
                                                        <button
                                                            className="delete-record-btn"
                                                            onClick={() => deleteRecord(confirmAction.game, entry)}
                                                            title="Supprimer ce score"
                                                        >
                                                            🗑️
                                                        </button>
                                                    )}
                                                </div>
                                            )
                                        })
                                    )}
                                </div>
                                <button className="close-modal-btn" onClick={() => setShowConfirmModal(false)}>
                                    Fermer
                                </button>
                            </div>
                        ) : (
                            <>
                                <p>{confirmAction.message}</p>
                                <div className="modal-actions">
                                    <button className="cancel-btn" onClick={() => setShowConfirmModal(false)}>
                                        Annuler
                                    </button>
                                    <button
                                        className="confirm-btn"
                                        onClick={async () => {
                                            if (!confirmAction.action) return
                                            await confirmAction.action()
                                        }}
                                        disabled={pendingAction}
                                    >
                                        {pendingAction ? 'Traitement...' : 'Confirmer'}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {showWordleConfig && (
                <div className="modal-overlay" onClick={() => setShowWordleConfig(false)}>
                    <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
                        <h2>Wordle Nyxar - Mot du jour</h2>
                        <p>Définissez le mot de 5 lettres utilisé pour la date choisie.</p>
                        <form className="wordle-admin-form" onSubmit={handleSaveWordle}>
                            <label>
                                Date du mot :
                                <input
                                    type="date"
                                    value={wordleDate}
                                    onChange={(e) => setWordleDate(e.target.value)}
                                />
                            </label>
                            <label>
                                Mot (5 lettres) :
                                <input
                                    type="text"
                                    maxLength={5}
                                    value={wordleWord}
                                    onChange={(e) => setWordleWord(e.target.value.toUpperCase())}
                                />
                            </label>
                            <button type="submit" disabled={wordleSaving}>
                                {wordleSaving ? 'Enregistrement...' : 'Enregistrer le mot'}
                            </button>
                        </form>
                        {wordleMessage && (
                            <p className="wordle-admin-message">{wordleMessage}</p>
                        )}
                        <button className="close-modal-btn" onClick={() => setShowWordleConfig(false)}>
                            Fermer
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
