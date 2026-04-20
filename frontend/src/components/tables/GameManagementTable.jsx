import React, { useMemo, useState } from 'react'

const GameManagementTable = ({
    games = [],
    loading = false,
    error = '',
    onEdit,
    onDelete
}) => {
    const [searchTerm, setSearchTerm] = useState('')

    const filteredGames = useMemo(() => {
        const query = searchTerm.trim().toLowerCase()
        if (!query) return games

        return games.filter((game) => {
            const nameMatch = game.name?.toLowerCase().includes(query)
            const categoryMatch = game.category?.toLowerCase().includes(query)
            return nameMatch || categoryMatch
        })
    }, [games, searchTerm])

    return (
        <div>
            <div className="c-admin-filters">
                <div className="f-field c-admin-filters__search">
                    <label htmlFor="game-search">Rechercher</label>
                    <input
                        id="game-search"
                        type="text"
                        placeholder="Nom ou catégorie"
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                    />
                </div>
                <div className="c-admin-filters__meta">
                    {filteredGames.length} / {games.length} jeux
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
                <div className="c-admin-state loading">Chargement des jeux...</div>
            ) : filteredGames.length === 0 ? (
                <div className="c-admin-state c-admin-state--empty">
                    <p>Aucun jeu ne correspond à votre recherche.</p>
                </div>
            ) : (
                <div className="l-admin-table">
                    <table className="c-admin-table">
                        <thead>
                            <tr>
                                <th className="c-admin-table__cell--title">Nom</th>
                                <th>Catégorie</th>
                                <th className="c-admin-table__actions">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredGames.map((game) => (
                                <tr key={game.id || game.name} className="c-admin-table__row">
                                    <td className="c-admin-table__cell--title">{game.name}</td>
                                    <td>
                                        {game.category ? (
                                            <span className="c-admin-chip c-admin-chip--info">{game.category}</span>
                                        ) : (
                                            <span className="c-admin-table__placeholder">—</span>
                                        )}
                                    </td>
                                    <td className="c-admin-table__actions">
                                        <button
                                            type="button"
                                            className="c-admin-button c-admin-button--sm c-admin-button--warning"
                                            onClick={() => onEdit?.(game)}
                                            disabled={!onEdit}
                                        >
                                            Modifier
                                        </button>
                                        <button
                                            type="button"
                                            className="c-admin-button c-admin-button--sm c-admin-button--danger"
                                            onClick={() => onDelete?.(game)}
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

export default GameManagementTable