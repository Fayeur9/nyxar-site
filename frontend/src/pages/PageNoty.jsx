import { useContext, useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'
import { NotyCampaignContext } from '../context/NotyCampaignContext'
import { API_URL } from '../services/api'
import { formatDateFr } from '../utils/format'
import NotyProgressBar from '../components/noty/NotyProgressBar'
import '../styles/pages/NotyPage.css'

export default function PageNoty() {
    const { user, token } = useContext(AuthContext)
    const { currentActiveCampaign, hasActiveCampaign, resultsPhase } = useContext(NotyCampaignContext)
    const [hasPastCampaigns, setHasPastCampaigns] = useState(false)
    const [progress, setProgress] = useState(null)
    const [liveStats, setLiveStats] = useState(null)
    const liveStatsInterval = useRef(null)

    useEffect(() => {
        fetch(`${API_URL}/api/noty/has-past-campaigns`)
            .then(r => r.ok ? r.json() : null)
            .then(data => { if (data) setHasPastCampaigns(data.hasPastCampaigns) })
            .catch(() => {})
    }, [])

    useEffect(() => {
        if (user && token && currentActiveCampaign?.id) {
            fetch(`${API_URL}/api/noty/campaigns/${currentActiveCampaign.id}/my-progress`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
                .then(r => r.ok ? r.json() : null)
                .then(data => { if (data) setProgress(data) })
                .catch(() => {})
        }
    }, [user, token, currentActiveCampaign])

    useEffect(() => {
        if (!currentActiveCampaign?.id || resultsPhase) return

        const fetchLiveStats = () => {
            fetch(`${API_URL}/api/noty/campaigns/${currentActiveCampaign.id}/live-stats`)
                .then(r => r.ok ? r.json() : null)
                .then(data => { if (data) setLiveStats(data) })
                .catch(() => {})
        }

        fetchLiveStats()
        liveStatsInterval.current = setInterval(fetchLiveStats, 60000)

        return () => {
            if (liveStatsInterval.current) {
                clearInterval(liveStatsInterval.current)
                liveStatsInterval.current = null
            }
        }
    }, [currentActiveCampaign, resultsPhase])

    if (!hasActiveCampaign || !currentActiveCampaign) {
        return (
            <div className="noty-landing">
                <div className="noty-hero noty-hero--empty">
                    <div className="noty-hero__overlay" />
                    <div className="noty-hero__content">
                        <h1 className="noty-hero__title">Nyxar Of The Year</h1>
                        <p className="noty-hero__message">Aucune campagne en cours pour le moment.</p>
                        {hasPastCampaigns && (
                            <Link to="/noty/hall-of-fame" className="noty-landing__hof-btn">
                                Historique
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        )
    }

    const isComplete = progress && progress.voted === progress.total && progress.total > 0
    const heroStyle = currentActiveCampaign.image_url
        ? { backgroundImage: `url(${API_URL}${currentActiveCampaign.image_url})` }
        : {}

    if (resultsPhase) {
        return (
            <div className="noty-landing">
                <div
                    className={`noty-hero${currentActiveCampaign.image_url ? '' : ' noty-hero--empty'}`}
                    style={heroStyle}
                >
                    <div className="noty-hero__overlay" />
                    <div className="noty-hero__content">
                        <h1 className="noty-hero__title">{currentActiveCampaign.title}</h1>

                        <div className="noty-hero__center">
                            <p className="noty-hero__message">Les votes sont terminés !</p>
                            <Link to="/noty/categories" className="noty-landing__cta">
                                Voir les résultats
                            </Link>
                        </div>

                        {user && progress && (
                            <NotyProgressBar
                                voted={progress.voted}
                                total={progress.total}
                                label={`Tu as voté dans ${progress.voted} / ${progress.total} catégories`}
                                className="noty-hero__progress"
                            />
                        )}
                        {hasPastCampaigns && (
                            <Link to="/noty/hall-of-fame" className="noty-landing__hof-btn">Historique</Link>
                        )}
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="noty-landing">
            <div
                className={`noty-hero${currentActiveCampaign.image_url ? '' : ' noty-hero--empty'}`}
                style={heroStyle}
            >
                <div className="noty-hero__overlay" />
                <div className="noty-hero__content">
                    <h1 className="noty-hero__title">{currentActiveCampaign.title}</h1>

                    <div className="noty-hero__center">
                        {liveStats && (
                            <div className="noty-hero__stats">
                                <div className="noty-hero__stat">
                                    <span className="noty-hero__stat-value">{liveStats.total_voters}</span>
                                    <span className="noty-hero__stat-label">
                                        {liveStats.total_voters > 1 ? 'Votants' : 'Votant'}
                                    </span>
                                </div>
                                <div className="noty-hero__stat">
                                    <span className="noty-hero__stat-value">{liveStats.total_votes}</span>
                                    <span className="noty-hero__stat-label">
                                        {liveStats.total_votes > 1 ? 'Votes' : 'Vote'}
                                    </span>
                                </div>
                            </div>
                        )}

                        {user ? (
                            <Link to="/noty/categories" className="noty-landing__cta">
                                {isComplete ? 'Revoir mes votes' : 'Voter'}
                            </Link>
                        ) : (
                            <div className="noty-hero__actions">
                                <p className="noty-hero__message">
                                    Connecte-toi pour participer aux votes !
                                </p>
                                <Link to="/login" className="noty-landing__cta">Se connecter</Link>
                                <Link to="/noty/categories" className="noty-landing__cta noty-landing__cta--secondary">
                                    Découvrir les catégories
                                </Link>
                            </div>
                        )}
                    </div>

                    {user && progress && (
                        <NotyProgressBar
                            voted={progress.voted}
                            total={progress.total}
                            className="noty-hero__progress"
                        />
                    )}

                    <p className="noty-hero__dates">
                        Du {formatDateFr(currentActiveCampaign.start_date)} au {formatDateFr(currentActiveCampaign.end_date)}
                    </p>
                    {hasPastCampaigns && (
                        <Link to="/noty/hall-of-fame" className="noty-landing__hof-btn">Historique</Link>
                    )}
                </div>
            </div>
        </div>
    )
}
