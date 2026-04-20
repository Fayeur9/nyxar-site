import { useState, useEffect, useRef, useContext } from 'react'
import { AuthContext } from '../../context/AuthContext.jsx'
import API_URL from '../../services/api.js'
import './BasketballGame.css'

export default function BasketballGame({ onGameOver, onScoreSaved }) {
    const { user, token } = useContext(AuthContext)
    const [score, setScore] = useState(0)
    const [timeLeft, setTimeLeft] = useState(60)
    const [gameActive, setGameActive] = useState(true)
    const [isDragging, setIsDragging] = useState(false)
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
    const [ball, setBall] = useState({ x: 200, y: 400, vx: 0, vy: 0, isFlying: false })
    const [showTrajectory, setShowTrajectory] = useState(false)
    const [trajectoryEnd, setTrajectoryEnd] = useState({ x: 0, y: 0 })
    const [scoreSaved, setScoreSaved] = useState(false)
    const canvasRef = useRef(null)
    const animationFrameRef = useRef(null)
    const lastScoredRef = useRef(false)

    const GRAVITY = 0.5
    const BALL_RADIUS = 15
    const HOOP_X = 200
    const HOOP_Y = 80
    const HOOP_WIDTH = 80
    const HOOP_TOLERANCE = 10

    useEffect(() => {
        if (!user || !gameActive || timeLeft <= 0) return

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    setGameActive(false)
                    onGameOver(score)
                    return 0
                }
                return prev - 1
            })
        }, 1000)

        return () => clearInterval(timer)
    }, [user, gameActive, timeLeft, score, onGameOver])

    useEffect(() => {
        if (!gameActive && timeLeft === 0 && user && token && !scoreSaved) {
            fetch(`${API_URL}/api/scores`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ game: 'basketball', score })
            })
            .then(res => res.json())
            .then(() => {
                setScoreSaved(true)
                if (typeof onScoreSaved === 'function') {
                    onScoreSaved('basketball')
                }
            })
            .catch(() => {})
        }
    }, [gameActive, timeLeft, score, user, token, scoreSaved, onScoreSaved])

    useEffect(() => {
        if (!ball.isFlying) {
            lastScoredRef.current = false
            return
        }

        const updateBall = () => {
            setBall(prev => {
                let newX = prev.x + prev.vx
                let newY = prev.y + prev.vy
                let newVx = prev.vx * 0.99
                let newVy = prev.vy + GRAVITY

                // Collision avec les bords
                if (newX - BALL_RADIUS < 0 || newX + BALL_RADIUS > 400) {
                    newVx = -newVx * 0.7
                    newX = newX - BALL_RADIUS < 0 ? BALL_RADIUS : 400 - BALL_RADIUS
                }

                // Collision avec le sol
                if (newY + BALL_RADIUS > 500) {
                    newY = 500 - BALL_RADIUS
                    newVy = -newVy * 0.6
                    newVx *= 0.8

                    if (Math.abs(newVy) < 1 && Math.abs(newVx) < 0.5) {
                        return { x: 200, y: 400, vx: 0, vy: 0, isFlying: false }
                    }
                }

                // Collision avec le plafond
                if (newY - BALL_RADIUS < 0) {
                    newY = BALL_RADIUS
                    newVy = -newVy * 0.7
                }

                // Détection du panier
                if (
                    !lastScoredRef.current &&
                    newY > HOOP_Y - 10 && 
                    newY < HOOP_Y + 20 &&
                    newX > HOOP_X - HOOP_WIDTH/2 - HOOP_TOLERANCE && 
                    newX < HOOP_X + HOOP_WIDTH/2 + HOOP_TOLERANCE &&
                    prev.vy > 0
                ) {
                    setScore(s => s + 2)
                    lastScoredRef.current = true
                    // Animation panier marqué
                    const canvas = canvasRef.current
                    if (canvas) {
                        canvas.classList.add('score-animation')
                        setTimeout(() => canvas.classList.remove('score-animation'), 300)
                    }
                }

                return { x: newX, y: newY, vx: newVx, vy: newVy, isFlying: true }
            })

            animationFrameRef.current = requestAnimationFrame(updateBall)
        }

        animationFrameRef.current = requestAnimationFrame(updateBall)

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current)
            }
        }
    }, [ball.isFlying])

    const handleMouseDown = (e) => {
        if (ball.isFlying || !gameActive) return
        
        const rect = canvasRef.current.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top

        const distance = Math.sqrt((x - ball.x) ** 2 + (y - ball.y) ** 2)
        if (distance < BALL_RADIUS + 10) {
            setIsDragging(true)
            setDragStart({ x, y })
            setShowTrajectory(true)
        }
    }

    const handleMouseMove = (e) => {
        if (!isDragging) return

        const rect = canvasRef.current.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top

        setTrajectoryEnd({ x, y })
    }

    const handleMouseUp = (e) => {
        if (!isDragging || !gameActive) return

        const rect = canvasRef.current.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top

        const vx = (dragStart.x - x) * 0.2
        const vy = (dragStart.y - y) * 0.2

        const speed = Math.sqrt(vx * vx + vy * vy)
        if (speed > 0.5) {
            setBall(prev => ({ ...prev, vx, vy, isFlying: true }))
        }

        setIsDragging(false)
        setShowTrajectory(false)
    }

    const handleRestart = () => {
        setScore(0)
        setTimeLeft(60)
        setGameActive(true)
        setBall({ x: 200, y: 400, vx: 0, vy: 0, isFlying: false })
        lastScoredRef.current = false
        setScoreSaved(false)
    }

    if (!user) {
        return (
            <div className="basketball-game">
                <div className="game-header">
                    <h2>🏀 Basketball Challenge</h2>
                </div>
                <div className="game-instructions">
                    Vous devez être connecté pour jouer à ce mini-jeu.
                </div>
            </div>
        )
    }

    return (
        <div className="basketball-game">
            <div className="game-header">
                <h2>🏀 Basketball Challenge</h2>
            </div>

            <div className="game-stats">
                <div className="stat">
                    <span className="stat-label">Score</span>
                    <span className="stat-value">{score}</span>
                </div>
                <div className="stat">
                    <span className="stat-label">Temps</span>
                    <span className="stat-value timer">{timeLeft}s</span>
                </div>
            </div>

            <div className="game-instructions">
                {gameActive ? 
                    "Cliquez et glissez la balle pour tirer !" : 
                    "Temps écoulé ! Score final : " + score
                }
            </div>

            <div className="basketball-canvas-container">
                <canvas
                    ref={canvasRef}
                    width={400}
                    height={500}
                    className="basketball-canvas"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={() => {
                        if (isDragging) {
                            setIsDragging(false)
                            setShowTrajectory(false)
                        }
                    }}
                />
                
                {/* Panier */}
                <div className="basket-hoop" style={{ left: HOOP_X - HOOP_WIDTH/2, top: HOOP_Y }}>
                    <div className="hoop-rim"></div>
                    <div className="hoop-net"></div>
                    <div className="backboard"></div>
                </div>

                {/* Balle */}
                <div 
                    className="basketball-ball" 
                    style={{ 
                        left: ball.x - BALL_RADIUS, 
                        top: ball.y - BALL_RADIUS,
                        cursor: !ball.isFlying && gameActive ? 'grab' : 'default'
                    }}
                >
                    🏀
                </div>

                {/* Trajectoire */}
                {showTrajectory && isDragging && (
                    <svg className="trajectory-line" width="400" height="500">
                        <line 
                            x1={ball.x} 
                            y1={ball.y} 
                            x2={trajectoryEnd.x} 
                            y2={trajectoryEnd.y} 
                            stroke="#FFA500" 
                            strokeWidth="2" 
                            strokeDasharray="5,5"
                            opacity="0.6"
                        />
                        <line 
                            x1={ball.x} 
                            y1={ball.y} 
                            x2={dragStart.x} 
                            y2={dragStart.y} 
                            stroke="#FF4500" 
                            strokeWidth="3" 
                            opacity="0.8"
                        />
                    </svg>
                )}
            </div>

            {!gameActive && (
                <div className="game-over-actions">
                    <button className="restart-btn" onClick={handleRestart}>
                        🔄 Rejouer
                    </button>
                </div>
            )}
        </div>
    )
}
