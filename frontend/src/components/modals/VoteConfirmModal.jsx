import { getUrlThumbnail } from '../../utils/media'
import { useFocusTrap } from '../../hooks'
import '../../styles/components/modals.css'
import '../../styles/pages/NotyPage.css'

export default function VoteConfirmModal({ isOpen, onClose, onChangeVote, onGoCategories, onNextCategory, podiumPlayers, categoryTitle, nomineeType = 'player' }) {
    const trapRef = useFocusTrap(isOpen, onClose)

    if (!isOpen) return null

    // podiumPlayers[0] = 1er choix, [1] = 2e choix, [2] = 3e choix
    const spots = [
        { rank: 2, label: '2', player: podiumPlayers[1] || null, className: 'podium__spot--2nd' },
        { rank: 1, label: '1', player: podiumPlayers[0] || null, className: 'podium__spot--1st' },
        { rank: 3, label: '3', player: podiumPlayers[2] || null, className: 'podium__spot--3rd' },
    ]

    const renderAvatar = (player) => {
        if (nomineeType === 'url' && player.media_url) {
            const thumb = getUrlThumbnail(player.media_url)
            if (thumb) return <img src={thumb} alt={player.pseudo} className="podium__avatar podium__avatar--media" />
        }
        if (['image', 'video'].includes(nomineeType) && player.image_url) {
            return <img src={player.image_url} alt={player.pseudo} className="podium__avatar podium__avatar--media" />
        }
        if (nomineeType === 'sound') {
            return <div className="podium__avatar podium__avatar--placeholder">&#9835;</div>
        }
        // player type
        if (player.image_url) {
            return <img src={player.image_url} alt={player.pseudo} className="podium__avatar" />
        }
        return (
            <div className="podium__avatar podium__avatar--placeholder">
                {player.pseudo.charAt(0).toUpperCase()}
            </div>
        )
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div ref={trapRef} className="modal-content modal-content-md" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Vote enregistré !</h3>
                    <button className="modal-close" onClick={onClose}>&times;</button>
                </div>
                <div className="modal-body">
                    <p className="podium__category-title">{categoryTitle}</p>
                    <div className="podium">
                        {spots.map(({ rank, label, player, className }) => (
                            <div key={rank} className={`podium__spot ${className}`}>
                                {player ? (
                                    <>
                                        <div className="podium__avatar-wrap">
                                            {renderAvatar(player)}
                                        </div>
                                        <span className="podium__name">{player.pseudo}</span>
                                        <span className="podium__rank">{label}</span>
                                    </>
                                ) : (
                                    <>
                                        <div className="podium__empty">&mdash;</div>
                                        <span className="podium__name">&nbsp;</span>
                                        <span className="podium__rank podium__rank--empty">{label}</span>
                                    </>
                                )}
                                <div className="podium__bar"></div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="modal-footer modal-footer-between">
                    <button className="btn btn-cancel" onClick={onChangeVote}>
                        Changer mon vote
                    </button>
                    <button className="btn btn-primary-outline" onClick={onGoCategories}>
                        Retour aux catégories
                    </button>
                    <button className="btn btn-primary" onClick={onNextCategory}>
                        Catégorie suivante →
                    </button>
                </div>
            </div>
        </div>
    )
}
