import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import MemoryGame from '../components/games/MemoryGame'
import WordleGame from '../components/games/wordle/WordleGame'
import { miniGames, getDefaultGameStatus } from '../config/miniGamesConfig'
import { fetchMiniGamesSettings } from '../services/miniGames'
import '../styles/pages/PageMiniJeuPlay.css'

const componentsMap = {
  memory: MemoryGame,
  wordle: WordleGame
}

const GAME_LOGO_SRC = '/nyxar-games-loader.png'
const LOADER_DURATION = 2000

function getGameByKey(key) {
  return miniGames.find(game => {
    const identifier = game.scoreboardKey || game.component || String(game.id)
    return identifier === key
  })
}

export default function PageMiniJeuPlay() {
  const { gameKey } = useParams()
  const navigate = useNavigate()
  const [showLoader, setShowLoader] = useState(true)
  const [gameStatus, setGameStatus] = useState(getDefaultGameStatus())
  const [loadingStatus, setLoadingStatus] = useState(true)
  const [statusError, setStatusError] = useState(null)

  const selectedGame = useMemo(() => getGameByKey(gameKey), [gameKey])

  useEffect(() => {
    let cancelled = false
    const loadStatus = async () => {
      setStatusError(null)
      try {
        const settings = await fetchMiniGamesSettings()
        if (cancelled) return
        const statusMap = getDefaultGameStatus()
        settings.forEach((item) => {
          statusMap[item.slug] = item.isActive
        })
        setGameStatus(statusMap)
      } catch (err) {
        if (!cancelled) {
          setStatusError(err.message)
        }
      } finally {
        if (!cancelled) {
          setLoadingStatus(false)
        }
      }
    }
    loadStatus()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  useEffect(() => {
    setShowLoader(true)
    const timer = setTimeout(() => setShowLoader(false), LOADER_DURATION)
    return () => clearTimeout(timer)
  }, [gameKey])

  const goBack = () => navigate('/mini-jeux')

  if (!selectedGame || !componentsMap[selectedGame.component]) {
    return (
      <div className="mini-game-play-page">
        <div className="play-page-header">
          <button className="back-btn" onClick={goBack}>← Retour aux mini-jeux</button>
        </div>
        <div className="missing-game">
          <p>Ce mini-jeu est introuvable ou n'est pas encore disponible.</p>
          <button className="cta" onClick={goBack}>Retourner à la sélection</button>
        </div>
      </div>
    )
  }

  const isDisabled = !loadingStatus && gameStatus[selectedGame.slug] === false
  const GameComponent = componentsMap[selectedGame.component]

  if (isDisabled) {
    return (
      <div className="mini-game-play-page">
        <div className="play-page-header">
          <button className="back-btn" onClick={goBack}>← Retour aux mini-jeux</button>
          <h1 className="play-page-title">{selectedGame.icon} {selectedGame.name}</h1>
        </div>
        <div className="missing-game">
          <p>Ce jeu est temporairement désactivé.</p>
          <button className="cta" onClick={goBack}>Choisir un autre jeu</button>
        </div>
      </div>
    )
  }

  return (
    <div className="mini-game-play-page">
      <div className="play-page-header">
        <button className="back-btn" onClick={goBack}>← Retour aux mini-jeux</button>
        <h1 className="play-page-title">{selectedGame.icon} {selectedGame.name}</h1>
      </div>

      {statusError && (
        <div className="mini-game-status-error" role="alert">
          Impossible de vérifier le statut du mini-jeu ({statusError}).
        </div>
      )}

      {showLoader ? (
        <div className="mini-game-loader" role="status" aria-live="polite">
          <img src={GAME_LOGO_SRC} alt="Logo NYXAR Games" className="loader-logo" />
          <div className="loader-progress" aria-hidden="true">
            <div className="loader-progress-bar" />
          </div>
        </div>
      ) : (
        <div className="mini-game-fullscreen">
          <GameComponent />
        </div>
      )}
    </div>
  )
}
