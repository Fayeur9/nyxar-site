import React, { useState, useMemo } from 'react'

const ITEMS_PER_PAGE = 10

// Composant table mémoïzé - ne re-rend que si campaigns ou callbacks changent
const CampaignsTable = React.memo(function CampaignsTable({
    campaigns,
    getStatus,
    handleOpenModal,
    handleViewDetails,
    setConfirmDelete,
    onDuplicate
}) {
    const [currentPage, setCurrentPage] = useState(1)

    const totalPages = Math.ceil(campaigns.length / ITEMS_PER_PAGE)

    const paginatedCampaigns = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE
        return campaigns.slice(start, start + ITEMS_PER_PAGE)
    }, [campaigns, currentPage])

    // Reset page si les campagnes filtrées changent et la page courante dépasse
    React.useEffect(() => {
        if (currentPage > Math.ceil(campaigns.length / ITEMS_PER_PAGE)) {
            setCurrentPage(1)
        }
    }, [campaigns.length])

    return (
        <>
            <div className="l-admin-table">
                <table className="c-admin-table">
                    <thead>
                        <tr>
                            <th className="c-admin-table__cell--title">Titre</th>
                            <th className="c-admin-table__cell--date">Début</th>
                            <th className="c-admin-table__cell--date">Clôture votes</th>
                            <th className="c-admin-table__cell--date">Fin résultats</th>
                            <th className="c-admin-table__cell--status">Statut</th>
                            <th className="c-admin-table__actions">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedCampaigns.map(campaign => {
                            const status = getStatus(campaign)
                            return (
                                <tr key={campaign.id} className="c-admin-table__row">
                                    <td className="c-admin-table__cell--title">{campaign.title}</td>
                                    <td className="c-admin-table__cell--date">{new Date(campaign.start_date).toLocaleDateString('fr-FR')}</td>
                                    <td className="c-admin-table__cell--date">{new Date(campaign.end_date).toLocaleDateString('fr-FR')}</td>
                                    <td className="c-admin-table__cell--date">{campaign.results_end_date ? new Date(campaign.results_end_date).toLocaleDateString('fr-FR') : '—'}</td>
                                    <td className="c-admin-table__cell--status">
                                        <span className={`c-status-badge c-status-badge--${status.variant}`}>
                                            <span className="c-status-badge__dot"></span>
                                            {status.label}
                                        </span>
                                    </td>
                                    <td className="c-admin-table__actions">
                                        <button
                                            className="c-admin-button c-admin-button--sm c-admin-button--info"
                                            onClick={() => handleViewDetails(campaign.id)}
                                            title="Voir les détails et résultats"
                                        >
                                            📊 Détails
                                        </button>
                                        <button
                                            className="c-admin-button c-admin-button--sm c-admin-button--warning"
                                            onClick={() => handleOpenModal(campaign)}
                                            title="Modifier cette campagne"
                                        >
                                            ✏️ Modifier
                                        </button>
                                        {onDuplicate && (
                                            <button
                                                className="c-admin-button c-admin-button--sm c-admin-button--secondary"
                                                onClick={() => onDuplicate(campaign.id)}
                                                title="Dupliquer cette campagne"
                                            >
                                                📋 Dupliquer
                                            </button>
                                        )}
                                        <button
                                            className="c-admin-button c-admin-button--sm c-admin-button--danger"
                                            onClick={() => setConfirmDelete(campaign.id)}
                                            title="Supprimer cette campagne"
                                        >
                                            🗑️ Supprimer
                                        </button>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {totalPages > 1 && (
                <div className="c-pagination">
                    <button
                        className="c-pagination__btn"
                        onClick={() => setCurrentPage(p => p - 1)}
                        disabled={currentPage === 1}
                    >
                        &larr; Précédent
                    </button>
                    <div className="c-pagination__pages">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                            <button
                                key={page}
                                className={`c-pagination__page${page === currentPage ? ' c-pagination__page--active' : ''}`}
                                onClick={() => setCurrentPage(page)}
                            >
                                {page}
                            </button>
                        ))}
                    </div>
                    <button
                        className="c-pagination__btn"
                        onClick={() => setCurrentPage(p => p + 1)}
                        disabled={currentPage === totalPages}
                    >
                        Suivant &rarr;
                    </button>
                </div>
            )}
        </>
    )
})

export default CampaignsTable
