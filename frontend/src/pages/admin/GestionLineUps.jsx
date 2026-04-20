import { useState, useEffect, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthContext } from '../../context/AuthContext'
import { API_URL } from '../../services/api'
import useAdminCRUD from '../../hooks/useAdminCRUD'
import { useDeferredUpload } from '../../hooks'
import AdminModal from '../../components/admin/AdminModal'
import AdminTable from '../../components/admin/AdminTable'
import AdminTableFilter from '../../components/admin/AdminTableFilter'
import AdminAccessGuard from '../../components/admin/AdminAccessGuard'
import AdminConfirmDeleteModal from '../../components/admin/AdminConfirmDeleteModal'
import ToggleSwitch from '../../components/common/ToggleSwitch'
import LineUpForm from '../../components/admin/forms/LineUpForm'

const EMPTY_LINEUP = {
    name: '',
    image_url: '',
    color: '#667eea',
    game_id: ''
}

export default function GestionLineUps() {
    const { user, token } = useContext(AuthContext)
    const navigate = useNavigate()
    const [games, setGames] = useState([])
    const [formData, setFormData] = useState({ ...EMPTY_LINEUP })
    const { handleFileSelect, uploadPendingFiles, hasPending, reset } = useDeferredUpload()
    const [confirmDeleteId, setConfirmDeleteId] = useState(null)

    const {
        items: lineUps,
        filteredItems: filteredLineUps,
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
    } = useAdminCRUD('/api/line-ups/line-ups', {
        emptyItem: EMPTY_LINEUP,
        fetchEndpoint: '/api/line-ups/line-ups/admin',
        filterFn: (lineup, query) =>
            lineup.name?.toLowerCase().includes(query.toLowerCase()) ||
            lineup.game_name?.toLowerCase().includes(query.toLowerCase())
    })

    useEffect(() => {
        if (user?.role === 'admin') {
            fetchItems()
            fetchGames()
        }
    }, [user])

    const fetchGames = async () => {
        try {
            const response = await fetch(`${API_URL}/api/games`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (!response.ok) throw new Error('Erreur récupération jeux')
            setGames(await response.json())
        } catch (err) {
            console.error('Erreur chargement jeux:', err)
        }
    }

    const handleImageChange = (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        const blobUrl = handleFileSelect('image_url', file, '/api/line-ups/upload/lineup')
        setFormData(prev => ({ ...prev, image_url: blobUrl }))
    }

    const handleOpenModal = (lineup = null) => {
        if (lineup) {
            startEdit(lineup)
            setFormData({
                name: lineup.name || '',
                image_url: lineup.image_url || '',
                color: lineup.color || '#667eea',
                game_id: lineup.game_id ? String(lineup.game_id) : ''
            })
        } else {
            startAdd()
            setFormData({ ...EMPTY_LINEUP })
        }
    }

    const handleCloseModal = () => {
        if (editingId) cancelEdit()
        else cancelAdd()
        setFormData({ ...EMPTY_LINEUP })
        reset()
    }

    const handleSave = async () => {
        if (!formData.name?.trim()) return

        let dataToSend = {
            name: formData.name.trim(),
            image_url: formData.image_url,
            color: formData.color || '#667eea',
            game_id: formData.game_id ? parseInt(formData.game_id, 10) : null
        }

        if (hasPending) {
            const uploaded = await uploadPendingFiles()
            dataToSend = { ...dataToSend, ...uploaded }
        }

        const success = editingId
            ? await updateItem(editingId, dataToSend)
            : await createItem(dataToSend)

        if (success) {
            setFormData({ ...EMPTY_LINEUP })
            reset()
        }
    }

    const handleConfirmDelete = async () => {
        await deleteItem(confirmDeleteId)
        setConfirmDeleteId(null)
    }

    const tableHeaders = [
        { label: 'Nom', className: 'c-admin-table__cell--title' },
        { label: 'Image' },
        { label: 'Couleur' },
        { label: 'Jeu' },
        { label: 'Joueurs' },
        { label: 'Statut' },
        { label: 'Actions', className: 'c-admin-table__actions' }
    ]

    const renderRow = (lineup) => (
        <tr key={lineup.id} className="c-admin-table__row">
            <td className="c-admin-table__cell--title">{lineup.name}</td>
            <td>
                {lineup.image_url
                    ? <img src={lineup.image_url} alt={lineup.name} className="c-admin-img-thumb" />
                    : <span className="c-admin-table__placeholder">—</span>
                }
            </td>
            <td>
                <div className="c-form-color-preview">
                    <span className="c-form-color-preview__dot" style={{ backgroundColor: lineup.color || '#667eea' }} />
                    <span className="c-form-color-preview__code">{lineup.color || '#667eea'}</span>
                </div>
            </td>
            <td>{lineup.game_name || <span className="c-admin-table__placeholder">—</span>}</td>
            <td><span className="c-admin-count-badge">{lineup.player_count ?? 0}</span></td>
            <td>
                <ToggleSwitch checked={lineup.is_active} onChange={() => toggleActive(lineup.id)} />
            </td>
            <td className="c-admin-table__actions">
                <button type="button" className="c-admin-button c-admin-button--sm c-admin-button--warning" onClick={() => handleOpenModal(lineup)}>
                    Modifier
                </button>
                <button type="button" className="c-admin-button c-admin-button--sm c-admin-button--danger" onClick={() => setConfirmDeleteId(lineup.id)}>
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
                    <h2 className="l-admin-toolbar__title">Gestion des line-ups</h2>
                    <div className="l-admin-toolbar__actions">
                        <button type="button" className="c-admin-button c-admin-button--primary" onClick={() => handleOpenModal()}>
                            + Ajouter une line-up
                        </button>
                        <button type="button" className="c-admin-button c-admin-button--secondary" onClick={() => navigate('/line-ups')}>
                            Voir la page publique
                        </button>
                    </div>
                </div>

                <AdminTableFilter
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    filteredCount={filteredLineUps.length}
                    totalCount={lineUps.length}
                    placeholder="Nom ou jeu..."
                    id="lineup-search"
                    entityName="line-ups"
                />

                <AdminTable
                    data={filteredLineUps}
                    loading={loading}
                    loadingMessage="Chargement des line-ups..."
                    emptyMessage="Aucune line-up enregistrée pour le moment."
                    emptySearchMessage="Aucune line-up ne correspond à votre recherche."
                    searchQuery={searchQuery}
                    headers={tableHeaders}
                    renderRow={renderRow}
                    onEmptyAction={() => handleOpenModal()}
                    emptyActionLabel="+ Ajouter la première line-up"
                    itemsPerPage={5}
                />

                <AdminConfirmDeleteModal
                    isOpen={confirmDeleteId !== null}
                    onClose={() => setConfirmDeleteId(null)}
                    onConfirm={handleConfirmDelete}
                    title="Supprimer la line-up"
                    message="Confirmez-vous la suppression de cette line-up ? Cette action est irréversible."
                />

                <AdminModal
                    isOpen={showModal}
                    onClose={handleCloseModal}
                    title={editingId ? 'Édition de la line-up' : 'Ajouter une line-up'}
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
                                {editingId ? 'Enregistrer' : 'Ajouter la line-up'}
                            </button>
                        </div>
                    }
                >
                    <LineUpForm data={formData} onChange={setFormData} onImageUpload={handleImageChange} uploading={false} games={games} />
                </AdminModal>
            </div>
        </AdminAccessGuard>
    )
}
