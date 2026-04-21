import { useState, useEffect, useContext } from 'react'
import { AuthContext } from '../../context/AuthContext'
import useAdminCRUD from '../../hooks/useAdminCRUD'
import { useDeferredUpload } from '../../hooks'
import AdminModal from '../../components/admin/AdminModal'
import AdminTable from '../../components/admin/AdminTable'
import AdminTableFilter from '../../components/admin/AdminTableFilter'
import AdminAccessGuard from '../../components/admin/AdminAccessGuard'
import AdminConfirmDeleteModal from '../../components/admin/AdminConfirmDeleteModal'
import ToggleSwitch from '../../components/common/ToggleSwitch'
import GameForm from '../../components/admin/forms/GameForm'

const EMPTY_GAME = {
    name: '',
    color: '#667eea',
    image_url: '',
    image_hover: '',
    link: ''
}

export default function GestionGames({ openAddModal = false, onModalOpened }) {
    const { user } = useContext(AuthContext)
    const [formData, setFormData] = useState({ ...EMPTY_GAME })
    const { handleFileSelect, uploadPendingFiles, hasPending, reset } = useDeferredUpload()
    const [confirmDeleteId, setConfirmDeleteId] = useState(null)

    const {
        items: games,
        filteredItems: filteredGames,
        loading,
        error,
        searchQuery,
        setSearchQuery,
        isAdding,
        editingId,
        fetchItems,
        createItem,
        updateItem,
        deleteItem,
        toggleActive,
        startAdd,
        startEdit,
        cancelAdd,
        cancelEdit,
        clearError
    } = useAdminCRUD('/api/games', {
        emptyItem: EMPTY_GAME,
        fetchEndpoint: '/api/games/admin',
        filterFn: (game, query) =>
            game.name?.toLowerCase().includes(query.toLowerCase())
    })

    const handleOpenModal = (game = null) => {
        if (game) {
            startEdit(game)
            setFormData({
                name: game.name,
                color: game.color || '#667eea',
                image_url: game.image_url || '',
                image_hover: game.image_hover || '',
                link: game.link || ''
            })
        } else {
            startAdd()
            setFormData({ ...EMPTY_GAME })
        }
    }

    // Ouvrir automatiquement le modal quand la prop openAddModal passe à true
    // Pattern setState-pendant-render avec guard pour éviter les cascades de renders
    const [prevOpenAddModal, setPrevOpenAddModal] = useState(openAddModal)
    if (openAddModal !== prevOpenAddModal) {
        setPrevOpenAddModal(openAddModal)
        if (openAddModal && !isAdding && !editingId) {
            handleOpenModal()
            if (onModalOpened) onModalOpened()
        }
    }

    useEffect(() => {
        if (user?.role === 'admin') fetchItems()
    }, [user])

    const handleImageChange = (e, field) => {
        const file = e.target.files?.[0]
        if (!file) return
        const blobUrl = handleFileSelect(field, file, '/api/line-ups/upload/lineup')
        setFormData(prev => ({ ...prev, [field]: blobUrl }))
    }

    const handleCloseModal = () => {
        if (editingId) cancelEdit()
        else cancelAdd()
        setFormData({ ...EMPTY_GAME })
        reset()
    }

    const handleSave = async () => {
        if (!formData.name?.trim()) return

        let dataToSend = { ...formData }
        if (hasPending) {
            const uploaded = await uploadPendingFiles()
            dataToSend = { ...dataToSend, ...uploaded }
        }

        const success = editingId
            ? await updateItem(editingId, dataToSend)
            : await createItem(dataToSend)

        if (success) {
            setFormData({ ...EMPTY_GAME })
            reset()
        }
    }

    const handleConfirmDelete = async () => {
        await deleteItem(confirmDeleteId)
        setConfirmDeleteId(null)
    }

    const tableHeaders = [
        { label: 'Nom', className: 'c-admin-table__cell--title' },
        { label: 'Couleur' },
        { label: 'Image' },
        { label: 'Image survol' },
        { label: 'Site' },
        { label: 'Statut' },
        { label: 'Actions', className: 'c-admin-table__actions' }
    ]

    const renderRow = (game) => (
        <tr key={game.id} className="c-admin-table__row">
            <td className="c-admin-table__cell--title">{game.name}</td>
            <td>
                <span
                    className="c-admin-color-chip"
                    style={{ backgroundColor: game.color }}
                    title={game.color}
                />
            </td>
            <td>
                {game.image_url
                    ? <img src={game.image_url} alt={game.name} className="c-admin-img-thumb" />
                    : <span className="c-admin-table__placeholder">—</span>
                }
            </td>
            <td>
                {game.image_hover
                    ? <img src={game.image_hover} alt={`${game.name} (survol)`} className="c-admin-img-thumb" />
                    : <span className="c-admin-table__placeholder">—</span>
                }
            </td>
            <td>
                {game.link
                    ? <a href={game.link} target="_blank" rel="noopener noreferrer" className="c-admin-link-badge">Lien</a>
                    : <span className="c-admin-table__placeholder">—</span>
                }
            </td>
            <td>
                <ToggleSwitch checked={game.is_active} onChange={() => toggleActive(game.id)} />
            </td>
            <td className="c-admin-table__actions">
                <button type="button" className="c-admin-button c-admin-button--sm c-admin-button--warning" onClick={() => handleOpenModal(game)}>
                    Modifier
                </button>
                <button type="button" className="c-admin-button c-admin-button--sm c-admin-button--danger" onClick={() => setConfirmDeleteId(game.id)}>
                    Supprimer
                </button>
            </td>
        </tr>
    )

    const showModal = isAdding || editingId !== null

    return (
        <AdminAccessGuard user={user}>
            <div className="l-admin-page">
                <div className="l-admin-toolbar">
                    <h2 className="l-admin-toolbar__title">Gestion des jeux</h2>
                    <div className="l-admin-toolbar__actions">
                        <button type="button" className="c-admin-button c-admin-button--primary" onClick={() => handleOpenModal()}>
                            + Ajouter un jeu
                        </button>
                    </div>
                </div>

                <AdminTableFilter
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    filteredCount={filteredGames.length}
                    totalCount={games.length}
                    placeholder="Nom du jeu..."
                    id="game-search"
                    entityName="jeux"
                />

                <AdminTable
                    data={filteredGames}
                    loading={loading}
                    loadingMessage="Chargement des jeux..."
                    emptyMessage="Aucun jeu enregistré pour le moment."
                    emptySearchMessage="Aucun jeu ne correspond à votre recherche."
                    searchQuery={searchQuery}
                    headers={tableHeaders}
                    renderRow={renderRow}
                    onEmptyAction={() => handleOpenModal()}
                    emptyActionLabel="+ Ajouter le premier jeu"
                    itemsPerPage={6}
                />

                <AdminConfirmDeleteModal
                    isOpen={confirmDeleteId !== null}
                    onClose={() => setConfirmDeleteId(null)}
                    onConfirm={handleConfirmDelete}
                    title="Supprimer le jeu"
                    message="Confirmez-vous la suppression de ce jeu ? Cette action est irréversible."
                />

                <AdminModal
                    isOpen={showModal}
                    onClose={handleCloseModal}
                    title={editingId ? 'Édition du jeu' : 'Ajouter un jeu'}
                    size="xl"
                    scrollBody
                    error={error}
                    onClearError={clearError}
                    footer={
                        <div className="c-form-actions">
                            <button type="button" className="c-admin-button c-admin-button--secondary" onClick={handleCloseModal}>
                                Annuler
                            </button>
                            <button type="button" className="c-admin-button c-admin-button--primary" onClick={handleSave} disabled={!formData.name?.trim()}>
                                {editingId ? 'Enregistrer' : 'Ajouter le jeu'}
                            </button>
                        </div>
                    }
                >
                    <GameForm data={formData} onChange={setFormData} onImageUpload={handleImageChange} uploading={false} />
                </AdminModal>
            </div>
        </AdminAccessGuard>
    )
}
