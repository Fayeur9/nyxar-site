import { useEffect } from 'react'
import { API_URL } from '../services/api'
import { useFetch } from '../hooks'
import { formatDateFr } from '../utils/format'
import '../styles/pages/CompetitionsPage.css'

export default function PageCompetitions() {
    const { data: competitions = [], loading, error } = useFetch('/api/competitions/public')

    useEffect(() => {
        document.title = 'Compétitions | Nyxar'
    }, [])

    if (loading) {
        return (
            <div className="competitions-page">
                <div className="loading-state">Chargement des compétitions...</div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="competitions-page">
                <div className="error-state">{error}</div>
            </div>
        )
    }

    return (
        <div className="competitions-page">
            <header className="competitions-hero">
                <h1 className="page-title">Compétitions NYXAR</h1>
                <p>
                    Toute l&apos;année, nous organisons des formats qui bousculent la scène Trackmania : endurance, alt
                    cars, séries mensuelles et finales à cash prize. Voici les rendez-vous à venir.
                </p>
            </header>

            <section className="competitions-list">
                {competitions.length === 0 ? (
                    <div className="empty-state">Aucune compétition à venir pour le moment.</div>
                ) : (
                    competitions.map((competition, index) => (
                        <article
                            key={competition.id}
                            className={`competition-card ${index % 2 === 1 ? 'reverse' : ''}`}
                        >
                            <div
                                className="competition-image"
                                style={{ backgroundImage: `url(${competition.image})` }}
                                aria-hidden="true"
                            />

                            <div className="competition-content">
                                <div className="competition-meta">
                                    <span className="competition-badge">{competition.game}</span>
                                    <span className="competition-date">{formatDateFr(competition.date)}</span>
                                </div>
                                <h3>{competition.title}</h3>
                                <p>{competition.description}</p>
                                <div className="competition-extra">
                                    <span className="competition-prize">{competition.prize}</span>
                                    <span className="competition-format">{competition.format}</span>
                                </div>
                                <div>
                                    {competition.discord_link && (
                                        <a href={competition.discord_link} target='_blank' rel="noopener noreferrer">
                                            <img className='icon-competition' src="/icons/discord.png" alt="Discord" />
                                        </a>
                                    )}
                                    {competition.rule_book && (
                                        <a href={competition.rule_book} target='_blank' rel="noopener noreferrer">
                                            <img className='icon-competition' src="/icons/gdoc.png" alt="Règlement" />
                                        </a>
                                    )}
                                </div>
                            </div>
                        </article>
                    ))
                )}
            </section>
        </div>
    )
}
