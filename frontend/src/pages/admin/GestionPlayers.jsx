import { useState, useEffect, useContext, useMemo } from 'react'
import { AuthContext } from '../../context/AuthContext'
import { API_URL } from '../../services/api'
import useAdminCRUD from '../../hooks/useAdminCRUD'
import { useDeferredUpload } from '../../hooks'
import { formatDateForInput } from '../../utils/format'
import AdminModal from '../../components/admin/AdminModal'
import AdminTable from '../../components/admin/AdminTable'
import AdminAccessGuard from '../../components/admin/AdminAccessGuard'
import AdminConfirmDeleteModal from '../../components/admin/AdminConfirmDeleteModal'
import PlayerForm from '../../components/admin/forms/PlayerForm'

const EMPTY_PLAYER = {
    pseudo: '',
    first_name: '',
    last_name: '',
    image_url: '',
    image_url_hover: '',
    birth_date: '',
    catch_phrase: '',
    user_id: '',
    createUser: false,
    email: ''
}

export default function GestionPlayers({ openAddModal, onModalOpened }) {
    const { user, token } = useContext(AuthContext)
    const [formData, setFormData] = useState({ ...EMPTY_PLAYER })
    const { handleFileSelect, uploadPendingFiles, hasPending, reset } = useDeferredUpload()
    const [lineUps, setLineUps] = useState([])
    const [filterLineUpId, setFilterLineUpId] = useState('')
    const [confirmDeleteId, setConfirmDeleteId] = useState(null)
    const [tempPasswordInfo, setTempPasswordInfo] = useState(null)

    const {
        items: players,
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
        startAdd,
        startEdit,
        cancelAdd,
        cancelEdit,
        clearError
    } = useAdminCRUD('/api/line-ups/players', { emptyItem: EMPTY_PLAYER })

    // Filtrage custom : texte + line-up (useAdminCRUD ne gère pas le filtre combiné)
    const filteredPlayers = useMemo(() => {
        let result = players

        if (filterLineUpId) {
            const luId = parseInt(filterLineUpId, 10)
            result = result.filter(p => p.lineups?.some(lu => lu.id === luId))
        }

        const q = searchQuery.trim().toLowerCase()
        if (q) {
            result = result.filter(p =>
                p.pseudo?.toLowerCase().includes(q) ||
                p.first_name?.toLowerCase().includes(q) ||
                p.last_name?.toLowerCase().includes(q)
            )
        }

        return result
    }, [players, searchQuery, filterLineUpId])

    useEffect(() => {
        fetchItems()
        fetchLineUps()
    }, [])

    useEffect(() => {
        if (openAddModal) {
            handleOpenModal()
            onModalOpened?.()
        }
    }, [openAddModal])

    const fetchLineUps = async () => {
        try {
            const response = await fetch(`${API_URL}/api/line-ups/line-ups`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (!response.ok) throw new Error('Erreur récupération line-ups')
            setLineUps(await response.json())
        } catch (err) {
            console.error('Erreur chargement line-ups:', err)
        }
    }

    const handleImageChange = (e, targetField = 'image_url') => {
        const file = e.target.files?.[0]
        if (!file) return
        const blobUrl = handleFileSelect(targetField, file, '/api/line-ups/upload/player')
        setFormData(prev => ({ ...prev, [targetField]: blobUrl }))
    }

    const handleOpenModal = (player = null) => {
        if (player) {
            startEdit(player)
            setFormData({
                pseudo: player.pseudo || '',
                first_name: player.first_name || '',
                last_name: player.last_name || '',
                image_url: player.image_url || '',
                image_url_hover: player.image_url_hover || '',
                birth_date: formatDateForInput(player.birth_date),
                catch_phrase: player.catch_phrase || '',
                user_id: player.user_id ? String(player.user_id) : '',
                _editingId: player.id
            })
        } else {
            startAdd()
            setFormData({ ...EMPTY_PLAYER })
        }
    }

    const handleCloseModal = () => {
        if (editingId) cancelEdit()
        else cancelAdd()
        setFormData({ ...EMPTY_PLAYER })
        reset()
    }

    const handleSave = async () => {
        if (!formData.pseudo?.trim()) return

        let dataToSend = {
            pseudo: formData.pseudo.trim(),
            first_name: formData.first_name || '',
            last_name: formData.last_name || '',
            image_url: formData.image_url || '',
            image_url_hover: formData.image_url_hover || '',
            birth_date: formData.birth_date || null,
            catch_phrase: formData.catch_phrase || '',
            user_id: formData.user_id ? parseInt(formData.user_id, 10) : null
        }

        if (!editingId) {
            if (formData.createUser) {
                dataToSend.createUser = true
                dataToSend.email = formData.email?.trim() || ''
                dataToSend.user_id = null
            }
        }

        if (hasPending) {
            const uploaded = await uploadPendingFiles()
            dataToSend = { ...dataToSend, ...uploaded }
        }

        if (editingId) {
            const success = await updateItem(editingId, dataToSend)
            if (success) {
                setFormData({ ...EMPTY_PLAYER })
                reset()
            }
        } else {
            const result = await createItem(dataToSend, { returnResponse: true })
            if (result) {
                const pseudo = dataToSend.pseudo
                if (result.tempPassword) {
                    setTempPasswordInfo({ pseudo, password: result.tempPassword, email: dataToSend.email })
                }
                setFormData({ ...EMPTY_PLAYER })
                reset()
            }
        }
    }

    const handleConfirmDelete = async () => {
        await deleteItem(confirmDeleteId)
        setConfirmDeleteId(null)
    }

    const hasActiveFilters = searchQuery || filterLineUpId

    const tableHeaders = [
        { label: 'Image' },
        { label: 'Pseudo', className: 'c-admin-table__cell--title' },
        { label: 'Prénom / Nom' },
        { label: 'Line-ups' },
        { label: 'Actions', className: 'c-admin-table__actions' }
    ]

    const renderRow = (player) => (
        <tr key={player.id} className="c-admin-table__row">
            <td>
                {player.image_url
                    ? <img src={player.image_url} alt={player.pseudo} className="c-admin-img-thumb" />
                    : <span className="c-admin-table__placeholder">—</span>
                }
            </td>
            <td className="c-admin-table__cell--title">{player.pseudo}</td>
            <td>
                {player.first_name || player.last_name
                    ? `${player.first_name || ''} ${player.last_name || ''}`.trim()
                    : <span className="c-admin-table__placeholder">—</span>
                }
            </td>
            <td>
                {player.lineups && player.lineups.length > 0 ? (
                    <div className="c-admin-badges">
                        {player.lineups.map(lu => (
                            <span key={lu.id} className="c-admin-badge" style={{ backgroundColor: lu.color || '#667eea' }}>
                                {lu.name}{lu.is_captain ? ' (C)' : ''}
                            </span>
                        ))}
                    </div>
                ) : (
                    <span className="c-admin-table__placeholder">—</span>
                )}
            </td>
            <td className="c-admin-table__actions">
                <button type="button" className="c-admin-button c-admin-button--sm c-admin-button--warning" onClick={() => handleOpenModal(player)}>
                    Modifier
                </button>
                <button type="button" className="c-admin-button c-admin-button--sm c-admin-button--danger" onClick={() => setConfirmDeleteId(player.id)}>
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
                    <h2 className="l-admin-toolbar__title">Gestion des joueurs</h2>
                    <div className="l-admin-toolbar__actions">
                        <button type="button" className="c-admin-button c-admin-button--primary" onClick={() => handleOpenModal()}>
                            + Ajouter un joueur
                        </button>
                    </div>
                </div>

                <div className="c-admin-filters">
                    <div className="f-field c-admin-filters__search">
                        <label htmlFor="player-search">Rechercher</label>
                        <input
                            id="player-search"
                            type="text"
                            placeholder="Pseudo, prénom ou nom..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="f-field c-admin-filters__role">
                        <label htmlFor="player-lineup-filter">Filtrer par line-up</label>
                        <select
                            id="player-lineup-filter"
                            value={filterLineUpId}
                            onChange={(e) => setFilterLineUpId(e.target.value)}
                        >
                            <option value="">Toutes les line-ups</option>
                            {lineUps.map(lu => (
                                <option key={lu.id} value={lu.id}>{lu.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="c-admin-filters__meta">
                        {filteredPlayers.length} / {players.length} joueurs
                    </div>
                    {hasActiveFilters && (
                        <div className="c-admin-filters__actions">
                            <button
                                type="button"
                                className="c-admin-button c-admin-button--sm c-admin-button--secondary"
                                onClick={() => { setSearchQuery(''); setFilterLineUpId('') }}
                            >
                                Effacer les filtres
                            </button>
                        </div>
                    )}
                </div>

                <AdminTable
                    data={filteredPlayers}
                    loading={loading}
                    loadingMessage="Chargement des joueurs..."
                    emptyMessage="Aucun joueur enregistré pour le moment."
                    emptySearchMessage="Aucun joueur ne correspond à votre recherche."
                    searchQuery={searchQuery || filterLineUpId}
                    headers={tableHeaders}
                    renderRow={renderRow}
                    onEmptyAction={() => handleOpenModal()}
                    emptyActionLabel="+ Ajouter le premier joueur"
                    itemsPerPage={10}
                />

                <AdminConfirmDeleteModal
                    isOpen={confirmDeleteId !== null}
                    onClose={() => setConfirmDeleteId(null)}
                    onConfirm={handleConfirmDelete}
                    title="Supprimer le joueur"
                    message="Confirmez-vous la suppression de ce joueur ? Cette action est irréversible."
                />

                {tempPasswordInfo && (
                    <AdminModal
                        isOpen={true}
                        onClose={() => setTempPasswordInfo(null)}
                        title="Compte créé avec succès"
                        size="md"
                        footer={
                            <div className="c-form-actions">
                                <button type="button" className="c-admin-button c-admin-button--primary" onClick={() => setTempPasswordInfo(null)}>
                                    J'ai noté le mot de passe
                                </button>
                            </div>
                        }
                    >
                        <div className="c-admin-temp-password">
                            <p>Le compte de <strong>{tempPasswordInfo.pseudo}</strong> a été créé.</p>
                            <p>Email : <code>{tempPasswordInfo.email}</code></p>
                            <p>Mot de passe temporaire :</p>
                            <div className="c-admin-temp-password__box">
                                <code className="c-admin-temp-password__value">{tempPasswordInfo.password}</code>
                                <button
                                    type="button"
                                    className="c-admin-button c-admin-button--sm c-admin-button--secondary"
                                    onClick={() => navigator.clipboard.writeText(tempPasswordInfo.password)}
                                >
                                    Copier
                                </button>
                            </div>
                            <p className="c-admin-temp-password__warning">⚠ Ce mot de passe ne sera plus affiché après fermeture.</p>
                        </div>
                    </AdminModal>
                )}

                <AdminModal
                    isOpen={showModal}
                    onClose={handleCloseModal}
                    title={editingId ? 'Édition du joueur' : 'Ajouter un joueur'}
                    size="xl"
                    scrollBody
                    error={error}
                    onClearError={clearError}
                    footer={
                        <div className="c-form-actions">
                            <button type="button" className="c-admin-button c-admin-button--secondary" onClick={handleCloseModal}>
                                Annuler
                            </button>
                            <button type="button" className="c-admin-button c-admin-button--primary" onClick={handleSave} disabled={!formData.pseudo?.trim()}>
                                {editingId ? 'Enregistrer' : 'Ajouter le joueur'}
                            </button>
                        </div>
                    }
                >
                    <PlayerForm data={formData} onChange={setFormData} onImageUpload={handleImageChange} uploading={false} />
                </AdminModal>
            </div>
        </AdminAccessGuard>
    )
}
