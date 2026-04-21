import { useState } from 'react'

export default function AddPlayerModal({ isOpen, onClose, onConfirm, players, loading, error, currentPlayers = [] }) {
    const [selectedPlayer, setSelectedPlayer] = useState(null)

    // Filter out players already in the lineup
    const availablePlayers = players.filter(
        player => !currentPlayers.some(current => current.id === player.id)
    )

    const handleConfirm = () => {
        if (selectedPlayer) {
            onConfirm(selectedPlayer)
            setSelectedPlayer(null)
        }
    }

    const handleClose = () => {
        setSelectedPlayer(null)
        onClose()
    }

    if (!isOpen) return null

    return (
        <div className="modal-overlay" onClick={handleClose}>
            <div className="modal-content modal-content-md" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Ajouter un joueur</h3>
                    <button className="modal-close" onClick={handleClose}>&times;</button>
                </div>
                <div className="modal-body">
                    {error && <div className="c-form-feedback--error">{error}</div>}
                    {loading ? (
                        <p className="c-admin-state">Chargement des joueurs...</p>
                    ) : availablePlayers.length === 0 ? (
                        <p className="c-admin-state">Tous les joueurs sont deja dans cette line-up.</p>
                    ) : (
                        <>
                            <p>Selectionnez un joueur a ajouter a cette line-up</p>
                            <div className="c-admin-select-list">
                                {availablePlayers.map(player => (
                                    <div
                                        key={player.id}
                                        className={`c-admin-select-item ${selectedPlayer?.id === player.id ? 'is-selected' : ''}`}
                                        onClick={() => setSelectedPlayer(player)}
                                    >
                                        {player.image_url && (
                                            <img
                                                src={player.image_url}
                                                alt={player.pseudo}
                                                className="c-admin-select-item__avatar"
                                                loading="lazy"
                                            />
                                        )}
                                        <div className="c-admin-select-item__info">
                                            <h4 className="c-admin-select-item__title">{player.pseudo}</h4>
                                            {(player.first_name || player.last_name) && (
                                                <p className="c-admin-select-item__subtitle">{player.first_name} {player.last_name}</p>
                                            )}
                                            {player.catch_phrase && (
                                                <p className="c-admin-select-item__meta">"{player.catch_phrase}"</p>
                                            )}
                                        </div>
                                        {selectedPlayer?.id === player.id && (
                                            <span className="c-admin-select-item__check">&#10003;</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
                <div className="modal-footer">
                    <button className="btn btn-cancel" onClick={handleClose}>Annuler</button>
                    <button
                        className="btn btn-primary"
                        onClick={handleConfirm}
                        disabled={!selectedPlayer}
                    >
                        Ajouter
                    </button>
                </div>
            </div>
        </div>
    )
}
