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
import SkinForm from '../../components/admin/forms/SkinForm'

const EMPTY_SKIN = {
    name: '',
    description: '',
    image_url: '',
    image_url_hover: '',
    download_url: '',
    skin_maker: ''
}

export default function GestionSkins({ openAddModal = false, onModalOpened }) {
    const { user } = useContext(AuthContext)
    const [formData, setFormData] = useState({ ...EMPTY_SKIN })
    const { handleFileSelect, uploadPendingFiles, hasPending, reset } = useDeferredUpload()
    const [confirmDeleteId, setConfirmDeleteId] = useState(null)

    const {
        items: skins,
        filteredItems: filteredSkins,
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
    } = useAdminCRUD('/api/skins', {
        emptyItem: EMPTY_SKIN,
        fetchEndpoint: '/api/skins/admin',
        filterFn: (skin, query) =>
            skin.name?.toLowerCase().includes(query.toLowerCase()) ||
            skin.skin_maker?.toLowerCase().includes(query.toLowerCase())
    })

    const handleOpenModal = (skin = null) => {
        if (skin) {
            startEdit(skin)
            setFormData({
                name: skin.name,
                description: skin.description || '',
                image_url: skin.image_url || '',
                image_url_hover: skin.image_url_hover || '',
                download_url: skin.download_url || '',
                skin_maker: skin.skin_maker || ''
            })
        } else {
            startAdd()
            setFormData({ ...EMPTY_SKIN })
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
        const blobUrl = handleFileSelect(field, file, '/api/skins/upload')
        setFormData(prev => ({ ...prev, [field]: blobUrl }))
    }

    const handleCloseModal = () => {
        if (editingId) cancelEdit()
        else cancelAdd()
        setFormData({ ...EMPTY_SKIN })
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
            setFormData({ ...EMPTY_SKIN })
            reset()
        }
    }

    const handleConfirmDelete = async () => {
        await deleteItem(confirmDeleteId)
        setConfirmDeleteId(null)
    }

    const tableHeaders = [
        { label: 'Titre', className: 'c-admin-table__cell--title' },
        { label: 'Image' },
        { label: 'Image survol' },
        { label: 'URL' },
        { label: 'Auteur' },
        { label: 'Statut' },
        { label: 'Actions', className: 'c-admin-table__actions' }
    ]

    const renderRow = (skin) => (
        <tr key={skin.id} className="c-admin-table__row">
            <td className="c-admin-table__cell--title">{skin.name}</td>
            <td>
                {skin.image_url
                    ? <img src={skin.image_url} alt={skin.name} className="c-admin-img-thumb" />
                    : <span className="c-admin-table__placeholder">—</span>
                }
            </td>
            <td>
                {skin.image_url_hover
                    ? <img src={skin.image_url_hover} alt={`${skin.name} (survol)`} className="c-admin-img-thumb" />
                    : <span className="c-admin-table__placeholder">—</span>
                }
            </td>
            <td>
                {skin.download_url
                    ? <a href={skin.download_url} target="_blank" rel="noopener noreferrer" className="c-admin-link-badge">Lien</a>
                    : <span className="c-admin-table__placeholder">—</span>
                }
            </td>
            <td>{skin.skin_maker || <span className="c-admin-table__placeholder">—</span>}</td>
            <td>
                <ToggleSwitch checked={skin.is_active} onChange={() => toggleActive(skin.id)} />
            </td>
            <td className="c-admin-table__actions">
                <button type="button" className="c-admin-button c-admin-button--sm c-admin-button--warning" onClick={() => handleOpenModal(skin)}>
                    Modifier
                </button>
                <button type="button" className="c-admin-button c-admin-button--sm c-admin-button--danger" onClick={() => setConfirmDeleteId(skin.id)}>
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
                    <h2 className="l-admin-toolbar__title">Gestion des skins</h2>
                    <div className="l-admin-toolbar__actions">
                        <button type="button" className="c-admin-button c-admin-button--primary" onClick={() => handleOpenModal()}>
                            + Ajouter un skin
                        </button>
                    </div>
                </div>

                <AdminTableFilter
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    filteredCount={filteredSkins.length}
                    totalCount={skins.length}
                    placeholder="Nom ou auteur..."
                    id="skin-search"
                    entityName="skins"
                />

                <AdminTable
                    data={filteredSkins}
                    loading={loading}
                    loadingMessage="Chargement des skins..."
                    emptyMessage="Aucun skin enregistré pour le moment."
                    emptySearchMessage="Aucun skin ne correspond à votre recherche."
                    searchQuery={searchQuery}
                    headers={tableHeaders}
                    renderRow={renderRow}
                    onEmptyAction={() => handleOpenModal()}
                    emptyActionLabel="+ Ajouter le premier skin"
                    itemsPerPage={6}
                />

                <AdminConfirmDeleteModal
                    isOpen={confirmDeleteId !== null}
                    onClose={() => setConfirmDeleteId(null)}
                    onConfirm={handleConfirmDelete}
                    title="Supprimer le skin"
                    message="Confirmez-vous la suppression de ce skin ? Cette action est irréversible."
                />

                <AdminModal
                    isOpen={showModal}
                    onClose={handleCloseModal}
                    title={editingId ? 'Édition du skin' : 'Ajouter un skin'}
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
                                {editingId ? 'Enregistrer' : 'Ajouter le skin'}
                            </button>
                        </div>
                    }
                >
                    <SkinForm data={formData} onChange={setFormData} onImageUpload={handleImageChange} uploading={false} />
                </AdminModal>
            </div>
        </AdminAccessGuard>
    )
}
