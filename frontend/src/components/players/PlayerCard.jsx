import { useState } from 'react'

/**
 * Carte joueur réutilisable : avatar + hover + info.
 *
 * @param {Object}  player                - Données joueur (pseudo, image_url, image_url_hover, first_name, last_name, catch_phrase)
 * @param {boolean} [isCaptain=false]     - Affiche le badge capitaine
 * @param {boolean} [showPseudoOnHover]   - Affiche le pseudo en overlay quand l'image hover est chargée
 * @param {string}  [className]           - Classes CSS supplémentaires sur le wrapper .player-item
 */
export default function PlayerCard({ player, isCaptain = false, showPseudoOnHover = false, className = '' }) {
    const [hoverLoaded, setHoverLoaded] = useState(false)

    return (
        <div className={`player-item${hoverLoaded ? ' player-item--has-hover' : ''}${className ? ` ${className}` : ''}`}>
            {isCaptain && <span className="captain-badge" title="Capitaine">C</span>}
            <div className="player-card">
                <div
                    className={`player-card__visual${player.image_url ? ' has-image' : ' is-placeholder'}`}
                    style={player.image_url ? { backgroundImage: `url(${player.image_url})` } : {}}
                >
                    {!player.image_url && (
                        <span className="player-card__placeholder">
                            {player.pseudo?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                    )}
                </div>
                {player.image_url_hover && (
                    <>
                        <img
                            src={player.image_url_hover}
                            alt={`${player.pseudo} hover`}
                            className="player-card__hover"
                            onLoad={() => setHoverLoaded(true)}
                            onError={(e) => { e.target.style.display = 'none' }}
                        />
                        {showPseudoOnHover && hoverLoaded && (
                            <span className="player-card__pseudo">{player.pseudo}</span>
                        )}
                    </>
                )}
            </div>
            <div className="player-info">
                <h4>{player.pseudo}</h4>
                {(player.first_name || player.last_name) && (
                    <p>{player.first_name} {player.last_name}</p>
                )}
                {player.catch_phrase && (
                    <p className="catchphrase">"{player.catch_phrase}"</p>
                )}
            </div>
        </div>
    )
}
