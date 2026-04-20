import { Link } from 'react-router-dom'

export default function Page404() {
    return (
        <div className="page-wrapper">
            <div className="container" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
                <h1>404 — Page introuvable</h1>
                <p>Cette page n'existe pas ou a été déplacée.</p>
                <Link to="/" className="btn btn-primary" style={{ marginTop: '1.5rem', display: 'inline-block' }}>
                    Retour à l'accueil
                </Link>
            </div>
        </div>
    )
}
