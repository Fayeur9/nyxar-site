import { useEffect, useState } from 'react'
import useAdminCRUD from '../../hooks/useAdminCRUD'
import { useDeferredUpload } from '../../hooks'
import AdminModal from '../../components/admin/AdminModal'
import AdminTable from '../../components/admin/AdminTable'
import AdminTableFilter from '../../components/admin/AdminTableFilter'
import ToggleSwitch from '../../components/common/ToggleSwitch'
import SponsorForm from '../../components/admin/forms/SponsorForm'

const EMPTY_SPONSOR = {
    name: '',
    image_url: '',
    display_order: 0
}

export default function GestionSponsors() {
    const [confirmDelete, setConfirmDelete] = useState(null)
    const [formData, setFormData] = useState({ ...EMPTY_SPONSOR })
    const { handleFileSelect, uploadPendingFiles, hasPending, reset } = useDeferredUpload()

    const {
        items: sponsors,
        filteredItems: filteredSponsors,
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
    } = useAdminCRUD('/api/sponsors', {
        emptyItem: EMPTY_SPONSOR,
        fetchEndpoint: '/api/sponsors/admin',
        filterFn: (sponsor, query) =>
            sponsor.name?.toLowerCase().includes(query.toLowerCase())
    })

    useEffect(() => {
        fetchItems()
    }, [])

    const handleImageChange = (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        const blobUrl = handleFileSelect('image_url', file, '/api/sponsors/upload')
        setFormData(prev => ({ ...prev, image_url: blobUrl }))
    }

    const handleOpenModal = (sponsor = null) => {
        if (sponsor) {
            startEdit(sponsor)
            setFormData({
                name: sponsor.name,
                image_url: sponsor.image_url,
                display_order: sponsor.display_order || 0
            })
        } else {
            startAdd()
            setFormData({
                ...EMPTY_SPONSOR,
                display_order: sponsors.length
            })
        }
    }

    const handleCloseModal = () => {
        if (editingId) cancelEdit()
        else cancelAdd()
        setFormData({ ...EMPTY_SPONSOR })
        reset()
    }

    const handleSave = async () => {
        if (!formData.name || !formData.image_url) return

        let dataToSend = { ...formData }
        if (hasPending) {
            const uploaded = await uploadPendingFiles()
            dataToSend = { ...dataToSend, ...uploaded }
        }

        const success = editingId
            ? await updateItem(editingId, dataToSend)
            : await createItem(dataToSend)

        if (success) {
            setFormData({ ...EMPTY_SPONSOR })
            reset()
        }
    }

    const handleDelete = async () => {
        if (!confirmDelete) return
        await deleteItem(confirmDelete)
        setConfirmDelete(null)
    }

    const tableHeaders = [
        { label: 'Logo' },
        { label: 'Nom', className: 'c-admin-table__cell--title' },
        { label: 'Ordre' },
        { label: 'Statut' },
        { label: 'Actions', className: 'c-admin-table__actions' }
    ]

    const renderRow = (sponsor) => (
        <tr key={sponsor.id} className="c-admin-table__row">
            <td>
                <img
                    src={sponsor.image_url}
                    alt={sponsor.name}
                    className="c-admin-img-thumb"
                />
            </td>
            <td className="c-admin-table__cell--title">{sponsor.name}</td>
            <td>{sponsor.display_order}</td>
            <td>
                <ToggleSwitch
                    checked={sponsor.is_active}
                    onChange={() => toggleActive(sponsor.id)}
                />
            </td>
            <td className="c-admin-table__actions">
                <button
                    className="c-admin-button c-admin-button--sm c-admin-button--warning"
                    onClick={() => handleOpenModal(sponsor)}
                >
                    Modifier
                </button>
                <button
                    className="c-admin-button c-admin-button--sm c-admin-button--danger"
                    onClick={() => setConfirmDelete(sponsor.id)}
                >
                    Supprimer
                </button>
            </td>
        </tr>
    )

    const showModal = isAdding || editingId !== null

    return (
        <div className="l-admin-page">
            <div className="l-admin-toolbar">
                <h2 className="l-admin-toolbar__title">Gestion des sponsors</h2>
                <div className="l-admin-toolbar__actions">
                    <button
                        className="c-admin-button c-admin-button--primary"
                        onClick={() => handleOpenModal()}
                    >
                        + Nouveau sponsor
                    </button>
                </div>
            </div>

            <AdminTableFilter
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                filteredCount={filteredSponsors.length}
                totalCount={sponsors.length}
                placeholder="Nom..."
                id="sponsor-search"
                entityName="sponsors"
            />

            <AdminTable
                data={filteredSponsors}
                loading={loading}
                loadingMessage="Chargement des sponsors..."
                emptyMessage="Aucun sponsor"
                emptySearchMessage="Aucun sponsor ne correspond à votre recherche."
                searchQuery={searchQuery}
                headers={tableHeaders}
                renderRow={renderRow}
                onEmptyAction={() => handleOpenModal()}
                emptyActionLabel="Ajouter le premier sponsor"
                itemsPerPage={6}
            />

            <AdminModal
                isOpen={showModal}
                onClose={handleCloseModal}
                title={editingId ? 'Modifier le sponsor' : 'Nouveau sponsor'}
                error={error}
                onClearError={clearError}
                footer={
                    <div className="c-form-actions">
                        <button
                            className="c-admin-button c-admin-button--secondary"
                            onClick={handleCloseModal}
                        >
                            Annuler
                        </button>
                        <button
                            className="c-admin-button c-admin-button--primary"
                            onClick={handleSave}
                            disabled={!formData.name || !formData.image_url}
                        >
                            {editingId ? 'Modifier' : 'Créer'}
                        </button>
                    </div>
                }
            >
                <SponsorForm
                    data={formData}
                    onChange={setFormData}
                    onImageUpload={handleImageChange}
                    uploading={false}
                />
            </AdminModal>

            <AdminModal
                isOpen={confirmDelete !== null}
                onClose={() => setConfirmDelete(null)}
                title="Confirmer la suppression"
                footer={
                    <div className="c-form-actions">
                        <button
                            className="c-admin-button c-admin-button--secondary"
                            onClick={() => setConfirmDelete(null)}
                        >
                            Annuler
                        </button>
                        <button
                            className="c-admin-button c-admin-button--danger"
                            onClick={handleDelete}
                        >
                            Supprimer
                        </button>
                    </div>
                }
            >
                <p>Êtes-vous sûr de vouloir supprimer ce sponsor ?</p>
            </AdminModal>
        </div>
    )
}
