import { useEffect, useState } from 'react'
import { API_URL } from '../../services/api'
import useAdminCRUD from '../../hooks/useAdminCRUD'
import { useDeferredUpload } from '../../hooks'
import AdminModal from '../../components/admin/AdminModal'
import AdminTable from '../../components/admin/AdminTable'
import AdminTableFilter from '../../components/admin/AdminTableFilter'
import ToggleSwitch from '../../components/common/ToggleSwitch'
import CompetitionForm from '../../components/admin/forms/CompetitionForm'

const EMPTY_COMPETITION = {
    title: '',
    date: '',
    prize: '',
    format: '',
    description: '',
    image: '',
    game: '',
    discord_link: '',
    rule_book: ''
}

export default function GestionCompetitions() {
    const [games, setGames] = useState([])
    const [confirmDelete, setConfirmDelete] = useState(null)
    const [showDetailsModal, setShowDetailsModal] = useState(false)
    const [selectedCompetition, setSelectedCompetition] = useState(null)
    const [formData, setFormData] = useState({ ...EMPTY_COMPETITION })
    const { handleFileSelect, uploadPendingFiles, hasPending, reset } = useDeferredUpload()

    const {
        items: competitions,
        filteredItems: filteredCompetitions,
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
    } = useAdminCRUD('/api/competitions', {
        emptyItem: EMPTY_COMPETITION,
        filterFn: (comp, query) =>
            comp.title?.toLowerCase().includes(query.toLowerCase()) ||
            comp.game?.toLowerCase().includes(query.toLowerCase())
    })

    useEffect(() => {
        fetchItems()
        fetchGames()
    }, [])

    const fetchGames = async () => {
        try {
            const response = await fetch(`${API_URL}/api/games`)
            if (!response.ok) throw new Error('Erreur récupération jeux')
            const data = await response.json()
            setGames(data)
        } catch (err) {
            console.error('Erreur fetch games:', err)
        }
    }

    const handleImageChange = (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        const blobUrl = handleFileSelect('image', file, '/api/competitions/upload')
        setFormData(prev => ({ ...prev, image: blobUrl }))
    }

    const handleOpenModal = (competition = null) => {
        if (competition) {
            startEdit(competition)
            setFormData({ ...competition })
        } else {
            startAdd()
            setFormData({ ...EMPTY_COMPETITION })
        }
    }

    const handleCloseModal = () => {
        if (editingId) cancelEdit()
        else cancelAdd()
        setFormData({ ...EMPTY_COMPETITION })
        reset()
    }

    const handleSave = async () => {
        if (!formData.title || !formData.game) return

        let dataToSend = { ...formData }
        if (hasPending) {
            const uploaded = await uploadPendingFiles()
            dataToSend = { ...dataToSend, ...uploaded }
        }

        const success = editingId
            ? await updateItem(editingId, dataToSend)
            : await createItem(dataToSend)

        if (success) {
            setFormData({ ...EMPTY_COMPETITION })
            reset()
        }
    }

    const handleDelete = async () => {
        if (!confirmDelete) return
        await deleteItem(confirmDelete)
        setConfirmDelete(null)
    }

    const handleViewDetails = (competition) => {
        setSelectedCompetition(competition)
        setShowDetailsModal(true)
    }

    const handleCloseDetails = () => {
        setShowDetailsModal(false)
        setSelectedCompetition(null)
    }

    const tableHeaders = [
        { label: 'Titre', className: 'c-admin-table__cell--title' },
        { label: 'Jeu', className: 'c-admin-table__cell--game' },
        { label: 'Date', className: 'c-admin-table__cell--date' },
        { label: 'Récompense', className: 'c-admin-table__cell--prize' },
        { label: 'Statut' },
        { label: 'Actions', className: 'c-admin-table__actions' }
    ]

    const renderRow = (competition) => (
        <tr key={competition.id} className="c-admin-table__row">
            <td className="c-admin-table__cell--title">{competition.title}</td>
            <td className="c-admin-table__cell--game">{competition.game}</td>
            <td className="c-admin-table__cell--date">{competition.date}</td>
            <td className="c-admin-table__cell--prize">{competition.prize}</td>
            <td>
                <ToggleSwitch
                    checked={competition.is_active}
                    onChange={() => toggleActive(competition.id)}
                />
            </td>
            <td className="c-admin-table__actions">
                <button
                    className="c-admin-button c-admin-button--sm c-admin-button--info"
                    onClick={() => handleViewDetails(competition)}
                    title="Voir les détails"
                >
                    Détails
                </button>
                <button
                    className="c-admin-button c-admin-button--sm c-admin-button--warning"
                    onClick={() => handleOpenModal(competition)}
                    title="Modifier cette compétition"
                >
                    Modifier
                </button>
                <button
                    className="c-admin-button c-admin-button--sm c-admin-button--danger"
                    onClick={() => setConfirmDelete(competition.id)}
                    title="Supprimer cette compétition"
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
                <h2 className="l-admin-toolbar__title">Gestion des compétitions</h2>
                <div className="l-admin-toolbar__actions">
                    <button
                        className="c-admin-button c-admin-button--primary"
                        onClick={() => handleOpenModal()}
                    >
                        + Nouvelle compétition
                    </button>
                </div>
            </div>

            <AdminTableFilter
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                filteredCount={filteredCompetitions.length}
                totalCount={competitions.length}
                placeholder="Titre ou jeu..."
                id="competition-search"
                entityName="compétitions"
            />

            <AdminTable
                data={filteredCompetitions}
                loading={loading}
                loadingMessage="Chargement des compétitions..."
                emptyMessage="Aucune compétition existante"
                emptySearchMessage="Aucune compétition ne correspond à votre recherche."
                searchQuery={searchQuery}
                headers={tableHeaders}
                renderRow={renderRow}
                onEmptyAction={() => handleOpenModal()}
                emptyActionLabel="Créer la première compétition"
                itemsPerPage={8}
            />

            {/* Modal Création/Modification */}
            <AdminModal
                isOpen={showModal}
                onClose={handleCloseModal}
                title={editingId ? 'Modifier une compétition' : 'Créer une nouvelle compétition'}
                scrollBody
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
                            disabled={!formData.title || !formData.game}
                        >
                            {editingId ? 'Modifier' : 'Créer'}
                        </button>
                    </div>
                }
            >
                <CompetitionForm
                    data={formData}
                    onChange={setFormData}
                    onImageUpload={handleImageChange}
                    uploading={false}
                    games={games}
                />
            </AdminModal>

            {/* Modal Détails */}
            <AdminModal
                isOpen={showDetailsModal}
                onClose={handleCloseDetails}
                title={selectedCompetition?.title || 'Détails'}
                size="xl"
                scrollBody
                footer={
                    <>
                        <button
                            className="c-admin-button c-admin-button--warning"
                            onClick={() => {
                                handleOpenModal(selectedCompetition)
                                handleCloseDetails()
                            }}
                        >
                            Modifier
                        </button>
                        <button
                            className="c-admin-button c-admin-button--secondary"
                            onClick={handleCloseDetails}
                        >
                            Fermer
                        </button>
                    </>
                }
            >
                {selectedCompetition && (
                    <>
                        <div className="c-modal-panel__meta">
                            <div className="c-admin-chip-list">
                                {selectedCompetition.game && (
                                    <span className="c-admin-chip c-admin-chip--info">{selectedCompetition.game}</span>
                                )}
                                {selectedCompetition.date && (
                                    <span className="c-admin-chip c-admin-chip--accent">{selectedCompetition.date}</span>
                                )}
                            </div>
                        </div>

                        {selectedCompetition.image && (
                            <div
                                className="c-competition-media"
                                style={{ backgroundImage: `url(${selectedCompetition.image})` }}
                            />
                        )}

                        <div className="c-competition-detail">
                            <h3>Description</h3>
                            <p>{selectedCompetition.description || 'Aucune description'}</p>
                        </div>

                        <div className="c-competition-detail__grid">
                            <div className="c-competition-detail__item">
                                <h4>Format</h4>
                                <p>{selectedCompetition.format || '-'}</p>
                            </div>
                            <div className="c-competition-detail__item">
                                <h4>Récompense</h4>
                                <p>{selectedCompetition.prize || '-'}</p>
                            </div>
                        </div>

                        <div className="c-competition-detail">
                            <h3>Ressources</h3>
                            <div className="c-competition-resources">
                                {selectedCompetition.discord_link && (
                                    <a href={selectedCompetition.discord_link} target="_blank" rel="noopener noreferrer" className="c-admin-link-badge">
                                        <img src="/icons/discord.png" alt="Discord" className="c-admin-link-badge__icon" />
                                        Discord
                                    </a>
                                )}
                                {selectedCompetition.rule_book && (
                                    <a href={selectedCompetition.rule_book} target="_blank" rel="noopener noreferrer" className="c-admin-link-badge">
                                        <img src="/icons/gdoc.png" alt="Règlement" className="c-admin-link-badge__icon" />
                                        Règlement
                                    </a>
                                )}
                                {!selectedCompetition.discord_link && !selectedCompetition.rule_book && (
                                    <span className="c-admin-table__placeholder">Aucune ressource</span>
                                )}
                            </div>
                        </div>
                    </>
                )}
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
                            Supprimer définitivement
                        </button>
                    </div>
                }
            >
                <div className="c-admin-alert c-admin-alert--warning">
                    Cette action supprimera définitivement la compétition sélectionnée.
                </div>
                <p className="c-feedback-confirm">
                    Êtes-vous sûr de vouloir poursuivre ?
                </p>
            </AdminModal>
        </div>
    )
}
