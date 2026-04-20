import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useFetch } from '../hooks'

const resourceIcons = {
    trackmania_exchange: { name: 'TMX', icon: '/icons/tmx.png' },
    trackmania_io: { name: 'Trackmania.io', icon: '/icons/tmio.png' },
    google_sheet: { name: 'Google Sheet', icon: '/icons/gsheet.png' },
    e_circuit_mania: { name: 'E-Circuit Mania', icon: '/icons/ecircuit.png' },
    rule_book: { name: 'Rulebook', icon: '/icons/gdoc.png' },
    website: { name: 'Site Web', icon: '/icons/web.png' },
    tm_event: { name: 'TM Event', icon: '/icons/tm_event.png' },
    liquipedia: { name: 'Liquipedia', icon: '/icons/liquipedia.png' }
}

export default function PageResultats() {
    const { data: resultats = [], loading, error } = useFetch('/api/resultats')

    useEffect(() => {
        document.title = 'Résultats | Nyxar'
    }, [])

    if (loading) {
        return (
            <div className="section">
                <div className="c-admin-state">Chargement...</div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="section">
                <div className="c-admin-alert c-admin-alert--error">{error}</div>
            </div>
        )
    }

    return (
        <div className="section">
            <header className="section-header">
                <h1>Résultats</h1>
                <p>
                    Retrouvez ici nos aventures, nos participations aux événements et nos résultats en compétition.
                </p>
            </header>

            {resultats.length === 0 ? (
                <div className="c-admin-state c-admin-state--empty">
                    <p>Aucun résultat pour le moment. Revenez bientôt !</p>
                </div>
            ) : (
                <section className="grid grid--2 container">
                    {resultats.map((resultat) => (
                        <article key={resultat.id} className="card">
                            {resultat.image_url && (
                                <div
                                    className="card-image"
                                    style={{ backgroundImage: `url(${resultat.image_url})` }}
                                />
                            )}
                            <div className="card-content">
                                <h3 className="card-title">{resultat.title}</h3>
                                <p className="card-description">{resultat.description}</p>

                                <div className="card-actions">
                                    {resultat.url_page && (
                                        <Link to={`/resultats/${resultat.url_page}`} className="btn btn-primary">
                                            En savoir plus
                                        </Link>
                                    )}
                                    <div className="card-actions-end">
                                        {Object.entries(resourceIcons).map(([key, resource]) =>
                                            resultat[key] && (
                                                <a
                                                    key={key}
                                                    href={resultat[key]}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="c-resource-icon"
                                                    title={resource.name}
                                                >
                                                    <img src={resource.icon} alt={resource.name} />
                                                </a>
                                            )
                                        )}
                                    </div>
                                </div>
                            </div>
                        </article>
                    ))}
                </section>
            )}
        </div>
    )
}
