import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import './GameLoader.css'

export default function GameLoader({ onComplete, gameName = "Jeu" }) {
    const svgPathRef = useRef(null)
    const countRef = useRef({ number: 0 })
    const [isComplete, setIsComplete] = useState(false)

    useEffect(() => {
        const svgPath = svgPathRef.current
        if (!svgPath) return

        // Animation avec GSAP selon le code de la vidéo
        const tl = gsap.timeline({
            onComplete: () => {
                setIsComplete(true)
                setTimeout(() => {
                    if (onComplete) onComplete()
                }, 300)
            }
        })

        // Animer le cercle progressivement
        tl.to(svgPath, {
            strokeDashoffset: 0,
            duration: 2,
            ease: 'power2.inOut'
        })

        // Animer le compteur avec une rotation
        tl.to(countRef.current, {
            number: 100,
            duration: 2,
            ease: 'power2.inOut',
            onUpdate: () => {
                const counterElem = document.querySelector('.loader-percentage span')
                if (counterElem) {
                    counterElem.textContent = Math.round(countRef.current.number) + '%'
                }
            }
        }, 0)

        // Animation de rotation du cercle
        gsap.to(svgPath, {
            rotation: 360,
            duration: 2,
            ease: 'linear',
            repeat: -1,
            transformOrigin: '50% 50%'
        })

        return () => {
            tl.kill()
            gsap.killTweensOf(svgPath)
        }
    }, [onComplete])

    return (
        <div className={`game-loader ${isComplete ? 'complete' : ''}`}>
            <div className="loader-content">
                <h2 className="loader-title">Chargement de {gameName}</h2>
                
                <div className="loader-circle-container">
                    <svg className="loader-svg" viewBox="0 0 200 200">
                        {/* Cercle de progression */}
                        <circle
                            ref={svgPathRef}
                            cx="100"
                            cy="100"
                            r="76"
                            fill="none"
                            stroke="var(--accent-color, #00f0ff)"
                            strokeWidth="8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeDasharray="477.52"
                            strokeDashoffset="477.52"
                            transform="rotate(-90 100 100)"
                        />
                    </svg>
                    
                    {/* Texte de pourcentage au centre */}
                    <div className="loader-percentage">
                        <span>0%</span>
                    </div>
                </div>
                
                <p className="loader-subtitle">Préparation du terrain...</p>
            </div>
        </div>
    )
}
