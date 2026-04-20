import { useContext, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { AuthContext } from '../../context/AuthContext'
import GestionGames from './GestionGames'
import GestionSkins from './GestionSkins'
import GestionResultats from './GestionResultats'
import GestionUsers from './GestionUsers'
import GestionNoty from './GestionNoty'
import GestionCompetitions from './GestionCompetitions'
import GestionLineUps from './GestionLineUps'
import GestionMiniJeuxTab from './GestionMiniJeuxTab'
import GestionSponsors from './GestionSponsors'
import GestionHeroBanner from './GestionHeroBanner'
import GestionRoles from './GestionRoles'
import GestionPlayers from './GestionPlayers'

const ADMIN_TABS = [
    { key: 'noty', label: 'NOTY' },
    { key: 'competitions', label: 'Compétitions' },
    { key: 'games', label: 'Jeux' },
    { key: 'skins', label: 'Skins' },
    { key: 'resultats', label: 'Résultats' },
    { key: 'lineUps', label: 'Line-ups' },
    { key: 'players', label: 'Joueurs' },
    { key: 'miniJeux', label: 'Mini-jeux' },
    { key: 'sponsors', label: 'Sponsors' },
    { key: 'herobanner', label: 'Hero Banner' },
    { key: 'users', label: 'Utilisateurs' },
    { key: 'roles', label: 'Rôles' }
]

const GestionDashboard = () => {
    const { user } = useContext(AuthContext)
    const location = useLocation()
    const [activeTab, setActiveTab] = useState(location.state?.activeTab || 'noty')
    const [openAddModal, setOpenAddModal] = useState(location.state?.openAddModal || false)

    if (user?.role !== 'admin') {
        return (
            <div className="l-admin-page">
                <div className="c-admin-panel c-admin-panel--restricted">
                    <h1 className="page-title">Accès refusé</h1>
                    <p className="c-admin-panel__subtitle">
                        Vous n'avez pas les permissions pour accéder à cette page.
                    </p>
                </div>
            </div>
        )
    }

    // Réinitialiser openAddModal après utilisation
    const handleModalOpened = () => {
        setOpenAddModal(false)
    }

    const renderTabContent = () => {
        switch (activeTab) {
            case 'games':
                return <GestionGames openAddModal={openAddModal} onModalOpened={handleModalOpened} />
            case 'skins':
                return <GestionSkins openAddModal={openAddModal} onModalOpened={handleModalOpened} />
            case 'resultats':
                return <GestionResultats />
            case 'users':
                return <GestionUsers />
            case 'noty':
                return <GestionNoty />
            case 'competitions':
                return <GestionCompetitions />
            case 'lineUps':
                return <GestionLineUps />
            case 'players':
                return <GestionPlayers openAddModal={openAddModal} onModalOpened={handleModalOpened} />
            case 'miniJeux':
                return <GestionMiniJeuxTab />
            case 'sponsors':
                return <GestionSponsors />
            case 'herobanner':
                return <GestionHeroBanner />
            case 'roles':
                return <GestionRoles />
            default:
                return null
        }
    }

    return (
        <div className="l-admin-page l-admin-page--with-sidebar">
            {/* Sidebar desktop */}
            <aside className="c-admin-sidebar">
                <div className="c-admin-sidebar__header">
                    <h1 className="c-admin-sidebar__title">Administration</h1>
                </div>
                <nav className="c-admin-sidebar__nav">
                    {ADMIN_TABS.map((tab) => (
                        <button
                            key={tab.key}
                            type="button"
                            className={`c-admin-sidebar__item${activeTab === tab.key ? ' is-active' : ''}`}
                            onClick={() => setActiveTab(tab.key)}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </aside>

            {/* Contenu principal */}
            <main className="c-admin-main">
                {/* Select mobile */}
                <div className="c-admin-mobile-nav">
                    <select
                        value={activeTab}
                        onChange={(e) => setActiveTab(e.target.value)}
                        className="c-admin-mobile-select"
                    >
                        {ADMIN_TABS.map((tab) => (
                            <option key={tab.key} value={tab.key}>
                                {tab.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="c-admin-main__content">
                    {renderTabContent()}
                </div>
            </main>
        </div>
    )
}

export default GestionDashboard
