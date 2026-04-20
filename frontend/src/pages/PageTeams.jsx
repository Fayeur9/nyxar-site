import { useState, useEffect, useContext, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'
import { API_URL } from '../services/api'
import PlayerCard from '../components/players/PlayerCard'
import PlayerDetailsModal from '../components/modals/PlayerDetailsModal'
import '../styles/pages/LineUpsPage.css'

const FALLBACK_COLOR = '#667eea'

const dedupePreserveOrder = (values) => {
    const unique = []
    values.forEach((value) => {
        if (value && !unique.includes(value)) unique.push(value)
    })
    return unique
}

const CAPTAIN_GRADIENT = 'linear-gradient(135deg, #f59e0b, #d97706, #fbbf24)'
const CAPTAIN_GLOW = '0 0 12px rgba(245, 158, 11, 0.5)'

const buildBorderStyleFromColors = (colors, isCaptain = false) => {
    if (isCaptain) return { background: CAPTAIN_GRADIENT, boxShadow: CAPTAIN_GLOW }
    const palette = colors.length > 0 ? colors : [FALLBACK_COLOR]
    const gradient = palette.length === 1
        ? `linear-gradient(135deg, ${palette[0]}, ${palette[0]})`
        : `linear-gradient(135deg, ${palette.join(', ')})`
    const first = palette[0]
    const last = palette[palette.length - 1]
    const glow = palette.length > 1
        ? `0 0 8px ${first}, 0 0 16px ${last}`
        : `0 0 12px ${first}`
    return { background: gradient, boxShadow: glow }
}

export default function PageTeams() {
    const { user, token } = useContext(AuthContext)
    const navigate = useNavigate()
    const [lineUps, setLineUps] = useState([])
    const [players, setPlayers] = useState([])
    const [selectedLineUpId, setSelectedLineUpId] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [activePlayer, setActivePlayer] = useState(null)
    const [trackmaniaState, setTrackmaniaState] = useState({ status: 'idle', data: null, error: null })

    useEffect(() => {
        document.title = 'Équipes | Nyxar'
    }, [])

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true)
            try {
                const buildOptions = () => token ? { headers: { Authorization: `Bearer ${token}` } } : undefined

                const [lineUpsResponse, playersResponse] = await Promise.all([
                    fetch(`${API_URL}/api/line-ups/line-ups`, buildOptions()),
                    fetch(`${API_URL}/api/line-ups/players`, buildOptions())
                ])

                if (!lineUpsResponse.ok) throw new Error('Erreur recuperation line-ups')
                if (!playersResponse.ok) throw new Error('Erreur recuperation joueurs')

                const [lineUpsData, playersData] = await Promise.all([
                    lineUpsResponse.json(),
                    playersResponse.json()
                ])

                setLineUps(lineUpsData)
                setPlayers(playersData.map(player => ({ ...player, lineups: player.lineups || [] })))
                setError(null)
                setSelectedLineUpId(prev => {
                    if (!prev) return null
                    return lineUpsData.some(lineup => lineup.id === prev) ? prev : null
                })
            } catch (err) {
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [token])

    const lineUpOrderMap = useMemo(() => {
        const map = new Map()
        lineUps.forEach((lineup, index) => map.set(lineup.id, index))
        return map
    }, [lineUps])

    const lineUpCounts = useMemo(() => {
        const counts = {}
        players.forEach(player => {
            (player.lineups || []).forEach(lineup => {
                counts[lineup.id] = (counts[lineup.id] || 0) + 1
            })
        })
        return counts
    }, [players])

    const isCaptainInContext = (player) => {
        if (!selectedLineUpId) return player.is_captain
        const lineup = player.lineups?.find(lu => lu.id === selectedLineUpId)
        return lineup?.is_captain || false
    }

    const displayedPlayers = useMemo(() => {
        const filtered = selectedLineUpId
            ? players.filter(player => player.lineups?.some(lu => lu.id === selectedLineUpId))
            : [...players]

        filtered.sort((a, b) => {
            const aCaptain = selectedLineUpId
                ? a.lineups?.find(lu => lu.id === selectedLineUpId)?.is_captain
                : a.is_captain
            const bCaptain = selectedLineUpId
                ? b.lineups?.find(lu => lu.id === selectedLineUpId)?.is_captain
                : b.is_captain
            if (aCaptain && !bCaptain) return -1
            if (!aCaptain && bCaptain) return 1
            return a.pseudo.localeCompare(b.pseudo, 'fr', { sensitivity: 'base' })
        })
        return filtered
    }, [players, selectedLineUpId])

    const selectedLineUp = useMemo(
        () => lineUps.find(lineup => lineup.id === selectedLineUpId) || null,
        [lineUps, selectedLineUpId]
    )

    const buildPlayerPresentation = (player) => {
        const attachedLineups = player.lineups || []
        const isCaptain = isCaptainInContext(player)

        if (attachedLineups.length === 0) {
            return { style: buildBorderStyleFromColors([FALLBACK_COLOR], isCaptain), isCaptain }
        }

        const orderedLineups = [...attachedLineups].sort((a, b) => {
            const orderA = lineUpOrderMap.get(a.id) ?? Number.MAX_SAFE_INTEGER
            const orderB = lineUpOrderMap.get(b.id) ?? Number.MAX_SAFE_INTEGER
            return orderA - orderB
        })

        let palette = dedupePreserveOrder(orderedLineups.map(lineup => lineup.color || FALLBACK_COLOR))

        if (selectedLineUpId) {
            const selected = orderedLineups.find(lineup => lineup.id === selectedLineUpId)
            if (selected) palette = [selected.color || FALLBACK_COLOR]
        }

        return { style: buildBorderStyleFromColors(palette, isCaptain), isCaptain }
    }

    const selectionTitle = selectedLineUp ? selectedLineUp.name : 'Équipe'
    const displayedCount = displayedPlayers.length
    const playersCountLabel = `${displayedCount} joueur${displayedCount > 1 ? 's' : ''}`
    const headerSubtitle = selectedLineUp
        ? `${playersCountLabel} - ${selectedLineUp.game_name || 'Line-up'}`
        : playersCountLabel
    const headerStyle = selectedLineUp ? { borderColor: selectedLineUp.color || FALLBACK_COLOR } : undefined

    const lineUpsByGame = useMemo(() => {
        const grouped = {}
        lineUps.forEach(lineup => {
            const gameKey = lineup.game_name || 'Autre'
            if (!grouped[gameKey]) grouped[gameKey] = []
            grouped[gameKey].push(lineup)
        })
        return grouped
    }, [lineUps])

    const handlePlayerOpen = (playerData) => {
        setActivePlayer(playerData)
        setTrackmaniaState({
            status: playerData.trackmaniaLink ? 'loading' : 'idle',
            data: null, error: null
        })
    }

    const handlePlayerClose = () => {
        setActivePlayer(null)
        setTrackmaniaState({ status: 'idle', data: null, error: null })
    }

    useEffect(() => {
        if (!activePlayer?.id || !activePlayer.trackmaniaLink) return

        const controller = new AbortController()

        const fetchTrackmaniaStats = async () => {
            setTrackmaniaState({ status: 'loading', data: null, error: null })
            try {
                const response = await fetch(
                    `${API_URL}/api/line-ups/players/${activePlayer.id}/trackmania/stats`,
                    { signal: controller.signal }
                )

                if (response.status === 404) {
                    const missingPayload = await response.json().catch(() => ({}))
                    setTrackmaniaState({
                        status: 'missing', data: null,
                        error: missingPayload.message || 'Profil Trackmania.io introuvable.'
                    })
                    return
                }

                if (!response.ok) {
                    const errorPayload = await response.json().catch(() => ({}))
                    throw new Error(errorPayload.message || 'Erreur récupération stats Trackmania')
                }

                setTrackmaniaState({ status: 'ready', data: await response.json(), error: null })
            } catch (err) {
                if (controller.signal.aborted) return
                setTrackmaniaState({ status: 'error', data: null, error: err.message })
            }
        }

        fetchTrackmaniaStats()
        return () => controller.abort()
    }, [activePlayer])

    return (
        <div className="page-container lineups-page">
            <div className="teams-layout">
                <aside className="teams-sidebar">
                    <h2 className="teams-sidebar__title">Line-ups</h2>
                    <div className="teams-sidebar__list">
                        {Object.entries(lineUpsByGame).map(([gameName, gameLineUps]) => (
                            <div key={gameName} className="teams-sidebar__group">
                                <h3 className="teams-sidebar__group-title">{gameName}</h3>
                                {gameLineUps.map(lineup => {
                                    const isActive = selectedLineUpId === lineup.id
                                    const accent = lineup.color || FALLBACK_COLOR
                                    return (
                                        <button
                                            key={lineup.id}
                                            type="button"
                                            className={`teams-sidebar__item ${isActive ? 'active' : ''}`}
                                            onClick={() => setSelectedLineUpId(prev => prev === lineup.id ? null : lineup.id)}
                                            style={{ '--lineup-accent': accent }}
                                        >
                                            <span className="teams-sidebar__identity">
                                                <span className="teams-sidebar__color" style={{ background: accent }} />
                                                <span className="teams-sidebar__label">{lineup.name}</span>
                                            </span>
                                            <span className="teams-sidebar__count">{lineUpCounts[lineup.id] || 0}</span>
                                        </button>
                                    )
                                })}
                            </div>
                        ))}
                    </div>
                </aside>

                <section className="teams-content">
                    <div className="teams-content__header" style={headerStyle}>
                        <div className="teams-content__title">
                            <span className="teams-content__eyebrow">Line-ups</span>
                            <h1>{selectionTitle}</h1>
                            <p>{headerSubtitle}</p>
                        </div>
                        {user?.role === 'admin' && (
                            <div className="teams-admin-actions">
                                <button
                                    type="button"
                                    className="btn btn-add"
                                    onClick={() => navigate('/teams/lineup/edit')}
                                >
                                    + Ajouter une Line-up
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-add-player"
                                    onClick={() => navigate('/admin', { state: { activeTab: 'players', openAddModal: true } })}
                                >
                                    + Ajouter un Joueur
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="teams-content__players-container">
                        {error && <div className="error teams-error">{error}</div>}

                        {loading ? (
                            <div className="teams-state"><div className="spinner" />Chargement des joueurs...</div>
                        ) : displayedPlayers.length === 0 ? (
                            <div className="teams-state">Aucun joueur pour cette line-up pour le moment.</div>
                        ) : (
                            <div className="lineup-players teams-players-grid">
                                {displayedPlayers.map(player => {
                                    const { style, isCaptain } = buildPlayerPresentation(player)
                                    return (
                                        <div
                                            key={player.id}
                                            className={`player-card-shell${isCaptain ? ' player-card-shell--captain' : ''}`}
                                            style={style}
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => handlePlayerOpen(player)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault()
                                                    handlePlayerOpen(player)
                                                }
                                            }}
                                        >
                                            <PlayerCard
                                                player={player}
                                                isCaptain={isCaptain}
                                                showPseudoOnHover={true}
                                            />
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </section>
            </div>
            <PlayerDetailsModal
                isOpen={Boolean(activePlayer)}
                player={activePlayer}
                statsState={trackmaniaState}
                onClose={handlePlayerClose}
            />
        </div>
    )
}
