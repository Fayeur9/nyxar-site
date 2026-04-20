import '../../styles/components/VotingCategories.css'

export default function NotyResultsModal({ isOpen, summary, onClose, onViewResults }) {
    if (!isOpen || !summary) return null

    const percentage = summary.total > 0 ? Math.round((summary.voted / summary.total) * 100) : 0

    return (
        <div className="c-modal-panel__backdrop" onClick={onClose}>
            <div className="c-modal-panel" onClick={e => e.stopPropagation()}>
                <div className="c-modal-panel__header">
                    <h2>Les votes sont terminés !</h2>
                </div>
                <div className="c-modal-panel__body">
                    <p className="noty-results-modal__subtitle">
                        Campagne : <strong>{summary.campaign_title}</strong>
                    </p>
                    <p className="noty-results-modal__summary">
                        Vous avez voté dans <strong>{summary.voted}</strong> / <strong>{summary.total}</strong> catégories
                    </p>
                    <div className="noty-progress noty-results-modal__progress">
                        <div className="noty-progress__track">
                            <div
                                className="noty-progress__bar"
                                style={{ width: `${percentage}%` }}
                            />
                        </div>
                        <span className="noty-progress__text">{percentage}%</span>
                    </div>
                </div>
                <div className="c-modal-panel__footer">
                    <button className="btn btn-cancel" onClick={onClose}>
                        Fermer
                    </button>
                    <button className="btn btn-primary" onClick={onViewResults}>
                        Voir les résultats
                    </button>
                </div>
            </div>
        </div>
    )
}
