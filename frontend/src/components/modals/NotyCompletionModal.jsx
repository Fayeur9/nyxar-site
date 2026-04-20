import { useNavigate } from 'react-router-dom'
import { useFocusTrap } from '../../hooks'

export default function NotyCompletionModal({ isOpen, total, onClose }) {
    const navigate = useNavigate()
    const trapRef = useFocusTrap(isOpen, onClose)

    if (!isOpen) return null

    const handleGoCategories = () => {
        onClose()
        navigate('/noty/categories')
    }

    return (
        <div className="c-modal-overlay" onClick={onClose}>
            <div ref={trapRef} className="c-modal-panel" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
                <div className="c-modal-panel__header">
                    <h2>Merci pour ta participation !</h2>
                    <button className="c-modal-panel__close" onClick={onClose} aria-label="Fermer">&times;</button>
                </div>
                <div className="c-modal-panel__body">
                    <p className="noty-completion-modal__message">
                        Tu as voté dans les <strong>{total}</strong> catégories de cette campagne.
                    </p>
                </div>
                <div className="c-modal-panel__footer">
                    <button className="btn btn-primary" onClick={handleGoCategories}>
                        Retour aux catégories
                    </button>
                </div>
            </div>
        </div>
    )
}
