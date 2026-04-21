import { useMemo } from 'react'

const TRACKMANIA_BASE_URL = 'https://trackmania.io/player/'

const formatNumber = (value) => {
    if (value === null || value === undefined) return '—'
    return Number(value).toLocaleString('fr-FR')
}

const formatDateTime = (value) => {
    if (!value) return null
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return null
    return date.toLocaleString('fr-FR')
}

const zoneDisplayName = (zone) => zone?.name || 'N/A'

export default function PlayerDetailsModal({ isOpen, player, statsState, onClose }) {
    const status = statsState?.status || 'idle'
    const data = statsState?.data || null
    const error = statsState?.error || null
    const trackmania = data?.trackmania || null
    const meta = data?.meta || null
    const backendPlayer = data?.player || null

    const trackmaniaUrl = useMemo(() => {
        if (backendPlayer?.trackmaniaSlug) {
            return `${TRACKMANIA_BASE_URL}${encodeURIComponent(backendPlayer.trackmaniaSlug)}`
        }
        if (player?.trackmaniaLink) {
            return player.trackmaniaLink
        }
        return null
    }, [backendPlayer?.trackmaniaSlug, player?.trackmaniaLink])

    if (!isOpen || !player) return null

    const zonePath = trackmania?.trophies?.zonePath || []
    const matchmakingEntries = trackmania?.matchmaking || []

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content modal-content-xl player-modal" onClick={(event) => event.stopPropagation()}>
                <div className="modal-header">
                    <h3>{player.pseudo}</h3>
                    <button className="modal-close" onClick={onClose}>&times;</button>
                </div>
                <div className="modal-body player-modal__body">
                    <section className="player-modal__section player-modal__identity">
                        <div>
                            <h4>Profil Nyxar</h4>
                            <ul className="player-modal__list">
                                <li><span>Nom :</span> {player.first_name || player.last_name ? `${player.first_name || ''} ${player.last_name || ''}`.trim() : '—'}</li>
                                <li><span>Pseudo :</span> {player.pseudo || '—'}</li>
                                <li><span>Phrase :</span> {player.catch_phrase || '—'}</li>
                            </ul>
                        </div>
                        {player.lineups?.length > 0 && (
                            <div className="player-modal__tags">
                                <h4>Line-ups</h4>
                                <div className="player-modal__tag-list">
                                    {player.lineups.map((lineup) => (
                                        <span key={lineup.id} className="player-modal__tag" style={{ '--lineup-color': lineup.color }}>
                                            {lineup.name}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </section>

                    <section className="player-modal__section">
                        <h4>Profil Trackmania.io</h4>
                        {!player.trackmaniaLink && (
                            <div className="player-modal__notice player-modal__notice--warning">
                                Aucun lien Trackmania.io n'a été associé à ce joueur.
                            </div>
                        )}
                        {player.trackmaniaLink && status === 'loading' && (
                            <div className="player-modal__notice">Chargement des statistiques Trackmania...</div>
                        )}
                        {player.trackmaniaLink && status === 'missing' && (
                            <div className="player-modal__notice player-modal__notice--warning">{error || 'Profil Trackmania.io introuvable.'}</div>
                        )}
                        {player.trackmaniaLink && status === 'error' && (
                            <div className="player-modal__notice player-modal__notice--danger">{error || 'Erreur lors de la récupération des statistiques Trackmania.'}</div>
                        )}
                        {player.trackmaniaLink && status === 'ready' && trackmania && (
                            <div className="player-modal__grid">
                                <div className="player-modal__card">
                                    <div className="player-modal__card-header">
                                        <h5>{trackmania.displayName || backendPlayer?.trackmaniaSlug || 'Profil Trackmania'}</h5>
                                        {trackmania.clubTag && <span className="player-modal__clubtag">{trackmania.clubTag}</span>}
                                    </div>
                                    <ul className="player-modal__list">
                                        <li><span>Vanity :</span> {trackmania.vanity || '—'}</li>
                                        <li><span>Account ID :</span> {trackmania.accountId || '—'}</li>
                                        <li>
                                            <span>Dernière maj trophées :</span> {formatDateTime(trackmania.trophies?.updatedAt) || '—'}
                                        </li>
                                        {trackmaniaUrl && (
                                            <li>
                                                <span>Ouvrir :</span> <a href={trackmaniaUrl} target="_blank" rel="noopener noreferrer">Voir sur Trackmania.io</a>
                                            </li>
                                        )}
                                    </ul>
                                </div>

                                <div className="player-modal__card">
                                    <h5>Trophées</h5>
                                    <div className="player-modal__metric">
                                        <span className="player-modal__metric-value">{formatNumber(trackmania.trophies?.points)}</span>
                                        <span className="player-modal__metric-label">Points</span>
                                    </div>
                                    <div className="player-modal__metric-row">
                                        <div>
                                            <span className="player-modal__metric-label">Échelon</span>
                                            <span className="player-modal__metric-value player-modal__metric-value--small">{trackmania.trophies?.echelon ?? '—'}</span>
                                        </div>
                                        {Array.isArray(trackmania.trophies?.counts) && trackmania.trophies.counts.length > 0 && (
                                            <div>
                                                <span className="player-modal__metric-label">Trophées cumulés</span>
                                                <span className="player-modal__metric-value player-modal__metric-value--small">{formatNumber(trackmania.trophies.counts.reduce((total, current) => total + current, 0))}</span>
                                            </div>
                                        )}
                                    </div>
                                    {zonePath.length > 0 && (
                                        <div className="player-modal__zones">
                                            {zonePath.map((zone, index) => (
                                                <div key={`${zone.id || zone.name || index}`} className="player-modal__zone">
                                                    <span className="player-modal__zone-name">{zoneDisplayName(zone)}</span>
                                                    <span className="player-modal__zone-rank">{zone.position ? `#${formatNumber(zone.position)}` : '—'}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {matchmakingEntries.length > 0 && (
                                    <div className="player-modal__card player-modal__card--full">
                                        <h5>Matchmaking</h5>
                                        <div className="player-modal__matchmaking">
                                            {matchmakingEntries.map((entry) => (
                                                <div key={entry.typeId || entry.typeName} className="player-modal__mm-entry">
                                                    <div className="player-modal__mm-header">
                                                        <span className="player-modal__mm-title">{entry.typeName || 'Mode'}</span>
                                                        <span className="player-modal__mm-rank">{entry.rank ? `#${formatNumber(entry.rank)}` : '—'}</span>
                                                    </div>
                                                    <div className="player-modal__mm-body">
                                                        <div>
                                                            <span className="player-modal__metric-label">Score</span>
                                                            <span className="player-modal__metric-value player-modal__metric-value--small">{formatNumber(entry.score)}</span>
                                                        </div>
                                                        {entry.totals?.trackedPlayers && (
                                                            <div>
                                                                <span className="player-modal__metric-label">Joueurs suivis</span>
                                                                <span className="player-modal__metric-value player-modal__metric-value--small">{formatNumber(entry.totals.trackedPlayers)}</span>
                                                            </div>
                                                        )}
                                                        {entry.totals?.activePlayers && (
                                                            <div>
                                                                <span className="player-modal__metric-label">Actifs</span>
                                                                <span className="player-modal__metric-value player-modal__metric-value--small">{formatNumber(entry.totals.activePlayers)}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        {meta && (
                            <p className="player-modal__meta">
                                Données récupérées {meta.fromCache ? 'depuis le cache' : 'en direct'} : {formatDateTime(meta.cacheStoredAt) || 'N/A'} (expiration {formatDateTime(meta.cacheExpiresAt) || 'N/A'}).
                            </p>
                        )}
                    </section>
                </div>
            </div>
        </div>
    )
}
