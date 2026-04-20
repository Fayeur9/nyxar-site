import React, { useState } from 'react'
import { API_URL } from '../../services/api'
import ImageUploadField from '../common/ImageUploadField'
import { useDeferredUpload } from '../../hooks'

const EMPTY_FORM = {
    title: '',
    start_date: '',
    end_date: '',
    results_end_date: '',
    image_url: '',
    card_background_url: ''
}

function formatDate(dateStr) {
    if (!dateStr) return ''
    return new Date(dateStr).toISOString().split('T')[0]
}

/**
 * Modal de création / modification d'une campagne NOTY.
 * Gère aussi le modal de conflit (campagne déjà active).
 *
 * @param {Object|null} campaignToEdit  - null = création, objet = modification
 * @param {string}      token
 * @param {Function}    onClose         - fermeture sans action
 * @param {Function}    onSaved         - appelé après sauvegarde réussie
 */
export default function CampaignFormModal({ campaignToEdit, token, onClose, onSaved }) {
    const isEditing = !!campaignToEdit

    const [formData, setFormData] = useState(() => campaignToEdit
        ? {
            title: campaignToEdit.title,
            start_date: formatDate(campaignToEdit.start_date),
            end_date: formatDate(campaignToEdit.end_date),
            results_end_date: formatDate(campaignToEdit.results_end_date),
            image_url: campaignToEdit.image_url || '',
            card_background_url: campaignToEdit.card_background_url || ''
        }
        : { ...EMPTY_FORM }
    )
    const [error, setError] = useState(null)
    const [conflictCampaign, setConflictCampaign] = useState(null)

    const { handleFileSelect, uploadPendingFiles, hasPending, reset } = useDeferredUpload()

    const handleInputChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleImageChange = (e, targetField = 'image_url') => {
        const file = e.target.files?.[0]
        if (!file) return
        const campaignParam = campaignToEdit ? `&campaignId=${campaignToEdit.id}` : ''
        const blobUrl = handleFileSelect(targetField, file, `/api/noty/upload?type=campaign${campaignParam}`, 'file')
        setFormData(prev => ({ ...prev, [targetField]: blobUrl }))
    }

    const handleSave = async (forceClose = false) => {
        if (!formData.title || !formData.start_date || !formData.end_date) {
            setError('Le titre, la date de début et la date de clôture sont obligatoires')
            return
        }

        try {
            let finalFormData = { ...formData }
            if (hasPending) {
                const uploaded = await uploadPendingFiles()
                finalFormData = { ...finalFormData, ...uploaded }
            }

            const url = isEditing
                ? `${API_URL}/api/noty/campaigns/${campaignToEdit.id}`
                : `${API_URL}/api/noty/campaigns`

            const body = {
                title: finalFormData.title,
                start_date: finalFormData.start_date,
                end_date: finalFormData.end_date,
                results_end_date: finalFormData.results_end_date,
                image_url: finalFormData.image_url || null,
                card_background_url: finalFormData.card_background_url || null
            }
            if (forceClose) body.force_close = true

            const response = await fetch(url, {
                method: isEditing ? 'PUT' : 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            })

            if (response.status === 409) {
                const data = await response.json()
                setConflictCampaign(data.conflictingCampaign)
                return
            }

            if (!response.ok) throw new Error('Erreur sauvegarde campagne')

            reset()
            onSaved()
        } catch (err) {
            setError(err.message)
        }
    }

    return (
        <>
            {/* Modal principale (cachée si conflit ouvert) */}
            {!conflictCampaign && (
                <div className="c-modal-overlay" onClick={onClose}>
                    <div className="c-modal-panel" onClick={e => e.stopPropagation()}>
                        <div className="c-modal-panel__header">
                            <div className="c-modal-panel__header-content">
                                <h2 className="c-modal-panel__title">
                                    {isEditing ? '✏️ Modifier une campagne' : '➕ Créer une nouvelle campagne'}
                                </h2>
                            </div>
                            <button className="c-modal-panel__close" onClick={onClose}>✕</button>
                        </div>

                        <div className="c-modal-panel__body c-modal-panel__body--scroll">
                            {error && (
                                <div
                                    className="c-admin-alert c-admin-alert--error"
                                    onClick={() => setError(null)}
                                    style={{ marginBottom: 'var(--spacing-md)' }}
                                >
                                    {error}
                                </div>
                            )}
                            <div className="l-form-grid">
                                <div className="f-field c-form-media">
                                    <span className="c-form-image-upload__label">Image d'illustration</span>
                                    <ImageUploadField
                                        id="campaign-image-input"
                                        value={formData.image_url}
                                        placeholder="Ajouter une image d'illustration"
                                        onChange={(e) => handleImageChange(e, 'image_url')}
                                        uploading={false}
                                    />
                                    <small className="f-field__hint">Optionnel — cliquez sur la zone pour ajouter une image</small>
                                </div>

                                <div className="f-field c-form-media">
                                    <span className="c-form-image-upload__label">Fond des cartes résultats</span>
                                    <ImageUploadField
                                        id="card-bg-input"
                                        value={formData.card_background_url}
                                        placeholder="Ajouter un fond pour les cartes"
                                        onChange={(e) => handleImageChange(e, 'card_background_url')}
                                        uploading={false}
                                    />
                                    <small className="f-field__hint">Optionnel — image de fond pour les cartes partageables (1200x630px recommandé)</small>
                                </div>
                            </div>

                            <div className="f-field">
                                <label htmlFor="title">Titre de la campagne</label>
                                <input
                                    type="text"
                                    id="title"
                                    name="title"
                                    value={formData.title}
                                    onChange={handleInputChange}
                                    placeholder="ex: NOTY 2026"
                                />
                            </div>

                            <div className="l-form-grid l-form-grid--3">
                                <div className="f-field">
                                    <label htmlFor="start_date">Date de début</label>
                                    <input
                                        type="date"
                                        id="start_date"
                                        name="start_date"
                                        value={formData.start_date}
                                        onChange={handleInputChange}
                                    />
                                </div>

                                <div className="f-field">
                                    <label htmlFor="end_date">Date de clôture des votes</label>
                                    <input
                                        type="date"
                                        id="end_date"
                                        name="end_date"
                                        value={formData.end_date}
                                        onChange={handleInputChange}
                                    />
                                </div>

                                <div className="f-field">
                                    <label htmlFor="results_end_date">Fin d'affichage résultats</label>
                                    <input
                                        type="date"
                                        id="results_end_date"
                                        name="results_end_date"
                                        value={formData.results_end_date}
                                        onChange={handleInputChange}
                                        min={formData.end_date}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="c-modal-panel__footer">
                            <button
                                className="c-admin-button c-admin-button--secondary"
                                onClick={onClose}
                            >
                                Annuler
                            </button>
                            <button
                                className="c-admin-button c-admin-button--primary"
                                onClick={() => handleSave()}
                                disabled={!formData.title || !formData.start_date || !formData.end_date}
                            >
                                {isEditing ? 'Modifier' : 'Créer'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de conflit campagne active */}
            {conflictCampaign && (
                <div className="c-modal-overlay" onClick={() => setConflictCampaign(null)}>
                    <div className="c-modal-panel" onClick={e => e.stopPropagation()}>
                        <div className="c-modal-panel__header">
                            <div className="c-modal-panel__header-content">
                                <h2 className="c-modal-panel__title">Campagne en cours</h2>
                            </div>
                            <button className="c-modal-panel__close" onClick={() => setConflictCampaign(null)}>✕</button>
                        </div>

                        <div className="c-modal-panel__body">
                            <div className="c-admin-alert c-admin-alert--warning">
                                Une campagne est déjà en cours et doit être clôturée avant d'en créer une nouvelle.
                            </div>
                            <p><strong>{conflictCampaign.title}</strong></p>
                            <p>Du {new Date(conflictCampaign.start_date).toLocaleDateString('fr-FR')} au {new Date(conflictCampaign.end_date).toLocaleDateString('fr-FR')}</p>
                        </div>

                        <div className="c-modal-panel__footer">
                            <div className="c-form-actions">
                                <button
                                    className="c-admin-button c-admin-button--secondary"
                                    onClick={() => setConflictCampaign(null)}
                                >
                                    Annuler
                                </button>
                                <button
                                    className="c-admin-button c-admin-button--danger"
                                    onClick={() => {
                                        setConflictCampaign(null)
                                        handleSave(true)
                                    }}
                                >
                                    Forcer la clôture et créer
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
