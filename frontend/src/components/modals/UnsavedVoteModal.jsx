import { useFocusTrap } from '../../hooks'
import '../../styles/components/modals.css'

export default function UnsavedVoteModal({ isOpen, onCancel, onDiscard, onSave, submitting }) {
    const trapRef = useFocusTrap(isOpen, onCancel)

    if (!isOpen) return null

    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div ref={trapRef} className="modal-content modal-content-sm" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Votes non enregistrés</h3>
                </div>
                <div className="modal-body">
                    <p>Tu as sélectionné des nominés mais ton vote n'a pas encore été enregistré. Que veux-tu faire ?</p>
                </div>
                <div className="modal-footer unsaved-vote-modal__footer">
                    <button className="btn btn-primary-outline" onClick={onCancel}>
                        Retour
                    </button>
                    <button
                        className={`btn btn-primary${submitting ? ' btn--loading' : ''}`}
                        onClick={onSave}
                        disabled={submitting}
                    >
                        {submitting ? 'Enregistrement...' : 'Enregistrer et continuer'}
                    </button>
                    <button className="btn btn-cancel" onClick={onDiscard}>
                        Abandonner les changements
                    </button>
                </div>
            </div>
        </div>
    )
}
