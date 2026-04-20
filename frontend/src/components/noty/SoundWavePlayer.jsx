import { useState, useRef, useEffect, useCallback } from 'react'

const FALLBACK_BAR_COUNT = 24

/**
 * Lecteur audio style waveform (Instagram-like).
 * Utilise la waveform réelle si disponible, sinon génère
 * des barres pseudo-aléatoires à partir du nom.
 */
export default function SoundWavePlayer({ src, name = '', waveform = null }) {
    const audioRef = useRef(null)
    const [playing, setPlaying] = useState(false)
    const [progress, setProgress] = useState(0)
    const [duration, setDuration] = useState(0)
    const [currentTime, setCurrentTime] = useState(0)
    const rafRef = useRef(null)

    const bars = useRef(
        waveform && Array.isArray(waveform) && waveform.length > 0
            ? waveform.map(v => Math.max(0.15, v))
            : Array.from({ length: FALLBACK_BAR_COUNT }, (_, i) => {
                const seed = (name.charCodeAt(i % name.length) || 42) * (i + 1)
                return 0.25 + (((seed * 9301 + 49297) % 233280) / 233280) * 0.75
            })
    ).current

    const updateProgress = useCallback(() => {
        const audio = audioRef.current
        if (!audio) return
        if (audio.duration) {
            setProgress(audio.currentTime / audio.duration)
            setCurrentTime(audio.currentTime)
            setDuration(audio.duration)
        }
        if (!audio.paused) {
            rafRef.current = requestAnimationFrame(updateProgress)
        }
    }, [])

    useEffect(() => {
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current)
        }
    }, [])

    const togglePlay = (e) => {
        e.stopPropagation()
        e.preventDefault()
        const audio = audioRef.current
        if (!audio) return
        if (audio.paused) {
            audio.play()
            setPlaying(true)
            rafRef.current = requestAnimationFrame(updateProgress)
        } else {
            audio.pause()
            setPlaying(false)
            if (rafRef.current) cancelAnimationFrame(rafRef.current)
        }
    }

    const handleBarClick = (e) => {
        e.stopPropagation()
        e.preventDefault()
        const audio = audioRef.current
        if (!audio || !audio.duration) return
        const rect = e.currentTarget.getBoundingClientRect()
        const x = e.clientX - rect.left
        const ratio = x / rect.width
        audio.currentTime = ratio * audio.duration
        setProgress(ratio)
        setCurrentTime(audio.currentTime)
    }

    const handleEnded = () => {
        setPlaying(false)
        setProgress(0)
        setCurrentTime(0)
        if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }

    const handleLoadedMetadata = () => {
        if (audioRef.current) setDuration(audioRef.current.duration)
    }

    const formatTime = (t) => {
        if (!t || isNaN(t)) return '0:00'
        const m = Math.floor(t / 60)
        const s = Math.floor(t % 60)
        return `${m}:${s.toString().padStart(2, '0')}`
    }

    return (
        <div className="swp" onClick={(e) => e.stopPropagation()}>
            <audio
                ref={audioRef}
                src={src}
                preload="metadata"
                onEnded={handleEnded}
                onLoadedMetadata={handleLoadedMetadata}
            />
            <button
                type="button"
                className={`swp__play${playing ? ' swp__play--active' : ''}`}
                onClick={togglePlay}
                aria-label={playing ? 'Mettre en pause' : 'Lire le son'}
            >
                {playing ? (
                    <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                        <rect x="6" y="4" width="4" height="16" rx="1" />
                        <rect x="14" y="4" width="4" height="16" rx="1" />
                    </svg>
                ) : (
                    <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                        <path d="M8 5v14l11-7z" />
                    </svg>
                )}
            </button>
            <div className="swp__wave" onClick={handleBarClick} tabIndex={0} role="slider" aria-label="Position de lecture" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)} onKeyDown={(e) => {
                const audio = audioRef.current
                if (!audio || !audio.duration) return
                if (e.key === 'ArrowRight') { audio.currentTime = Math.min(audio.duration, audio.currentTime + 5); setProgress(audio.currentTime / audio.duration) }
                if (e.key === 'ArrowLeft') { audio.currentTime = Math.max(0, audio.currentTime - 5); setProgress(audio.currentTime / audio.duration) }
            }}>
                {bars.map((h, i) => {
                    const filled = i / bars.length < progress
                    return (
                        <div
                            key={i}
                            className={`swp__bar${filled ? ' swp__bar--filled' : ''}`}
                            style={{ height: `${h * 100}%` }}
                        />
                    )
                })}
            </div>
            <span className="swp__time">
                {formatTime(currentTime)} / {formatTime(duration)}
            </span>
        </div>
    )
}
