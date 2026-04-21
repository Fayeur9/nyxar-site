import { useState, useEffect, useRef, useCallback, useContext } from 'react'
import { AuthContext } from '../../context/AuthContext'
import API_URL from '../../services/api.js'
import { fetchMyScore } from '../../services/scores'
import './SnakeGame.css'

const GRID_SIZE = 15
const CELL_SIZE = 30
const INITIAL_SPEED = 100
const MIN_SPEED = 60
const SPEED_INCREMENT = 2
const SCORE_PER_CHECKPOINT = 50

export default function SnakeGame({ onGameOver, onScoreSaved }) {
    const { user, token } = useContext(AuthContext)
    const [snake, setSnake] = useState([{ x: 7, y: 7 }])
    const [checkpoint, setCheckpoint] = useState({ x: 10, y: 10 })
    const [direction, setDirection] = useState({ x: 1, y: 0 })
    const [gameOver, setGameOver] = useState(false)
    const [score, setScore] = useState(0)
    const [speed, setSpeed] = useState(INITIAL_SPEED)
    const [isPaused, setIsPaused] = useState(false)
    const [scoreSaved, setScoreSaved] = useState(false)
    const [bestScore, setBestScore] = useState(0)
    const ARROW_KEYS = useRef(new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']))

    useEffect(() => {
        const loadBestScore = async () => {
            if (!user || !token) {
                setBestScore(0)
                return
            }
            try {
                const data = await fetchMyScore('snake', token)
                setBestScore(Number(data.score) || 0)
            } catch (err) {
                console.warn('Impossible de charger le meilleur score Snake:', err)
            }
        }
        loadBestScore()
    }, [user, token])

    // Sauvegarder le score au backend si gameOver et utilisateur connecté
    useEffect(() => {
        if (gameOver && user && token && !scoreSaved) {
            fetch(`${API_URL}/api/scores`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ game: 'snake', score })
            })
            .then(res => res.json())
            .then(() => {
                setScoreSaved(true)
                setBestScore(prev => Math.max(prev, score))
                if (typeof onScoreSaved === 'function') {
                    onScoreSaved('snake')
                }
            })
            .catch(() => {})
        }
        if (gameOver && typeof onGameOver === 'function') {
            onGameOver(score)
        }
    }, [gameOver, score, onGameOver, onScoreSaved, user, token, scoreSaved])

    const gameLoopRef = useRef(null)
    const directionQueueRef = useRef([])
    const animationFrameRef = useRef(null)
    const [nowMs, setNowMs] = useState(() => Date.now())
    const [lastMoveTime, setLastMoveTime] = useState(0)
    const [previousSnake, setPreviousSnake] = useState([{ x: 7, y: 7 }])

    const generateCheckpoint = useCallback(() => {
        let newCheckpoint
        do {
            newCheckpoint = {
                x: Math.floor(Math.random() * GRID_SIZE),
                y: Math.floor(Math.random() * GRID_SIZE)
            }
        } while (snake.some(segment => segment.x === newCheckpoint.x && segment.y === newCheckpoint.y))
        return newCheckpoint
    }, [snake])

    const moveSnake = useCallback(() => {
        if (gameOver || isPaused) return

        const nextDirection = directionQueueRef.current.shift() || direction
        setDirection(nextDirection)

        setSnake(prevSnake => {
            const head = prevSnake[0]
            const newHead = {
                x: (head.x + nextDirection.x + GRID_SIZE) % GRID_SIZE,
                y: (head.y + nextDirection.y + GRID_SIZE) % GRID_SIZE
            }

            if (prevSnake.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
                setGameOver(true)
                if (onGameOver) onGameOver(score)
                return prevSnake
            }

            const newSnake = [newHead, ...prevSnake]

            if (newHead.x === checkpoint.x && newHead.y === checkpoint.y) {
                setScore(prev => prev + SCORE_PER_CHECKPOINT)
                setCheckpoint(generateCheckpoint())
                setSpeed(prev => Math.max(MIN_SPEED, prev - SPEED_INCREMENT))
                return newSnake
            }

            newSnake.pop()
            return newSnake
        })
    }, [direction, checkpoint, gameOver, isPaused, generateCheckpoint, onGameOver, score])

    useEffect(() => {
        const animate = () => {
            if (!gameOver && !isPaused) {
                setNowMs(Date.now())
            }
            animationFrameRef.current = requestAnimationFrame(animate)
        }

        animationFrameRef.current = requestAnimationFrame(animate)
        return () => cancelAnimationFrame(animationFrameRef.current)
    }, [gameOver, isPaused])

    useEffect(() => {
        const handleKeyPress = (e) => {
            if (ARROW_KEYS.current.has(e.key)) {
                e.preventDefault()
            }

            if (gameOver) return

            if (e.key === ' ') {
                e.preventDefault()
                setIsPaused(prev => !prev)
                return
            }

            const queue = directionQueueRef.current
            const lastDirection = queue.length > 0 ? queue[queue.length - 1] : direction
            let newDirection = null

            switch (e.key) {
                case 'ArrowUp':
                case 'z':
                case 'w':
                    if (lastDirection.y === 0) newDirection = { x: 0, y: -1 }
                    break
                case 'ArrowDown':
                case 's':
                    if (lastDirection.y === 0) newDirection = { x: 0, y: 1 }
                    break
                case 'ArrowLeft':
                case 'q':
                case 'a':
                    if (lastDirection.x === 0) newDirection = { x: -1, y: 0 }
                    break
                case 'ArrowRight':
                case 'd':
                    if (lastDirection.x === 0) newDirection = { x: 1, y: 0 }
                    break
                default:
                    return
            }

            if (newDirection && queue.length < 3) {
                e.preventDefault()
                queue.push(newDirection)
            }
        }

        const listenerOptions = { passive: false }
        window.addEventListener('keydown', handleKeyPress, listenerOptions)
        return () => window.removeEventListener('keydown', handleKeyPress, listenerOptions)
    }, [direction, gameOver])

    useEffect(() => {
        if (gameOver || isPaused) {
            if (gameLoopRef.current) clearInterval(gameLoopRef.current)
            return
        }

        gameLoopRef.current = setInterval(() => {
            setPreviousSnake([...snake])
            setLastMoveTime(Date.now())
            moveSnake()
        }, speed)
        
        return () => clearInterval(gameLoopRef.current)
    }, [moveSnake, speed, gameOver, isPaused, snake])

    const restartGame = () => {
        setSnake([{ x: 7, y: 7 }])
        setDirection({ x: 1, y: 0 })
        directionQueueRef.current = []
        setPreviousSnake([{ x: 7, y: 7 }])
        setCheckpoint(generateCheckpoint())
        setGameOver(false)
        setScore(0)
        setSpeed(INITIAL_SPEED)
        setIsPaused(false)
        setScoreSaved(false)
    }

    if (!user) {
        return (
            <div className="snake-game-container">
                <div className="game-header">
                    <h2>Snake Trackmania</h2>
                </div>
                <div className="game-area-wrapper">
                    <div className="game-area" style={{ width: GRID_SIZE * CELL_SIZE, height: GRID_SIZE * CELL_SIZE }}>
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
        <div className="snake-game">
            <div className="game-header">
                <div className="game-info">
                    <span className="score">🏁 Score: {score}</span>
                    <span className="length">🏎️ Longueur: {snake.length}</span>
                    <span className="best">⭐ Meilleur: {bestScore}</span>
                </div>
            </div>

            <div className="game-canvas-wrapper">
                <div 
                    className="game-canvas" 
                    style={{
                        width: GRID_SIZE * CELL_SIZE,
                        height: GRID_SIZE * CELL_SIZE
                    }}
                >
                    <div className="grid-background">
                        {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => (
                            <div key={i} className="grid-cell" />
                        ))}
                    </div>

                    {snake.map((segment, index) => {
                        const prev = previousSnake[index] || segment
                        const timeSinceMove = nowMs - lastMoveTime
                        const progress = Math.min(timeSinceMove / speed, 1)
                        
                        const dx = segment.x - prev.x
                        const dy = segment.y - prev.y
                        const isWrapping = Math.abs(dx) > 1 || Math.abs(dy) > 1
                        
                        const displayX = isWrapping ? segment.x : Math.max(0, Math.min(GRID_SIZE - 1, prev.x + dx * progress))
                        const displayY = isWrapping ? segment.y : Math.max(0, Math.min(GRID_SIZE - 1, prev.y + dy * progress))
                        
                        return (
                            <div
                                key={index}
                                className={`snake-segment ${index === 0 ? 'head' : ''}`}
                                style={{
                                    left: displayX * CELL_SIZE,
                                    top: displayY * CELL_SIZE,
                                    width: CELL_SIZE,
                                    height: CELL_SIZE
                                }}
                            >
                                🏎️
                            </div>
                        )
                    })}

                    <div className="checkpoint" style={{
                        left: checkpoint.x * CELL_SIZE,
                        top: checkpoint.y * CELL_SIZE,
                        width: CELL_SIZE,
                        height: CELL_SIZE
                    }}>
                        🚩
                    </div>

                    {gameOver && (
                        <div className="game-overlay">
                            <div className="game-over-content">
                                <h2>🏁 Course terminée !</h2>
                                <p className="final-score">Score final: {score}</p>
                                <p className="checkpoints">Checkpoints: {Math.floor(score / SCORE_PER_CHECKPOINT)}</p>
                                <p className="best-score">Meilleur score: {Math.max(bestScore, score)}</p>
                                <button className="restart-btn" onClick={restartGame}>🔄 Recommencer</button>
                            </div>
                        </div>
                    )}

                    {isPaused && !gameOver && (
                        <div className="game-overlay pause-overlay">
                            <div className="pause-content">
                                <h2>⏸️ Pause</h2>
                                <p>Appuyez sur ESPACE pour continuer</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="game-controls">
                <p>🎮 Contrôles: ⬆️⬇️⬅️➡️ ou ZQSD</p>
                <p>⏸️ Pause: ESPACE</p>
                <button className="pause-btn" onClick={() => setIsPaused(!isPaused)}>
                    {isPaused ? '▶️ Reprendre' : '⏸️ Pause'}
                </button>
            </div>
        </div>
    )
}
