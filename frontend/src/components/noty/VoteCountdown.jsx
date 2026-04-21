import { useState, useEffect } from 'react'

const computeTimeLeft = (endDate) => {
    if (!endDate) return null
    // end_date est une date (YYYY-MM-DD), les votes ferment à 23:59:59
    const end = new Date(endDate)
    end.setHours(23, 59, 59, 999)
    const now = new Date()
    const diff = end - now

    if (diff <= 0) return null

    return {
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60)
    }
}

/**
 * Affiche un countdown avant la clôture des votes.
 * @param {{ endDate: string }} props — date de fin au format ISO/SQL
 */
export default function VoteCountdown({ endDate }) {
    const [timeLeft, setTimeLeft] = useState(() => computeTimeLeft(endDate))

    useEffect(() => {
        if (!endDate) return

        const interval = setInterval(() => {
            const remaining = computeTimeLeft(endDate)
            setTimeLeft(remaining)
            if (!remaining) clearInterval(interval)
        }, 1000)

        return () => clearInterval(interval)
    }, [endDate])

    if (!timeLeft) return null

    const isUrgent = timeLeft.days === 0 && timeLeft.hours < 6

    return (
        <div className={`vote-countdown${isUrgent ? ' vote-countdown--urgent' : ''}`}>
            <span className="vote-countdown__label">Clôture des votes dans</span>
            <div className="vote-countdown__timer">
                {timeLeft.days > 0 && (
                    <div className="vote-countdown__unit">
                        <span className="vote-countdown__value">{timeLeft.days}</span>
                        <span className="vote-countdown__suffix">j</span>
                    </div>
                )}
                <div className="vote-countdown__unit">
                    <span className="vote-countdown__value">{String(timeLeft.hours).padStart(2, '0')}</span>
                    <span className="vote-countdown__suffix">h</span>
                </div>
                <div className="vote-countdown__unit">
                    <span className="vote-countdown__value">{String(timeLeft.minutes).padStart(2, '0')}</span>
                    <span className="vote-countdown__suffix">m</span>
                </div>
                <div className="vote-countdown__unit">
                    <span className="vote-countdown__value">{String(timeLeft.seconds).padStart(2, '0')}</span>
                    <span className="vote-countdown__suffix">s</span>
                </div>
            </div>
        </div>
    )
}
