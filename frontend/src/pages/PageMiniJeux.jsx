import { useState, useEffect, useContext, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'
import { miniGames, getDefaultGameStatus } from '../config/miniGamesConfig'
import { fetchMiniGamesSettings } from '../services/miniGames'
import { fetchScoreboard } from '../services/scores'
import '../styles/pages/PageMiniJeux.css'

const lowerScoreBetter = new Set()

export default function PageMiniJeux() {
    const { user } = useContext(AuthContext)
    const navigate = useNavigate()
    const [showLeaderboard, setShowLeaderboard] = useState(false)
    const [selectedLeaderboardGame, setSelectedLeaderboardGame] = useState(null)
    const [gameStatus, setGameStatus] = useState(getDefaultGameStatus())
    const [gameOrder, setGameOrder] = useState({})
    const [scoresByGame, setScoresByGame] = useState({})
    const [loadingData, setLoadingData] = useState(true)
    const [error, setError] = useState(null)

    const orderedMiniGames = useMemo(() => {
        return [...miniGames].sort((a, b) => {
            const orderA = gameOrder[a.slug] ?? a.id
            const orderB = gameOrder[b.slug] ?? b.id
            return orderA - orderB
        })
    }, [gameOrder])

    useEffect(() => {
        document.title = 'Mini-jeux | Nyxar'
    }, [])

    useEffect(() => {
        let cancelled = false
        const load = async () => {
            setLoadingData(true)
            setError(null)
            try {
                const settings = await fetchMiniGamesSettings()
                if (cancelled) return

                const statusMap = getDefaultGameStatus()
                const orderMap = {}
                settings.forEach((item) => {
                    statusMap[item.slug] = item.isActive
                    orderMap[item.slug] = item.displayOrder
                })

                const scoreboardEntries = {}
                await Promise.all(
                    miniGames.map(async (game) => {
                        const order = lowerScoreBetter.has(game.slug) ? 'asc' : 'desc'
                        try {
                            const rows = await fetchScoreboard(game.slug, order)
                            scoreboardEntries[game.slug] = rows
                        } catch (fetchError) {
                            console.error(`Erreur chargement scoreboard ${game.slug}:`, fetchError)
                            scoreboardEntries[game.slug] = []
                        }
                    })
                )

                if (!cancelled) {
                    setGameStatus(statusMap)
                    setGameOrder(orderMap)
                    setScoresByGame(scoreboardEntries)
                }
            } catch (err) {
                if (!cancelled) {
                    setError(err.message)
                }
            } finally {
                if (!cancelled) {
                    setLoadingData(false)
                }
            }
        }
        load()
        return () => {
            cancelled = true
        }
    }, [])

    const generalLeaderboard = useMemo(() => {
        const totals = {}
        orderedMiniGames.forEach((game) => {
            if (gameStatus[game.slug] === false) return
            const scoreboard = scoresByGame[game.slug] || []
            scoreboard.forEach((entry) => {
                if (!entry?.username) return
                const key = entry.username
                if (!totals[key]) {
                    totals[key] = { player: entry.username, totalScore: 0, slugs: new Set() }
                }
                const contribution = entry.score
                totals[key].totalScore += contribution
                totals[key].slugs.add(game.slug)
            })
        })
        return Object.values(totals)
            .map((item) => ({
                player: item.player,
                score: item.totalScore,
                unit: 'points total',
                icons: Array.from(item.slugs).map((slug) => {
                    const game = miniGames.find((g) => g.slug === slug)
                    return game ? game.icon : ''
                })
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, 15)
    }, [scoresByGame, orderedMiniGames, gameStatus])

    const visibleMiniGames = useMemo(() => {
        return orderedMiniGames.filter((game) => gameStatus[game.slug] !== false)
    }, [orderedMiniGames, gameStatus])

    const renderLeaderboardContent = () => {
        if (selectedLeaderboardGame === null) {
            if (generalLeaderboard.length === 0) {
                return <p className="no-scores">Aucun score enregistré</p>
            }
            return (
                <div className="leaderboard-list">
                    {generalLeaderboard.map((entry, index) => (
                        <div key={entry.player} className={`leaderboard-item ${index < 3 ? 'top-' + (index + 1) : ''}`}>
                            <div className="rank">
                                {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                            </div>
                            <div className="player-info">
                                <span className="player-name">{entry.player}</span>
                                {entry.icons.length > 0 && (
                                    <span className="game-name">{entry.icons.join(' ')}</span>
                                )}
                            </div>
                            <div className="score-info">
                                <span className="score">{entry.score}</span>
                                <span className="unit">{entry.unit}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )
        }

        const scoreboard = (scoresByGame[selectedLeaderboardGame] || []).slice(0, 15)
        const game = miniGames.find((g) => g.slug === selectedLeaderboardGame)
        if (!scoreboard.length) {
            return <p className="no-scores">Aucun score enregistré pour ce jeu</p>
        }
        return (
            <div className="leaderboard-list">
                {scoreboard.map((entry, index) => (
                    <div key={entry.user_id || index} className={`leaderboard-item ${index < 3 ? 'top-' + (index + 1) : ''}`}>
                        <div className="rank">
                            {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                        </div>
                        <div className="player-info">
                            <span className="player-name">{entry.username || 'Compte inconnu'}</span>
                        </div>
                        <div className="score-info">
                            <span className="score">{entry.score}</span>
                            <span className="unit">{game?.scoreUnit || 'points'}</span>
                        </div>
                    </div>
                ))}
            </div>
        )
    }

    return (
        <div className="mini-jeux-page">
            <div className="page-header">
                <h1>🎲 Mini-jeux</h1>
                <p>Détendez-vous avec nos mini-jeux !</p>
                <div className="header-buttons">
                    <button className="general-leaderboard-btn" onClick={() => { setSelectedLeaderboardGame(null); setShowLeaderboard(true) }}>
                        🏆 Classement Général
                    </button>
                    {user?.roles?.includes('admin') && (
                        <button className="admin-btn" onClick={() => navigate('/admin', { state: { activeTab: 'miniJeux' } })}>
                            ⚙️ Administration
                        </button>
                    )}
                </div>
            </div>

            {error && (
                <div className="mini-jeux-error" role="alert">{error}</div>
            )}

            {loadingData ? (
                <div className="mini-jeux-loading">Chargement des mini-jeux...</div>
            ) : (
                <div className="mini-games-grid">
                    {visibleMiniGames.map((game) => {
                        const topScore = (scoresByGame[game.slug] || [])[0]
                        const gameKey = game.scoreboardKey || game.component || game.slug || String(game.id)
                        return (
                            <div
                                key={game.id}
                                className="game-card"
                                style={{ '--game-color': game.color }}
                            >
                                <div className="game-icon">{game.icon}</div>
                                <h3>{game.name}</h3>
                                <p>{game.description}</p>

                                <div className="record-display">
                                    {topScore ? (
                                        <>
                                            <span className="record-label">🏆 Record:</span>
                                            <span className="record-value">
                                                {topScore.score} {game.scoreUnit}
                                            </span>
                                            <span className="record-holder">par {topScore.username || 'Compte inconnu'}</span>
                                        </>
                                    ) : (
                                        <span className="no-record">Aucun record</span>
                                    )}
                                </div>

                                <div className="card-buttons">
                                    <button className="play-btn" onClick={() => navigate(`/mini-jeux/${gameKey}`)}>
                                        🎮 Jouer
                                    </button>
                                    <button className="ranking-btn" onClick={() => { setSelectedLeaderboardGame(game.slug); setShowLeaderboard(true) }}>
                                        📊 Classement
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {showLeaderboard && (
                <div className="game-modal" onClick={() => setShowLeaderboard(false)}>
                    <div className="leaderboard-container" onClick={(e) => e.stopPropagation()}>
                        <button className="close-btn" onClick={() => setShowLeaderboard(false)}>✕</button>
                        <h2>📊 Classement Top 15</h2>

                        {selectedLeaderboardGame === null && (
                            <div className="game-filters">
                                <button
                                    className="filter-btn active"
                                    onClick={() => setSelectedLeaderboardGame(null)}
                                >
                                    🏆 Général (Cumul)
                                </button>
                                {visibleMiniGames.map((game) => (
                                    <button
                                        key={game.slug}
                                        className="filter-btn"
                                        onClick={() => setSelectedLeaderboardGame(game.slug)}
                                    >
                                        {game.icon} {game.name}
                                    </button>
                                ))}
                            </div>
                        )}

                        {selectedLeaderboardGame && (
                            <div className="selected-game-header">
                                {miniGames.find((g) => g.slug === selectedLeaderboardGame)?.icon}{' '}
                                {miniGames.find((g) => g.slug === selectedLeaderboardGame)?.name}
                            </div>
                        )}

                        <div className="leaderboard-content">
                            {renderLeaderboardContent()}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
