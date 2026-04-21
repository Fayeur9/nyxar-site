import { useContext, useEffect, useMemo, useState } from 'react'
import { AuthContext } from '../../context/AuthContext'
import { fetchCurrentGuessMap, submitGuessMapAnswer } from '../../services/guessMap'
import './GuessMapGame.css'

const TMX_REFERENCE_URL = 'https://trackmania.exchange/'
const DIFFICULTY_LABELS = {
  offert: 'Offert',
  facile: 'Facile',
  moyen: 'Moyen',
  difficile: 'Difficile',
  introuvable: 'Introuvable'
}
const MAX_ATTEMPTS = 3
const ATTEMPT_LABELS = ['1er essai', '2e essai', '3e essai']

export default function GuessMapGame({ onScoreSaved }) {
  const { user, token } = useContext(AuthContext)
  const [challenge, setChallenge] = useState(null)
  const [loading, setLoading] = useState(true)
  const [guess, setGuess] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [attemptsUsed, setAttemptsUsed] = useState(0)
  const [hasWon, setHasWon] = useState(false)

  useEffect(() => {
    loadChallenge()
  }, [])

  const loadChallenge = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchCurrentGuessMap()
      setChallenge(data)
      setAttemptsUsed(0)
      setHasWon(false)
      setFeedback(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!user || !token) {
      setFeedback({ type: 'error', message: 'Connecte-toi pour tenter ta chance.' })
      return
    }
    if (!/^\d{6}$/.test(guess)) {
      setFeedback({ type: 'error', message: 'Entre un numéro TMX composé de 6 chiffres.' })
      return
    }
    if (!challenge) return

    setSubmitting(true)
    setFeedback(null)
    try {
      const result = await submitGuessMapAnswer(challenge.id, guess.trim(), token)
      setHasWon(true)
      setAttemptsUsed(result.attemptNumber)
      const attemptLabel = ATTEMPT_LABELS[result.attemptNumber - 1] || `${result.attemptNumber} essais`
      setFeedback({ type: 'success', message: `Bravo ! ${attemptLabel} (+${result.pointsEarned} pts).` })
      setGuess('')
      if (typeof onScoreSaved === 'function') {
        onScoreSaved('guess_map')
      }
    } catch (err) {
      if (err.details?.attemptsUsed) {
        setAttemptsUsed(err.details.attemptsUsed)
      }
      if (err.status === 429) {
        setHasWon(false)
        setAttemptsUsed(MAX_ATTEMPTS)
      }
      setFeedback({ type: 'error', message: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  const rewards = useMemo(() => {
    if (!challenge?.rewards?.length) {
      return [600, 400, 200]
    }
    return challenge.rewards
  }, [challenge])

  const remainingAttempts = Math.max(0, MAX_ATTEMPTS - attemptsUsed)
  const attemptsExhausted = remainingAttempts === 0 && !hasWon
  const inputDisabled = submitting || hasWon || attemptsExhausted

  if (loading) {
    return (
      <div className="guess-map-game">
        <div className="guess-map-card skeleton" />
      </div>
    )
  }

  if (error || !challenge) {
    return (
      <div className="guess-map-game">
        <div className="guess-map-empty">
          <p>{error || 'Aucun défi n\'est disponible pour le moment.'}</p>
          <button className="guess-map-refresh" onClick={loadChallenge}>🔄 Actualiser</button>
        </div>
      </div>
    )
  }

  return (
    <div className="guess-map-game">
      <div className="guess-map-card">
        <div className="guess-map-header">
          <div>
            <h2>🗺️ Guess the Map</h2>
            <p>Trouve la map Trackmania en entrant son identifiant TMX.</p>
            <a
              className="guess-map-tmx-link"
              href={TMX_REFERENCE_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              Ouvrir Trackmania Exchange
            </a>
          </div>
          <div className="guess-map-meta">
            <span className="guess-map-reward">
              {rewards.map((reward, index) => (
                <span key={index}>
                  {ATTEMPT_LABELS[index] || `${index + 1}e essai`}: +{reward} pts
                  {index < rewards.length - 1 ? <br /> : null}
                </span>
              ))}
            </span>
            {challenge.difficulty && (
              <span className={`guess-map-difficulty guess-map-difficulty-${challenge.difficulty}`}>
                {DIFFICULTY_LABELS[challenge.difficulty] || challenge.difficulty}
              </span>
            )}
          </div>
        </div>

        <div className="guess-map-image">
          <img src={challenge.image_url} alt="Capture de la map mystère" />
        </div>

        <form className="guess-map-form" onSubmit={handleSubmit}>
          <label>Numéro TMX</label>
          <input
            type="text"
            placeholder="Ex: 123456"
            value={guess}
            onChange={(e) => {
              const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 6)
              setGuess(digitsOnly)
            }}
            disabled={inputDisabled}
            maxLength={6}
            inputMode="numeric"
            pattern="\d*"
          />
          <button type="submit" disabled={inputDisabled || guess.length !== 6}>
            {hasWon
              ? 'Bravo !'
              : submitting
                ? 'Vérification...'
                : attemptsExhausted
                  ? 'Plus d’essais'
                  : 'Valider'}
          </button>
        </form>

        {user && (
          <div className="guess-map-attempts">
            <p>
              Essais utilisés: {attemptsUsed} / {MAX_ATTEMPTS}
              {remainingAttempts > 0 && !hasWon && ` • ${remainingAttempts} restant${remainingAttempts > 1 ? 's' : ''}`}
            </p>
          </div>
        )}

        {feedback && (
          <div className={`guess-map-feedback ${feedback.type}`}>
            {feedback.message}
          </div>
        )}

        {challenge.previous_answer && (
          <div className="guess-map-previous">
            <p>
              Réponse d’hier :{' '}
              {challenge.previous_answer.tmx_url ? (
                <a href={challenge.previous_answer.tmx_url} target="_blank" rel="noopener noreferrer">
                  {challenge.previous_answer.tmx_id}
                </a>
              ) : (
                <span>{challenge.previous_answer.tmx_id}</span>
              )}
            </p>
          </div>
        )}

        {!user && (
          <p className="guess-map-hint">Connecte-toi pour soumettre ta réponse et gagner des points.</p>
        )}
      </div>
    </div>
  )
}
