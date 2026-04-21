import { useState, useEffect, useContext } from 'react'
import { AuthContext } from '../../../context/AuthContext'
import { useWordle } from './useWordle.js'
import { STORAGE_HELP_KEY } from './wordleUtils.js'
import WordleBoard from './WordleBoard.jsx'
import WordleKeyboard from './WordleKeyboard.jsx'
import WordleHowToPlay from './WordleHowToPlay.jsx'
import WordleStats from './WordleStats.jsx'
import './WordleGame.css'

export default function WordleGame() {
    const { user, token } = useContext(AuthContext)
    const wordle = useWordle(user, token)

    const [showHelp, setShowHelp] = useState(() => !localStorage.getItem(STORAGE_HELP_KEY))
    const [showStats, setShowStats] = useState(false)

    // Marquer l'aide comme vue au 1er lancement
    useEffect(() => {
        if (showHelp) {
            localStorage.setItem(STORAGE_HELP_KEY, '1')
        }
    }, [showHelp])

    // Afficher les stats automatiquement en fin de partie
    useEffect(() => {
        if (wordle.status === 'won' || wordle.status === 'lost') {
            const delay = (wordle.wordLength || 5) * 150 + 600
            const id = setTimeout(() => setShowStats(true), delay)
            return () => clearTimeout(id)
        }
    }, [wordle.status, wordle.wordLength])

    if (wordle.loading) {
        return (
            <div className="wordle-container">
                <div className="wordle-loading">Chargement…</div>
            </div>
        )
    }

    if (wordle.error && !wordle.wordLength) {
        return (
            <div className="wordle-container">
                <div className="wordle-error">{wordle.error}</div>
            </div>
        )
    }

    const gameEnded = wordle.status === 'won' || wordle.status === 'lost'

    return (
        <div className="wordle-container">
            {/* Header */}
            <div className="wordle-header">
                <button
                    className="wordle-header__btn"
                    onClick={() => setShowHelp(true)}
                    aria-label="Comment jouer"
                >
                    ?
                </button>
                <h2 className="wordle-header__title">Wordle Nyxar</h2>
                <button
                    className="wordle-header__btn"
                    onClick={() => setShowStats(true)}
                    aria-label="Statistiques"
                >
                    📊
                </button>
            </div>

            {/* Toast erreur temporaire */}
            {wordle.error && (
                <div className="wordle-toast" role="alert">{wordle.error}</div>
            )}

            {/* Message fin de partie */}
            {gameEnded && wordle.revealedWord && (
                <div className={`wordle-result wordle-result--${wordle.status}`}>
                    {wordle.status === 'won'
                        ? `Bravo ! Trouvé en ${wordle.guesses.length} essai${wordle.guesses.length > 1 ? 's' : ''} 🎉`
                        : `Le mot était : ${wordle.revealedWord}`
                    }
                </div>
            )}

            {/* Grille */}
            <WordleBoard
                guesses={wordle.guesses}
                currentInput={wordle.currentInput}
                wordLength={wordle.wordLength}
                shakeLastRow={wordle.invalidWord}
                revealingRow={wordle.revealingRow}
            />

            {/* Clavier */}
            <WordleKeyboard
                onKeyPress={wordle.handleKeyPress}
                keyStatuses={wordle.keyStatuses}
                disabled={gameEnded}
            />

            {/* Modals */}
            {showHelp && <WordleHowToPlay onClose={() => setShowHelp(false)} />}
            {showStats && (
                <WordleStats
                    stats={wordle.stats}
                    guesses={wordle.guesses}
                    won={wordle.status === 'won'}
                    date={wordle.date}
                    nextResetTimestamp={wordle.nextResetTimestamp}
                    onClose={() => setShowStats(false)}
                    isGuest={!user}
                />
            )}
        </div>
    )
}
