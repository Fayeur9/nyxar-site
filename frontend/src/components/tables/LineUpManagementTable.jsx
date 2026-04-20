import React, { useMemo, useState } from 'react'

const LineUpManagementTable = ({
    lineUps = [],
    loading = false,
    error = '',
    onEdit,
    onDelete
}) => {
    const [searchTerm, setSearchTerm] = useState('')

    const filteredLineUps = useMemo(() => {
        const query = searchTerm.trim().toLowerCase()
        if (!query) return lineUps

        return lineUps.filter((lineUp) => {
            const nameMatch = lineUp.name?.toLowerCase().includes(query)
            const teamMatch = lineUp.team?.toLowerCase().includes(query)
            return nameMatch || teamMatch
        })
    }, [lineUps, searchTerm])

    return (
        <div>
            <div className="c-admin-filters">
                <div className="f-field c-admin-filters__search">
                    <label htmlFor="lineup-search">Rechercher</label>
                    <input
                        id="lineup-search"
                        type="text"
                        placeholder="Nom ou équipe"
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                    />
                </div>
                <div className="c-admin-filters__meta">
                    {filteredLineUps.length} / {lineUps.length} line-ups
                </div>
                {searchTerm && (
                    <div className="c-admin-filters__actions">
                        <button
                            type="button"
                            className="c-admin-button c-admin-button--sm c-admin-button--secondary"
                            onClick={() => setSearchTerm('')}
                        >
                            Effacer
                        </button>
                    </div>
                )}
            </div>

            {error && (
                <div className="c-admin-alert c-admin-alert--error">{error}</div>
            )}

            {loading ? (
                <div className="c-admin-state loading">Chargement des line-ups...</div>
            ) : filteredLineUps.length === 0 ? (
                <div className="c-admin-state c-admin-state--empty">
                    <p>Aucune line-up ne correspond à votre recherche.</p>
                </div>
            ) : (
                <div className="l-admin-table">
                    <table className="c-admin-table">
                        <thead>
                            <tr>
                                <th className="c-admin-table__cell--title">Nom</th>
                                <th>Équipe</th>
                                <th className="c-admin-table__actions">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredLineUps.map((lineUp) => (
                                <tr key={lineUp.id || lineUp.name} className="c-admin-table__row">
                                    <td className="c-admin-table__cell--title">{lineUp.name}</td>
                                    <td>
                                        {lineUp.team ? (
                                            <span className="c-admin-chip c-admin-chip--accent">{lineUp.team}</span>
                                        ) : (
                                            <span className="c-admin-table__placeholder">—</span>
                                        )}
                                    </td>
                                    <td className="c-admin-table__actions">
                                        <button
                                            type="button"
                                            className="c-admin-button c-admin-button--sm c-admin-button--warning"
                                            onClick={() => onEdit?.(lineUp)}
                                            disabled={!onEdit}
                                        >
                                            Modifier
                                        </button>
                                        <button
                                            type="button"
                                            className="c-admin-button c-admin-button--sm c-admin-button--danger"
                                            onClick={() => onDelete?.(lineUp)}
                                            disabled={!onDelete}
                                        >
                                            Supprimer
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}

export default LineUpManagementTable