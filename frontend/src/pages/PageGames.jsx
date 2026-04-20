import { useState, useEffect } from 'react'
import { API_URL } from '../services/api'
import '../styles/components/CardGallery.css'

export default function PageGames() {
    const [games, setGames] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        fetchGames()
    }, [])

    const fetchGames = async () => {
        try {
            const response = await fetch(`${API_URL}/api/games`)
            if (!response.ok) throw new Error('Erreur recuperation jeux')
            const data = await response.json()
            setGames(data)
        } catch (err) {
            setError(err.message)
            console.error('Erreur:', err)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="gallery-page">
                <div className="c-admin-state">Chargement...</div>
            </div>
        )
    }

    return (
        <div className="gallery-page">
            <div className="gallery-header">
                <h1>Jeux</h1>
            </div>

            {error && <div className="c-admin-alert c-admin-alert--error">{error}</div>}

            {games.length > 0 ? (
                <section className="gallery-grid">
                    {games.map(game => (
                        <a
                            key={game.id}
                            href={game.link}
                            target="_blank"
                            rel="noreferrer"
                            className="gallery-card"
                        >
                            <div className="card-wrapper">
                                {game.image_url ? (
                                    <div
                                        className="card-visual"
                                        style={{ backgroundImage: `url(${game.image_url})` }}
                                    />
                                ) : (
                                    <div className="card-placeholder">Pas d'image</div>
                                )}
                            </div>
                            {game.image_hover && (
                                <img
                                    src={game.image_hover}
                                    alt={`${game.name} character`}
                                    className="card-character"
                                />
                            )}
                            <div className="card-body">
                                <h2 className="card-title">{game.name}</h2>
                            </div>
                        </a>
                    ))}
                </section>
            ) : (
                <div className="c-admin-state c-admin-state--empty">
                    <p>Aucun jeu disponible</p>
                </div>
            )}
        </div>
    )
}
