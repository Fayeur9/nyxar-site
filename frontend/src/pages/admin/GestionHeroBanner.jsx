import { useEffect, useState } from 'react'
import useAdminCRUD from '../../hooks/useAdminCRUD'
import { useDeferredUpload } from '../../hooks'
import AdminModal from '../../components/admin/AdminModal'
import AdminTable from '../../components/admin/AdminTable'
import AdminTableFilter from '../../components/admin/AdminTableFilter'
import ToggleSwitch from '../../components/common/ToggleSwitch'
import HeroBannerForm from '../../components/admin/forms/HeroBannerForm'

const EMPTY_BANNER = {
    title: '',
    image_url: '',
    display_order: 0,
    is_active: true
}

export default function GestionHeroBanner() {
    const [confirmDelete, setConfirmDelete] = useState(null)
    const [formData, setFormData] = useState({ ...EMPTY_BANNER })
    const { handleFileSelect, uploadPendingFiles, hasPending, reset } = useDeferredUpload()

    const {
        items: banners,
        filteredItems: filteredBanners,
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
    } = useAdminCRUD('/api/herobanner', {
        emptyItem: EMPTY_BANNER,
        fetchEndpoint: '/api/herobanner/admin',
        filterFn: (banner, query) =>
            banner.title?.toLowerCase().includes(query.toLowerCase())
    })

    useEffect(() => {
        fetchItems()
    }, [])

    const handleImageChange = (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        const blobUrl = handleFileSelect('image_url', file, '/api/herobanner/upload')
        setFormData(prev => ({ ...prev, image_url: blobUrl }))
    }

    const handleOpenModal = (banner = null) => {
        if (banner) {
            startEdit(banner)
            setFormData({
                title: banner.title || '',
                image_url: banner.image_url,
                display_order: banner.display_order || 0,
                is_active: banner.is_active === 1
            })
        } else {
            startAdd()
            setFormData({
                ...EMPTY_BANNER,
                display_order: banners.length
            })
        }
    }

    const handleCloseModal = () => {
        if (editingId) cancelEdit()
        else cancelAdd()
        setFormData({ ...EMPTY_BANNER })
        reset()
    }

    const handleSave = async () => {
        if (!formData.image_url) return

        let dataToSend = {
            ...formData,
            is_active: formData.is_active ? 1 : 0
        }

        if (hasPending) {
            const uploaded = await uploadPendingFiles()
            dataToSend = { ...dataToSend, ...uploaded }
        }

        const success = editingId
            ? await updateItem(editingId, dataToSend)
            : await createItem(dataToSend)

        if (success) {
            setFormData({ ...EMPTY_BANNER })
            reset()
        }
    }

    const handleDelete = async () => {
        if (!confirmDelete) return
        await deleteItem(confirmDelete)
        setConfirmDelete(null)
    }

    const tableHeaders = [
        { label: 'Image' },
        { label: 'Titre' },
        { label: 'Ordre' },
        { label: 'Statut' },
        { label: 'Actions', className: 'c-admin-table__actions' }
    ]

    const renderRow = (banner) => (
        <tr key={banner.id} className="c-admin-table__row">
            <td>
                <img
                    src={banner.image_url}
                    alt={banner.title || 'Banner'}
                    className="c-admin-img-thumb"
                    style={{ width: '120px', height: '68px', objectFit: 'cover' }}
                />
            </td>
            <td className="c-admin-table__cell--title">
                {banner.title || <span className="c-admin-table__placeholder">Sans titre</span>}
            </td>
            <td>{banner.display_order}</td>
            <td>
                <ToggleSwitch
                    checked={banner.is_active}
                    onChange={() => toggleActive(banner.id)}
                />
            </td>
            <td className="c-admin-table__actions">
                <button
                    className="c-admin-button c-admin-button--sm c-admin-button--warning"
                    onClick={() => handleOpenModal(banner)}
                >
                    Modifier
                </button>
                <button
                    className="c-admin-button c-admin-button--sm c-admin-button--danger"
                    onClick={() => setConfirmDelete(banner.id)}
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
                <h2 className="l-admin-toolbar__title">Gestion du Hero Banner</h2>
                <div className="l-admin-toolbar__actions">
                    <button
                        className="c-admin-button c-admin-button--primary"
                        onClick={() => handleOpenModal()}
                    >
                        + Nouvelle image
                    </button>
                </div>
            </div>

            <AdminTableFilter
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                filteredCount={filteredBanners.length}
                totalCount={banners.length}
                placeholder="Titre..."
                id="banner-search"
                entityName="banners"
            />

            <AdminTable
                data={filteredBanners}
                loading={loading}
                loadingMessage="Chargement des banners..."
                emptyMessage="Aucune image de banner"
                emptySearchMessage="Aucun banner ne correspond a votre recherche."
                searchQuery={searchQuery}
                headers={tableHeaders}
                renderRow={renderRow}
                onEmptyAction={() => handleOpenModal()}
                emptyActionLabel="Ajouter la premiere image"
                itemsPerPage={8}
            />

            {/* Modal Creation/Modification */}
            <AdminModal
                isOpen={showModal}
                onClose={handleCloseModal}
                title={editingId ? 'Modifier le banner' : 'Nouveau banner'}
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
                            disabled={!formData.image_url}
                        >
                            {editingId ? 'Modifier' : 'Creer'}
                        </button>
                    </div>
                }
            >
                <HeroBannerForm
                    data={formData}
                    onChange={setFormData}
                    onImageUpload={handleImageChange}
                    uploading={false}
                />
            </AdminModal>

            {/* Confirmation de suppression */}
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
                <p>Etes-vous sur de vouloir supprimer ce banner ?</p>
            </AdminModal>
        </div>
    )
}
