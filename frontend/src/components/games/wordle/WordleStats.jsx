import { useState, useEffect } from 'react'
import { generateShareText, MAX_ATTEMPTS } from './wordleUtils.js'

function WordleCountdown({ nextResetTimestamp }) {
    const [remaining, setRemaining] = useState('')

    useEffect(() => {
        function tick() {
            const diff = nextResetTimestamp - Date.now()
            if (diff <= 0) { setRemaining('00:00:00'); return }
            const h = Math.floor(diff / 3600000)
            const m = Math.floor((diff % 3600000) / 60000)
            const s = Math.floor((diff % 60000) / 1000)
            setRemaining(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`)
        }
        tick()
        const id = setInterval(tick, 1000)
        return () => clearInterval(id)
    }, [nextResetTimestamp])

    return (
        <div className="wordle-countdown">
            <span className="wordle-countdown__label">Prochain mot dans</span>
            <span className="wordle-countdown__timer">{remaining}</span>
        </div>
    )
}

export default function WordleStats({ stats, guesses, won, date, nextResetTimestamp, onClose, isGuest }) {
    const [copied, setCopied] = useState(false)

    const winPct = stats?.played > 0
        ? Math.round((stats.won / stats.played) * 100)
        : 0

    const dist = stats?.guess_distribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }
    const maxBar = Math.max(...Object.values(dist), 1)
    const currentGuessCount = won ? guesses.length : null

    async function handleShare() {
        const text = generateShareText(guesses, won, date)
        try {
            await navigator.clipboard.writeText(text)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch {
            // Fallback pour navigateurs sans clipboard
            const ta = document.createElement('textarea')
            ta.value = text
            document.body.appendChild(ta)
            ta.select()
            document.execCommand('copy')
            document.body.removeChild(ta)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content modal-content--md wordle-stats-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Statistiques</h2>
                    <button className="modal-close" onClick={onClose} aria-label="Fermer">×</button>
                </div>
                <div className="modal-body">
                    {isGuest ? (
                        <p className="wordle-stats__guest-msg">
                            Connecte-toi pour sauvegarder tes statistiques.
                        </p>
                    ) : (
                        <>
                            <div className="wordle-stats__summary">
                                <div className="wordle-stats__stat">
                                    <span className="wordle-stats__value">{stats?.played ?? 0}</span>
                                    <span className="wordle-stats__label">Parties</span>
                                </div>
                                <div className="wordle-stats__stat">
                                    <span className="wordle-stats__value">{winPct}%</span>
                                    <span className="wordle-stats__label">Victoires</span>
                                </div>
                                <div className="wordle-stats__stat">
                                    <span className="wordle-stats__value">{stats?.current_streak ?? 0}</span>
                                    <span className="wordle-stats__label">Série</span>
                                </div>
                                <div className="wordle-stats__stat">
                                    <span className="wordle-stats__value">{stats?.best_streak ?? 0}</span>
                                    <span className="wordle-stats__label">Record</span>
                                </div>
                            </div>

                            <h3 className="wordle-stats__dist-title">Distribution</h3>
                            <div className="wordle-stats__distribution">
                                {Array.from({ length: MAX_ATTEMPTS }, (_, i) => {
                                    const count = dist[i + 1] || 0
                                    const width = Math.max((count / maxBar) * 100, count > 0 ? 8 : 4)
                                    const highlight = currentGuessCount === i + 1
                                    return (
                                        <div key={i} className="wordle-stats__dist-row">
                                            <span className="wordle-stats__dist-label">{i + 1}</span>
                                            <div
                                                className={`wordle-stats__dist-bar${highlight ? ' wordle-stats__dist-bar--highlight' : ''}`}
                                                style={{ width: `${width}%` }}
                                            >
                                                {count}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </>
                    )}

                    {guesses.length > 0 && (
                        <div className="wordle-stats__actions">
                            {nextResetTimestamp && <WordleCountdown nextResetTimestamp={nextResetTimestamp} />}
                            <button className="wordle-stats__share-btn" onClick={handleShare}>
                                {copied ? '✓ Copié !' : '📋 Copier mon résultat'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
