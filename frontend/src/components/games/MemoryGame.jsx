import { useState, useEffect, useContext, useCallback } from 'react'
import { AuthContext } from '../../context/AuthContext'
import { API_URL } from '../../services/api'
import './MemoryGame.css'

const trackmaniaImages = {
    car: '🏎️',
    checkpoint: '🏁',
    finish: '🎯',
    gold: '🥇',
    silver: '🥈',
    bronze: '🥉',
    author: '👑',
    champion: '🏆',
    cactus: '🌵'
};

const levels = {
    1: { name: 'Débutant', grid: 2, cards: ['car', 'checkpoint'] },
    2: { name: 'Expert', grid: 4, cards: ['car', 'checkpoint', 'finish', 'gold', 'silver', 'bronze', 'author', 'champion'] }
};

const BEST_POINTS_STORAGE_KEY = 'memoryGameBestPoints';
const LEGACY_MOVES_STORAGE_KEY = 'memoryGameBestScore';
const MIN_TOTAL_MOVES = Object.values(levels).reduce((sum, level) => sum + level.cards.length, 0);
const MAX_SCORE_VALUE = 1200;
const SCORE_MIN_FLOOR = 100;
const SCORE_PER_EXCESS_MOVE = 40;

const calculateScoreFromMoves = (moveCount) => {
    const effectiveMoves = Math.max(moveCount, MIN_TOTAL_MOVES);
    const penaltySteps = Math.max(0, effectiveMoves - MIN_TOTAL_MOVES);
    const rawScore = MAX_SCORE_VALUE - penaltySteps * SCORE_PER_EXCESS_MOVE;
    return Math.max(SCORE_MIN_FLOOR, rawScore);
};

export default function MemoryGame({ onGameOver, onScoreSaved }) {
    const { user, token } = useContext(AuthContext)

    const [scoreSaved, setScoreSaved] = useState(false)
    const [currentLevel, setCurrentLevel] = useState(1)
    const [cards, setCards] = useState([])
    const [flippedCards, setFlippedCards] = useState([])
    const [matchedCards, setMatchedCards] = useState([])
    const [moves, setMoves] = useState(0)
    const [totalMoves, setTotalMoves] = useState(0)
    const [gameStarted, setGameStarted] = useState(false)
    const [gameWon, setGameWon] = useState(false)
    const [bestPoints, setBestPoints] = useState(null)
    const [lastScore, setLastScore] = useState(null)
    const [lastMoves, setLastMoves] = useState(null)

    const currentTotalMoves = totalMoves + moves
    const projectedScore = calculateScoreFromMoves(currentTotalMoves || MIN_TOTAL_MOVES)

    useEffect(() => {
        if (gameWon && user && token && !scoreSaved && typeof lastScore === 'number') {
            fetch(`${API_URL}/api/scores`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ game: 'memory', score: lastScore })
            })
                .then(res => res.json())
                .then(() => {
                    setScoreSaved(true)
                    if (typeof onScoreSaved === 'function') {
                        onScoreSaved('memory')
                    }
                })
                .catch(() => {})
        }
    }, [gameWon, user, token, scoreSaved, lastScore, onScoreSaved])

    const initializeGame = useCallback((level) => {
        const levelConfig = levels[level]
        const cardsToUse = levelConfig.cards

        const shuffledCards = [...cardsToUse, ...cardsToUse]
            .sort(() => Math.random() - 0.5)
            .map((cardKey, index) => ({
                id: index,
                cardKey,
                image: trackmaniaImages[cardKey]
            }))

        setCards(shuffledCards)
        setFlippedCards([])
        setMatchedCards([])
        setMoves(0)
        if (level === 1) {
            setTotalMoves(0)
            setLastMoves(null)
            setLastScore(null)
            setScoreSaved(false)
        }
        setGameStarted(false)
        setGameWon(false)
    }, [])

    useEffect(() => {
        initializeGame(currentLevel)

        const storedPoints = localStorage.getItem(BEST_POINTS_STORAGE_KEY)
        if (storedPoints) {
            const parsedPoints = Number.parseInt(storedPoints, 10)
            if (!Number.isNaN(parsedPoints)) {
                setBestPoints(parsedPoints)
                return
            }
        }

        const legacyMoves = localStorage.getItem(LEGACY_MOVES_STORAGE_KEY)
        if (legacyMoves) {
            const parsedMoves = Number.parseInt(legacyMoves, 10)
            if (!Number.isNaN(parsedMoves) && parsedMoves > 0) {
                const convertedPoints = calculateScoreFromMoves(parsedMoves)
                setBestPoints(convertedPoints)
                localStorage.setItem(BEST_POINTS_STORAGE_KEY, convertedPoints.toString())
                localStorage.removeItem(LEGACY_MOVES_STORAGE_KEY)
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        initializeGame(currentLevel)
    }, [currentLevel, initializeGame])

    const handleCardClick = (cardId) => {
        if (!gameStarted) setGameStarted(true);
        
        if (flippedCards.includes(cardId) || matchedCards.includes(cardId) || flippedCards.length === 2) return;

        const newFlipped = [...flippedCards, cardId];
        setFlippedCards(newFlipped);

        if (newFlipped.length === 2) {
            setMoves(prev => prev + 1)

            const card1 = cards.find(c => c.id === newFlipped[0])
            const card2 = cards.find(c => c.id === newFlipped[1])

            if (card1.cardKey === card2.cardKey) {
                const newMatched = [...matchedCards, newFlipped[0], newFlipped[1]]
                setMatchedCards(newMatched)
                setFlippedCards([])

                if (newMatched.length === cards.length) {
                    const levelMoves = moves + 1
                    const newTotalMoves = totalMoves + levelMoves
                    setTotalMoves(newTotalMoves)

                    if (currentLevel < 2) {
                        setTimeout(() => {
                            setCurrentLevel(prev => prev + 1)
                        }, 1000)
                    } else {
                        const finalMoves = newTotalMoves
                        const finalPoints = calculateScoreFromMoves(finalMoves)

                        setTimeout(() => {
                            setLastMoves(finalMoves)
                            setLastScore(finalPoints)
                            setGameWon(true)
                            setScoreSaved(false)
                            setBestPoints(prev => {
                                if (!prev || finalPoints > prev) {
                                    localStorage.setItem(BEST_POINTS_STORAGE_KEY, finalPoints.toString())
                                    localStorage.removeItem(LEGACY_MOVES_STORAGE_KEY)
                                    return finalPoints
                                }
                                return prev
                            })
                            if (typeof onGameOver === 'function') {
                                onGameOver(finalPoints)
                            }
                        }, 1000)
                    }
                }
            } else {
                setTimeout(() => {
                    setFlippedCards([])
                }, 1000)
            }
        }
    };

    const isCardFlipped = (cardId) => {
        return flippedCards.includes(cardId) || matchedCards.includes(cardId);
    };

    const restartGame = () => {
        setCurrentLevel(1);
        setTotalMoves(0);
        setScoreSaved(false);
        initializeGame(1);
    };

    if (!user) {
        return (
            <div className="memory-game-container">
                <div className="game-header">
                    <h2>Memory Trackmania</h2>
                </div>
                <div className="game-area-wrapper">
                    <div className="game-area">
                        <div className="game-overlay">
                            <div className="game-over-content">
                                <h2>Connexion requise</h2>
                                <p>Vous devez être connecté pour jouer à ce mini-jeu.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="memory-game">
            <div className="game-header">
                <h2>🏁 Trackmania Memory</h2>
                <div className="level-indicator">
                    <span className="level-badge">Niveau {currentLevel}/2</span>
                    <span className="level-name">{levels[currentLevel].name}</span>
                </div>
                <div className="game-stats">
                    <div className="stat">
                        <span className="stat-label">Score actuel</span>
                        <span className="stat-value points">{projectedScore} pts</span>
                    </div>
                    <div className="stat">
                        <span className="stat-label">Coups joués</span>
                        <span className="stat-value">{currentTotalMoves}</span>
                    </div>
                    {bestPoints && (
                        <div className="stat">
                            <span className="stat-label">Meilleur Score</span>
                            <span className="stat-value best">{bestPoints} pts</span>
                        </div>
                    )}
                </div>
            </div>

            {!gameStarted && (
                <div className="game-instructions">
                    <p>Trouvez toutes les paires Trackmania en un minimum de coups pour maximiser votre score !</p>
                    <p className="hint">Cliquez sur une carte pour commencer</p>
                </div>
            )}

            <div className={`cards-grid grid-${levels[currentLevel].grid}x${levels[currentLevel].grid}`}>
                {cards.map((card) => (
                    <div
                        key={card.id}
                        className={`memory-card ${isCardFlipped(card.id) ? 'flipped' : ''} ${
                            matchedCards.includes(card.id) ? 'matched' : ''
                        }`}
                        onClick={() => handleCardClick(card.id)}
                    >
                        <div className="card-inner">
                            <div className="card-front"></div>
                            <div className="card-back">{card.image}</div>
                        </div>
                    </div>
                ))}
            </div>

            {gameWon && (
                <div className="game-over-overlay">
                    <div className="game-over-content">
                        <h2>🏆 Champion Trackmania ! 🏆</h2>
                        <p className="congrats">Vous avez terminé tous les niveaux !</p>
                        <div className="scores-summary">
                            <div className="final-stats">
                                <div className="stat-row">
                                    <span>Total de coups :</span>
                                    <strong>{lastMoves ?? totalMoves}</strong>
                                </div>
                                <div className="stat-row">
                                    <span>Points gagnés :</span>
                                    <strong>{lastScore ?? projectedScore} pts</strong>
                                </div>
                                {bestPoints && lastScore && lastScore === bestPoints && (
                                    <p className="new-record">🏆 Nouveau record !</p>
                                )}
                            </div>
                        </div>
                        <div className="game-over-buttons">
                            <button className="replay-btn" onClick={restartGame}>
                                🔄 Recommencer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
