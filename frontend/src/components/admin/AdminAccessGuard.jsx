import { useNavigate } from 'react-router-dom'

/**
 * Affiche le contenu si l'utilisateur est admin,
 * sinon affiche un message d'accès refusé.
 */
export default function AdminAccessGuard({ user, children }) {
    const navigate = useNavigate()

    if (user?.role !== 'admin') {
        return (
            <div className="l-admin-page">
                <div className="c-admin-panel c-admin-panel--restricted">
                    <h2>Accès réservé</h2>
                    <p>Vous n'avez pas les droits nécessaires pour accéder à cette page.</p>
                    <button
                        type="button"
                        className="c-admin-button c-admin-button--secondary"
                        onClick={() => navigate('/')}
                    >
                        Retour à l'accueil
                    </button>
                </div>
            </div>
        )
    }

    return children
}
