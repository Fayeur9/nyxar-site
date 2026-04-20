import { useState, useEffect, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthContext } from '../../context/AuthContext'
import { API_URL } from '../../services/api'
import useAdminCRUD from '../../hooks/useAdminCRUD'
import AdminModal from '../../components/admin/AdminModal'
import AdminTable from '../../components/admin/AdminTable'
import AdminTableFilter from '../../components/admin/AdminTableFilter'
import AdminAccessGuard from '../../components/admin/AdminAccessGuard'
import AdminConfirmDeleteModal from '../../components/admin/AdminConfirmDeleteModal'
import ToggleSwitch from '../../components/common/ToggleSwitch'
import ResultatForm from '../../components/admin/forms/ResultatForm'

const EMPTY_RESULT = {
    title: '',
    description: '',
    image_url: '',
    url_page: '',
    trackmania_exchange: '',
    trackmania_io: '',
    google_sheet: '',
    e_circuit_mania: '',
    rule_book: '',
    website: '',
    tm_event: '',
    liquipedia: ''
}

export default function GestionResultats() {
    const { user, token } = useContext(AuthContext)
    const navigate = useNavigate()
    const [uploading, setUploading] = useState(false)
    const [uploadError, setUploadError] = useState(null)
    const [formData, setFormData] = useState({ ...EMPTY_RESULT })
    const [confirmDeleteId, setConfirmDeleteId] = useState(null)

    const {
        items: resultats,
        filteredItems: filteredResultats,
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
    } = useAdminCRUD('/api/resultats', {
        emptyItem: EMPTY_RESULT,
        fetchEndpoint: '/api/resultats/admin',
        filterFn: (resultat, query) =>
            resultat.title?.toLowerCase().includes(query.toLowerCase()) ||
            resultat.description?.toLowerCase().includes(query.toLowerCase()) ||
            resultat.url_page?.toLowerCase().includes(query.toLowerCase())
    })

    useEffect(() => {
        if (user) fetchItems()
    }, [user])

    const handleImageUpload = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        setUploading(true)
        setUploadError(null)
        try {
            const formDataUpload = new FormData()
            formDataUpload.append('image', file)
            const response = await fetch(`${API_URL}/api/resultats/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formDataUpload
            })
            if (!response.ok) throw new Error('Erreur upload image')
            const data = await response.json()
            setFormData(prev => ({ ...prev, image_url: data.url }))
        } catch (err) {
            console.error('Erreur upload:', err)
            setUploadError('Erreur lors de l\'upload de l\'image. Veuillez réessayer.')
        } finally {
            setUploading(false)
        }
    }

    const handleOpenModal = (resultat = null) => {
        if (resultat) {
            startEdit(resultat)
            setFormData({
                title: resultat.title,
                description: resultat.description || '',
                image_url: resultat.image_url || '',
                url_page: resultat.url_page || '',
                trackmania_exchange: resultat.trackmania_exchange || '',
                trackmania_io: resultat.trackmania_io || '',
                google_sheet: resultat.google_sheet || '',
                e_circuit_mania: resultat.e_circuit_mania || '',
                rule_book: resultat.rule_book || '',
                website: resultat.website || '',
                tm_event: resultat.tm_event || '',
                liquipedia: resultat.liquipedia || ''
            })
        } else {
            startAdd()
            setFormData({ ...EMPTY_RESULT })
        }
    }

    const handleCloseModal = () => {
        if (editingId) cancelEdit()
        else cancelAdd()
        setFormData({ ...EMPTY_RESULT })
        setUploadError(null)
    }

    const handleSave = async () => {
        if (!formData.title?.trim()) return
        const success = editingId
            ? await updateItem(editingId, formData)
            : await createItem(formData)
        if (success) setFormData({ ...EMPTY_RESULT })
    }

    const handleConfirmDelete = async () => {
        await deleteItem(confirmDeleteId)
        setConfirmDeleteId(null)
    }

    const formatDescription = (value) => {
        if (!value) return '—'
        return value.length > 140 ? `${value.substring(0, 137)}...` : value
    }

    const resolveResultUrl = (slug) => {
        if (!slug) return null
        return slug.startsWith('http') ? slug : `/resultats/${slug}`
    }

    const tableHeaders = [
        { label: 'Titre', className: 'c-admin-table__cell--title' },
        { label: 'Image' },
        { label: 'Description' },
        { label: 'Page détail' },
        { label: 'Statut' },
        { label: 'Actions', className: 'c-admin-table__actions' }
    ]

    const renderRow = (resultat) => {
        const destination = resolveResultUrl(resultat.url_page)
        return (
            <tr key={resultat.id} className="c-admin-table__row">
                <td className="c-admin-table__cell--title">{resultat.title}</td>
                <td>
                    {resultat.image_url
                        ? <img src={resultat.image_url} alt={resultat.title} className="c-admin-img-thumb" />
                        : <span className="c-admin-table__placeholder">—</span>
                    }
                </td>
                <td className="c-admin-table__cell--description">{formatDescription(resultat.description)}</td>
                <td>
                    {destination
                        ? <a href={destination} target="_blank" rel="noopener noreferrer" className="c-admin-link-badge">Consulter</a>
                        : <span className="c-admin-table__placeholder">—</span>
                    }
                </td>
                <td>
                    <ToggleSwitch checked={resultat.is_active} onChange={() => toggleActive(resultat.id)} />
                </td>
                <td className="c-admin-table__actions">
                    <button type="button" className="c-admin-button c-admin-button--sm c-admin-button--warning" onClick={() => handleOpenModal(resultat)}>
                        Modifier
                    </button>
                    <button type="button" className="c-admin-button c-admin-button--sm c-admin-button--danger" onClick={() => setConfirmDeleteId(resultat.id)}>
                        Supprimer
                    </button>
                </td>
            </tr>
        )
    }

    const showModal = isAdding || editingId !== null

    return (
        <AdminAccessGuard user={user}>
            <div className="l-admin-page">
                <div className="l-admin-toolbar">
                    <h2 className="l-admin-toolbar__title">Gestion des résultats</h2>
                    <div className="l-admin-toolbar__actions">
                        <button type="button" className="c-admin-button c-admin-button--primary" onClick={() => handleOpenModal()}>
                            + Ajouter un résultat
                        </button>
                        <button type="button" className="c-admin-button c-admin-button--secondary" onClick={() => navigate('/resultats')}>
                            Voir la page publique
                        </button>
                    </div>
                </div>

                <AdminTableFilter
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    filteredCount={filteredResultats.length}
                    totalCount={resultats.length}
                    placeholder="Titre, description ou slug..."
                    id="result-search"
                    entityName="résultats"
                />

                <AdminTable
                    data={filteredResultats}
                    loading={loading}
                    loadingMessage="Chargement des résultats..."
                    emptyMessage="Aucun résultat enregistré pour le moment."
                    emptySearchMessage="Aucun résultat ne correspond à votre recherche."
                    searchQuery={searchQuery}
                    headers={tableHeaders}
                    renderRow={renderRow}
                    onEmptyAction={() => handleOpenModal()}
                    emptyActionLabel="+ Ajouter le premier résultat"
                    itemsPerPage={6}
                />

                <AdminConfirmDeleteModal
                    isOpen={confirmDeleteId !== null}
                    onClose={() => setConfirmDeleteId(null)}
                    onConfirm={handleConfirmDelete}
                    title="Supprimer le résultat"
                    message="Confirmez-vous la suppression de ce résultat ? Cette action est irréversible."
                />

                <AdminModal
                    isOpen={showModal}
                    onClose={handleCloseModal}
                    title={editingId ? 'Édition du résultat' : 'Ajouter un résultat'}
                    scrollBody
                    error={error || uploadError}
                    onClearError={() => { clearError(); setUploadError(null) }}
                    footer={
                        <div className="c-form-actions">
                            <button type="button" className="c-admin-button c-admin-button--secondary" onClick={handleCloseModal}>
                                Annuler
                            </button>
                            <button type="button" className="c-admin-button c-admin-button--primary" onClick={handleSave} disabled={uploading || !formData.title?.trim()}>
                                {uploading ? 'Enregistrement...' : (editingId ? 'Enregistrer' : 'Ajouter le résultat')}
                            </button>
                        </div>
                    }
                >
                    <ResultatForm data={formData} onChange={setFormData} onImageUpload={handleImageUpload} uploading={uploading} />
                </AdminModal>
            </div>
        </AdminAccessGuard>
    )
}
