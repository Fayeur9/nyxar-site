import { useContext } from 'react'
import { AuthContext } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import UserManagementTable from '../../components/tables/UserManagementTable'

export default function GestionUsers() {
    const { user } = useContext(AuthContext)
    const navigate = useNavigate()

    const isAdmin = Array.isArray(user?.roles)
        ? user.roles.includes('admin')
        : user?.role === 'admin'

    if (user && !isAdmin) {
        return (
            <div className="l-admin-page">
                <div className="c-admin-panel c-admin-panel--restricted">
                    <h2>Acces reserve</h2>
                    <p>Vous n'avez pas les droits necessaires pour acceder a cette page.</p>
                    <button
                        type="button"
                        className="c-admin-button c-admin-button--secondary"
                        onClick={() => navigate('/')}
                    >
                        ← Retour a l'accueil
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="l-admin-page">
            <div className="l-admin-toolbar">
                <h2 className="l-admin-toolbar__title">Gestion des utilisateurs</h2>
            </div>

            <UserManagementTable />
        </div>
    )
}
