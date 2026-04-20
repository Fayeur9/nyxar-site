import React, { useState, useEffect, useContext, useCallback } from 'react'
import { AuthContext } from '../../context/AuthContext'
import { NotyCampaignContext } from '../../context/NotyCampaignContext'
import { API_URL } from '../../services/api'
import CampaignsTable from '../../components/noty/CampaignsTable'
import CampaignFormModal from '../../components/noty/CampaignFormModal'
import CampaignDetailsModal from '../../components/noty/CampaignDetailsModal'

function getStatus(campaign) {
    const today = new Date().toISOString().split('T')[0]
    const effectiveEnd = campaign.results_end_date || campaign.end_date
    if (campaign.start_date > today) return { variant: 'upcoming', label: 'À venir' }
    if (effectiveEnd < today) return { variant: 'completed', label: 'Terminée' }
    if (campaign.end_date < today) return { variant: 'results', label: 'Résultats' }
    return { variant: 'active', label: 'En cours' }
}

export default function GestionNoty() {
    const { token } = useContext(AuthContext)
    const { refreshActiveCampaign } = useContext(NotyCampaignContext)

    const [campaigns, setCampaigns] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [searchQuery, setSearchQuery] = useState('')

    // modal = null | { type: 'form', campaign: null|object } | { type: 'delete', id } | { type: 'details', id }
    const [modal, setModal] = useState(null)

    const filteredCampaigns = campaigns.filter(c =>
        c.title?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') setModal(null)
        }
        document.addEventListener('keydown', handleEscape)
        return () => document.removeEventListener('keydown', handleEscape)
    }, [])

    useEffect(() => {
        fetchCampaigns()
    }, [token])

    const fetchCampaigns = async () => {
        setLoading(true)
        try {
            const response = await fetch(`${API_URL}/api/noty/campaigns`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (!response.ok) {
                if (response.status === 403) { setCampaigns([]); return }
                throw new Error('Erreur récupération campagnes')
            }
            setCampaigns(await response.json())
            setError(null)
        } catch (err) {
            setError(err.message)
            setCampaigns([])
        } finally {
            setLoading(false)
        }
    }

    const handleSaved = useCallback(async () => {
        await fetchCampaigns()
        await refreshActiveCampaign()
        setModal(null)
    }, [token])

    const handleDeleteCampaign = async (id) => {
        try {
            const response = await fetch(`${API_URL}/api/noty/campaigns/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (!response.ok) throw new Error('Erreur suppression campagne')
            await fetchCampaigns()
            await refreshActiveCampaign()
            setModal(null)
            setError(null)
        } catch (err) {
            setError(err.message)
        }
    }

    const handleDuplicate = async (id) => {
        try {
            const response = await fetch(`${API_URL}/api/noty/campaigns/${id}/duplicate`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (!response.ok) throw new Error('Erreur duplication campagne')
            const data = await response.json()
            await fetchCampaigns()
            setModal({ type: 'form', campaign: data.campaign })
        } catch (err) {
            setError(err.message)
        }
    }

    return (
        <div className="l-admin-page">
            <div className="l-admin-toolbar">
                <h2 className="l-admin-toolbar__title">Gestion des campagnes NOTY</h2>
                <div className="l-admin-toolbar__actions">
                    <button
                        className="c-admin-button c-admin-button--primary"
                        onClick={() => setModal({ type: 'form', campaign: null })}
                    >
                        ➕ Nouvelle campagne
                    </button>
                </div>
            </div>

            <div className="c-admin-filters">
                <div className="f-field c-admin-filters__search">
                    <label htmlFor="campaign-search">Rechercher</label>
                    <input
                        id="campaign-search"
                        type="text"
                        placeholder="Titre de la campagne..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="c-admin-filters__meta">
                    {filteredCampaigns.length} / {campaigns.length} campagnes
                </div>
            </div>

            {loading ? (
                <div className="c-admin-state loading">Chargement des campagnes...</div>
            ) : filteredCampaigns.length === 0 ? (
                <div className="c-admin-state c-admin-state--empty">
                    <p>{searchQuery ? 'Aucune campagne ne correspond à votre recherche.' : 'Aucune campagne NOTY existante'}</p>
                    {!searchQuery && (
                        <button
                            className="c-admin-button c-admin-button--primary"
                            onClick={() => setModal({ type: 'form', campaign: null })}
                        >
                            Créer la première campagne
                        </button>
                    )}
                </div>
            ) : (
                <CampaignsTable
                    campaigns={filteredCampaigns}
                    getStatus={getStatus}
                    handleOpenModal={(campaign) => setModal({ type: 'form', campaign: campaign || null })}
                    handleViewDetails={(id) => setModal({ type: 'details', id })}
                    setConfirmDelete={(id) => setModal({ type: 'delete', id })}
                    onDuplicate={handleDuplicate}
                />
            )}

            {error && (
                <div
                    className="c-admin-alert c-admin-alert--error"
                    onClick={() => setError(null)}
                    style={{ marginTop: 'var(--spacing-md)' }}
                >
                    {error}
                </div>
            )}

            {/* Modal Création/Modification */}
            {modal?.type === 'form' && (
                <CampaignFormModal
                    campaignToEdit={modal.campaign}
                    token={token}
                    onClose={() => setModal(null)}
                    onSaved={handleSaved}
                />
            )}

            {/* Confirmation de suppression */}
            {modal?.type === 'delete' && (
                <div className="c-modal-overlay" onClick={() => setModal(null)}>
                    <div className="c-modal-panel" onClick={e => e.stopPropagation()}>
                        <div className="c-modal-panel__header">
                            <div className="c-modal-panel__header-content">
                                <h2 className="c-modal-panel__title">Confirmer la suppression</h2>
                            </div>
                            <button className="c-modal-panel__close" onClick={() => setModal(null)}>✕</button>
                        </div>

                        <div className="c-modal-panel__body">
                            <div className="c-admin-alert c-admin-alert--warning">
                                La suppression retire aussi toutes les catégories, nominations et votes liés.
                            </div>
                            <p className="c-feedback-confirm">Confirmez-vous vouloir supprimer cette campagne ?</p>
                        </div>

                        <div className="c-modal-panel__footer">
                            <div className="c-form-actions">
                                <button
                                    className="c-admin-button c-admin-button--secondary"
                                    onClick={() => setModal(null)}
                                >
                                    Annuler
                                </button>
                                <button
                                    className="c-admin-button c-admin-button--danger"
                                    onClick={() => handleDeleteCampaign(modal.id)}
                                >
                                    Supprimer définitivement
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Détails Campagne */}
            {modal?.type === 'details' && (
                <CampaignDetailsModal
                    campaignId={modal.id}
                    token={token}
                    onClose={() => setModal(null)}
                />
            )}
        </div>
    )
}
