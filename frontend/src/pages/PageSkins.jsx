import { useEffect } from 'react'
import { useFetch } from '../hooks'
import '../styles/components/CardGallery.css'

export default function PageSkins() {
    const { data: skins = [], loading, error } = useFetch('/api/skins')

    useEffect(() => {
        document.title = 'Skins | Nyxar'
    }, [])

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
                <h1>Skins Trackmania</h1>
            </div>

            {error && <div className="c-admin-alert c-admin-alert--error">{error}</div>}

            {skins.length > 0 ? (
                <section className="gallery-grid">
                    {skins.map((skin) => (
                        <article
                            key={skin.id}
                            className="gallery-card"
                            onClick={() => skin.download_url && window.open(skin.download_url, '_blank')}
                            style={{ cursor: skin.download_url ? 'pointer' : 'default' }}
                        >
                            <div className="card-wrapper">
                                {skin.image_url ? (
                                    <div
                                        className="card-visual"
                                        style={{ backgroundImage: `url(${skin.image_url})` }}
                                    />
                                ) : (
                                    <div className="card-placeholder">Pas d'image</div>
                                )}
                            </div>
                            {skin.image_url_hover && (
                                <img
                                    src={skin.image_url_hover}
                                    alt={`${skin.name} hover`}
                                    className="card-character"
                                />
                            )}
                            <div className="card-body">
                                <div className="card-meta">
                                    {skin.download_url && (
                                        <span className="card-badge">Telecharger</span>
                                    )}
                                    {skin.skin_maker && (
                                        <span className="card-author">par {skin.skin_maker}</span>
                                    )}
                                </div>
                                <h3 className="card-title">{skin.name}</h3>
                                {skin.description && <p className="card-description">{skin.description}</p>}
                            </div>
                        </article>
                    ))}
                </section>
            ) : (
                <div className="c-admin-state c-admin-state--empty">
                    <p>Aucun skin disponible</p>
                </div>
            )}
        </div>
    )
}
