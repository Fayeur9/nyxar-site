import AdminModal from './AdminModal'

/**
 * Modal de confirmation de suppression générique.
 *
 * @param {boolean}  isOpen     - Visible ou non
 * @param {Function} onClose    - Fermer sans supprimer
 * @param {Function} onConfirm  - Confirmer la suppression
 * @param {string}   [title]    - Titre de la modale
 * @param {string}   [message]  - Message affiché dans le corps
 */
export default function AdminConfirmDeleteModal({ isOpen, onClose, onConfirm, title, message }) {
    return (
        <AdminModal
            isOpen={isOpen}
            onClose={onClose}
            title={title || 'Confirmer la suppression'}
            footer={
                <div className="c-form-actions">
                    <button
                        type="button"
                        className="c-admin-button c-admin-button--secondary"
                        onClick={onClose}
                    >
                        Annuler
                    </button>
                    <button
                        type="button"
                        className="c-admin-button c-admin-button--danger"
                        onClick={onConfirm}
                    >
                        Supprimer
                    </button>
                </div>
            }
        >
            <p>{message || 'Confirmez-vous cette suppression ? Cette action est irréversible.'}</p>
        </AdminModal>
    )
}
