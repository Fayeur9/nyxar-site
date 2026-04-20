import React, { useState, useEffect, useCallback, useRef } from 'react'
import { API_URL } from '../../services/api'
import NotyDashboard from './NotyDashboard'
import VotingResults from './VotingCategories/VotingResults'
import SoundWavePlayer from './SoundWavePlayer'
import { useDeferredUpload } from '../../hooks'
import { detectPlatform, extractTwitchClipSlug, extractYouTubeId } from '../../utils/media'

function getStatus(campaign) {
    const today = new Date().toISOString().split('T')[0]
    const effectiveEnd = campaign.results_end_date || campaign.end_date
    if (campaign.start_date > today) return { variant: 'upcoming', label: 'À venir' }
    if (effectiveEnd < today) return { variant: 'completed', label: 'Terminée' }
    if (campaign.end_date < today) return { variant: 'results', label: 'Résultats' }
    return { variant: 'active', label: 'En cours' }
}

// Convertit un titre de catégorie en nom de fichier (même logique que le backend)
function titleToFilename(title) {
    return title
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
}

// Modal pour les détails de la campagne
const CampaignDetailsModal = React.memo(function CampaignDetailsModal({ campaignId, token, onClose }) {
    const [campaign, setCampaign] = useState(null)
    const [categories, setCategories] = useState([])
    const [results, setResults] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [activeTab, setActiveTab] = useState('dashboard')
    const [confirmDeleteCategory, setConfirmDeleteCategory] = useState(null)
    const [categorySearch, setCategorySearch] = useState('')
    const [categoryGameFilter, setCategoryGameFilter] = useState('')
    const [categoryTypeFilter, setCategoryTypeFilter] = useState('')
    const [categoryPage, setCategoryPage] = useState(1)
    const CATEGORIES_PER_PAGE = 10

    // États pour le formulaire de catégorie en modal
    const [showCategoryModal, setShowCategoryModal] = useState(false)
    const [editingCategoryId, setEditingCategoryId] = useState(null)
    const [games, setGames] = useState([])
    const [allPlayers, setAllPlayers] = useState([])
    const [categoryFormData, setCategoryFormData] = useState({
        title: '',
        description: '',
        image_url: '',
        game_id: '',
        visible_by_nyxar: 0,
        nominee_type: 'player'
    })
    const [tempNominees, setTempNominees] = useState([])
    const [customNominees, setCustomNominees] = useState([])
    const originalTempNominees = useRef([])
    const originalCustomNominees = useRef([])
    const [newNomineeTitle, setNewNomineeTitle] = useState('')
    const [newNomineeUrl, setNewNomineeUrl] = useState('')
    const [newNomineeWaveform, setNewNomineeWaveform] = useState(null)
    const [nomineeUploading, setNomineeUploading] = useState(false)
    const [addingNominee, setAddingNominee] = useState(false)
    const { handleFileSelect: catFileSelect, uploadPendingFiles: catUploadFiles, hasPending: catHasPending, reset: catReset } = useDeferredUpload()
    const [formError, setFormError] = useState(null)
    const [formSuccess, setFormSuccess] = useState(null)
    const [categorySubmitting, setCategorySubmitting] = useState(false)

    // États pour les exports
    const [exportingVoters, setExportingVoters] = useState(false)

    // État pour le toggle pause
    const [togglingPause, setTogglingPause] = useState(false)

    // États pour la génération de cartes
    const [generatingCards, setGeneratingCards] = useState(false)
    const [cardsGenerated, setCardsGenerated] = useState(null)
    const [confirmRegenerateCards, setConfirmRegenerateCards] = useState(false)
    const [zipErrorModal, setZipErrorModal] = useState(false)
    const [lightboxImg, setLightboxImg] = useState(null)

    // États pour le drag & drop (réorganisation)
    const [reorderMode, setReorderMode] = useState(false)
    const [reorderCategories, setReorderCategories] = useState([])
    const [draggedIndex, setDraggedIndex] = useState(null)
    const [dragOverIndex, setDragOverIndex] = useState(null)
    const [reorderSaving, setReorderSaving] = useState(false)

    // États pour la sélection multiple des catégories
    const [selectedCategoryIds, setSelectedCategoryIds] = useState(new Set())
    const [confirmBatchDelete, setConfirmBatchDelete] = useState(false)

    // États pour l'import de catégories
    const [showImportModal, setShowImportModal] = useState(false)
    const [importableCategories, setImportableCategories] = useState([])
    const [selectedImportIds, setSelectedImportIds] = useState(new Set())
    const [importLoading, setImportLoading] = useState(false)
    const [importError, setImportError] = useState(null)

    // États pour l'onglet Historique
    const [auditLog, setAuditLog] = useState([])
    const [auditLoading, setAuditLoading] = useState(false)

    // Échap pour les modals imbriquées — capture phase pour intercepter AVANT le handler parent
    useEffect(() => {
        const handleNestedEscape = (e) => {
            if (e.key !== 'Escape') return

            if (lightboxImg) {
                e.stopImmediatePropagation()
                setLightboxImg(null)
            } else if (showCategoryModal) {
                e.stopImmediatePropagation()
                handleCloseCategoryModal()
            } else if (showImportModal) {
                e.stopImmediatePropagation()
                setShowImportModal(false)
            } else if (confirmDeleteCategory) {
                e.stopImmediatePropagation()
                setConfirmDeleteCategory(null)
            } else if (confirmRegenerateCards) {
                e.stopImmediatePropagation()
                setConfirmRegenerateCards(false)
            }
        }

        document.addEventListener('keydown', handleNestedEscape, true)
        return () => document.removeEventListener('keydown', handleNestedEscape, true)
    }, [lightboxImg, showCategoryModal, showImportModal, confirmDeleteCategory, confirmRegenerateCards])

    const formatAction = (action) => {
        const labels = {
            campaign_create: 'Création campagne',
            campaign_update: 'Modification campagne',
            campaign_delete: 'Suppression campagne',
            campaign_toggle_pause: 'Pause/Reprise',
            cards_generate: 'Génération cards',
            categories_batch_delete: 'Suppression catégories',
            category_delete: 'Suppression catégorie',
            vote_delete: 'Suppression vote',
        }
        return labels[action] ?? action
    }

    const fetchAuditLog = useCallback(async () => {
        if (auditLoading) return
        setAuditLoading(true)
        try {
            const response = await fetch(`${API_URL}/api/noty/audit-log`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            })
            if (!response.ok) throw new Error('Erreur récupération historique')
            const data = await response.json()
            setAuditLog(data)
        } catch (err) {
            console.error('fetchAuditLog:', err)
        } finally {
            setAuditLoading(false)
        }
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    const fetchCampaignData = useCallback(async () => {
        setLoading(true)
        try {
            // Récupérer la campagne
            const campaignResponse = await fetch(
                `${API_URL}/api/noty/campaigns/${campaignId}`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            )
            if (!campaignResponse.ok) throw new Error('Campagne non trouvée')
            const campaignData = await campaignResponse.json()
            setCampaign(campaignData)

            // Récupérer les résultats (qui contiennent aussi les catégories)
            const resultsResponse = await fetch(
                `${API_URL}/api/noty/campaigns/${campaignId}/results`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            )
            if (!resultsResponse.ok) throw new Error('Erreur récupération résultats')
            const resultsData = await resultsResponse.json()
            setResults(resultsData)
            setCategories(resultsData)

            setError(null)

            // Vérifier si des cartes/ZIP existent déjà
            try {
                const cardsRes = await fetch(
                    `${API_URL}/api/noty/campaigns/${campaignId}/cards-status`,
                    { headers: { 'Authorization': `Bearer ${token}` } }
                )
                if (cardsRes.ok) {
                    const cardsData = await cardsRes.json()
                    if (cardsData.exists) {
                        setCardsGenerated({ generated: cardsData.generated })
                    }
                }
            } catch (_) { /* silencieux */ }
        } catch (err) {
            setError(err.message)
            setCampaign(null)
            setResults([])
            setCategories([])
        } finally {
            setLoading(false)
        }
    }, [campaignId, token])

    useEffect(() => {
        fetchCampaignData()
    }, [fetchCampaignData])

    // Fetch games et players pour le formulaire catégorie
    const fetchGames = useCallback(async () => {
        try {
            const response = await fetch(`${API_URL}/api/games`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (!response.ok) throw new Error('Erreur récupération jeux')
            const data = await response.json()
            setGames(data)
        } catch (err) {
            console.error('Erreur fetch games:', err)
        }
    }, [token])

    const fetchAllPlayers = useCallback(async () => {
        try {
            const response = await fetch(`${API_URL}/api/line-ups/players`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (!response.ok) throw new Error('Erreur récupération joueurs')
            const data = await response.json()
            setAllPlayers(data)
        } catch (err) {
            console.error('Erreur fetch players:', err)
        }
    }, [token])

    const fetchCategoryForEdit = useCallback(async (categoryId) => {
        try {
            const response = await fetch(`${API_URL}/api/noty/categories/${categoryId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (!response.ok) throw new Error('Erreur récupération catégorie')
            const data = await response.json()
            const nomineeType = data.nominee_type || 'player'
            setCategoryFormData({
                title: data.title,
                description: data.description || '',
                image_url: data.image_url || '',
                game_id: data.game_id || '',
                visible_by_nyxar: data.visible_by_nyxar ?? 0,
                nominee_type: nomineeType
            })
            if (nomineeType === 'player') {
                const nomineesResponse = await fetch(`${API_URL}/api/noty/categories/${categoryId}/nominees`)
                if (nomineesResponse.ok) {
                    const nomineesData = await nomineesResponse.json()
                    // Joueurs réels (IDs positifs)
                    const playerIds = nomineesData.filter(n => n.id > 0).map(n => n.id)
                    setTempNominees(playerIds)
                    originalTempNominees.current = [...playerIds]
                    // Personnes custom (IDs négatifs)
                    const customs = nomineesData.filter(n => n.id < 0).map(n => ({
                        id: Math.abs(n.id),
                        title: n.pseudo,
                        media_url: n.image_url
                    }))
                    setCustomNominees(customs)
                    originalCustomNominees.current = customs.map(c => c.id)
                }
            } else {
                const cnResponse = await fetch(`${API_URL}/api/noty/categories/${categoryId}/custom-nominees`)
                if (cnResponse.ok) {
                    const cnData = await cnResponse.json()
                    const customs = cnData.map(n => ({ id: n.id, title: n.title, media_url: n.media_url, waveform_data: n.waveform_data }))
                    setCustomNominees(customs)
                    originalCustomNominees.current = customs.map(c => c.id)
                }
            }
        } catch (err) {
            setFormError(err.message)
        }
    }, [token])

    // Filtrer les joueurs en fonction du jeu sélectionné
    const getFilteredPlayers = useCallback(() => {
        if (!categoryFormData.game_id) {
            return allPlayers
        }
        const gameId = parseInt(categoryFormData.game_id)
        return allPlayers.filter(player => player.game_id === gameId)
    }, [categoryFormData.game_id, allPlayers])

    const handleDeleteCategory = async (categoryId) => {
        try {
            const response = await fetch(`${API_URL}/api/noty/categories/${categoryId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (!response.ok) throw new Error('Erreur suppression catégorie')
            setConfirmDeleteCategory(null)
            await fetchCampaignData()
        } catch (err) {
            setError(err.message)
        }
    }

    const handleBatchDeleteCategories = async () => {
        try {
            const response = await fetch(`${API_URL}/api/noty/campaigns/${campaignId}/categories`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ categoryIds: [...selectedCategoryIds] })
            })
            if (!response.ok) throw new Error('Erreur suppression en lot')
            setSelectedCategoryIds(new Set())
            setConfirmBatchDelete(false)
            await fetchCampaignData()
        } catch (err) {
            setError(err.message)
        }
    }

    const handleEditCategory = async (categoryId) => {
        setEditingCategoryId(categoryId)
        setFormError(null)
        setFormSuccess(null)
        await fetchGames()
        await fetchAllPlayers()
        await fetchCategoryForEdit(categoryId)
        setShowCategoryModal(true)
    }

    const handleCreateCategory = async () => {
        setEditingCategoryId(null)
        setCategoryFormData({
            title: '',
            description: '',
            image_url: '',
            game_id: '',
            visible_by_nyxar: 0,
            nominee_type: 'player'
        })
        setTempNominees([])
        setCustomNominees([])
        originalTempNominees.current = []
        originalCustomNominees.current = []
        setNewNomineeTitle('')
        setNewNomineeUrl('')
        setNewNomineeWaveform(null)
        setAddingNominee(false)
        setFormError(null)
        setFormSuccess(null)
        await fetchGames()
        await fetchAllPlayers()
        setShowCategoryModal(true)
    }

    const handleCloseCategoryModal = () => {
        setShowCategoryModal(false)
        setEditingCategoryId(null)
        setCategoryFormData({
            title: '',
            description: '',
            image_url: '',
            game_id: '',
            visible_by_nyxar: 0,
            nominee_type: 'player'
        })
        setTempNominees([])
        setCustomNominees([])
        setNewNomineeTitle('')
        setNewNomineeUrl('')
        setNewNomineeWaveform(null)
        setAddingNominee(false)
        setFormError(null)
        setFormSuccess(null)
        catReset()
    }

    // Import de catégories
    const handleOpenImportModal = async () => {
        setImportLoading(true)
        setImportError(null)
        setSelectedImportIds(new Set())
        setShowImportModal(true)
        try {
            const response = await fetch(
                `${API_URL}/api/noty/campaigns/${campaignId}/importable-categories`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            )
            if (!response.ok) throw new Error('Erreur récupération catégories')
            const data = await response.json()
            setImportableCategories(data)
        } catch (err) {
            setImportError(err.message)
        } finally {
            setImportLoading(false)
        }
    }

    const handleToggleImportId = (id) => {
        setSelectedImportIds(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const handleSelectAllImport = () => {
        if (selectedImportIds.size === importableCategories.length) {
            setSelectedImportIds(new Set())
        } else {
            setSelectedImportIds(new Set(importableCategories.map(c => c.id)))
        }
    }

    const handleImportCategories = async () => {
        if (selectedImportIds.size === 0) return
        setImportLoading(true)
        setImportError(null)
        try {
            const response = await fetch(
                `${API_URL}/api/noty/campaigns/${campaignId}/import-categories`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ category_ids: [...selectedImportIds] })
                }
            )
            if (!response.ok) throw new Error('Erreur import catégories')
            const data = await response.json()
            setShowImportModal(false)
            setSelectedImportIds(new Set())
            await fetchCampaignData()
        } catch (err) {
            setImportError(err.message)
        } finally {
            setImportLoading(false)
        }
    }

    const handleCategoryImageChange = (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        const blobUrl = catFileSelect('image_url', file, `/api/noty/upload?type=thumbnail&campaignId=${campaignId}`, 'file')
        setCategoryFormData(prev => ({ ...prev, image_url: blobUrl }))
    }

    const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50 Mo

    const ALLOWED_EXTENSIONS = {
        image: { exts: ['.jpg', '.jpeg', '.png', '.gif', '.webp'], label: 'Images : JPG, PNG, GIF, WEBP' },
        sound: { exts: ['.mp3', '.wav', '.ogg', '.m4a'], label: 'Audio : MP3, WAV, OGG, M4A' },
        video: { exts: ['.mp4', '.webm', '.mov'], label: 'Vidéo : MP4, WEBM, MOV' },
        url: { exts: ['.jpg', '.jpeg', '.png', '.gif', '.webp'], label: 'Images : JPG, PNG, GIF, WEBP' },
        player: { exts: ['.jpg', '.jpeg', '.png', '.gif', '.webp'], label: 'Images : JPG, PNG, GIF, WEBP' }
    }

    const uploadNomineeFile = async (file) => {
        const ext = '.' + file.name.split('.').pop().toLowerCase()
        const type = categoryFormData.nominee_type || 'image'
        const allowed = ALLOWED_EXTENSIONS[type]
        if (allowed && !allowed.exts.includes(ext)) {
            setFormError(`Format non supporté (${ext}). Formats autorisés : ${allowed.label}`)
            return
        }

        if (file.size > MAX_FILE_SIZE) {
            setFormError(`Le fichier est trop lourd (${(file.size / 1024 / 1024).toFixed(1)} Mo). Limite : 50 Mo`)
            return
        }

        setNomineeUploading(true)
        try {
            const formDataUpload = new FormData()
            formDataUpload.append('file', file)

            const response = await fetch(`${API_URL}/api/noty/upload?type=nominee&campaignId=${campaignId}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formDataUpload
            })

            if (!response.ok) {
                const err = await response.json().catch(() => null)
                throw new Error(err?.message || 'Erreur upload fichier')
            }
            const data = await response.json()
            setNewNomineeUrl(data.url)
            setNewNomineeWaveform(data.waveform_data || null)
            setFormError(null)
        } catch (err) {
            setFormError(err.message)
        } finally {
            setNomineeUploading(false)
        }
    }

    const handleNomineeFileUpload = (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        uploadNomineeFile(file)
    }

    const [draggingNominee, setDraggingNominee] = useState(false)

    const handleNomineeDrop = (e) => {
        e.preventDefault()
        setDraggingNominee(false)
        const file = e.dataTransfer.files?.[0]
        if (!file) return
        if (!addingNominee) setAddingNominee(true)
        uploadNomineeFile(file)
    }

    const handleAddCustomNominee = () => {
        if (!newNomineeTitle.trim() || !newNomineeUrl.trim()) return
        setCustomNominees(prev => [...prev, {
            title: newNomineeTitle.trim(),
            media_url: newNomineeUrl.trim(),
            waveform_data: newNomineeWaveform
        }])
        setNewNomineeTitle('')
        setNewNomineeUrl('')
        setNewNomineeWaveform(null)
        setAddingNominee(false)
    }

    const handleRemoveCustomNominee = (index) => {
        setCustomNominees(prev => prev.filter((_, i) => i !== index))
    }

    const handleAddTempNominee = (playerId) => {
        if (!tempNominees.includes(playerId) && (tempNominees.length + customNominees.length) < 6) {
            setTempNominees([...tempNominees, playerId])
        }
    }

    const handleRemoveTempNominee = (playerId) => {
        setTempNominees(tempNominees.filter(id => id !== playerId))
    }

    const handleSubmitCategory = async (continueAdding = false) => {
        if (!categoryFormData.title) {
            setFormError('Titre requis')
            return
        }
        if (categorySubmitting) return
        setCategorySubmitting(true)

        try {
            let catDataToSend = { ...categoryFormData }
            if (catHasPending) {
                const uploaded = await catUploadFiles()
                catDataToSend = { ...catDataToSend, ...uploaded }
            }

            const method = editingCategoryId ? 'PUT' : 'POST'
            const url = editingCategoryId
                ? `${API_URL}/api/noty/categories/${editingCategoryId}`
                : `${API_URL}/api/noty/categories`

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    title: catDataToSend.title,
                    description: catDataToSend.description,
                    image_url: catDataToSend.image_url,
                    game_id: catDataToSend.nominee_type === 'player' && catDataToSend.game_id ? parseInt(catDataToSend.game_id) : null,
                    visible_by_nyxar: catDataToSend.visible_by_nyxar,
                    noty_campaign_id: parseInt(campaignId),
                    nominee_type: catDataToSend.nominee_type
                })
            })
            if (!response.ok) throw new Error('Erreur création/modification catégorie')

            const newCategory = await response.json()

            const catId = newCategory.id
            const errors = []

            // Supprimer les nominees retirés (seulement en édition)
            if (editingCategoryId) {
                if (categoryFormData.nominee_type === 'player') {
                    const removedPlayers = originalTempNominees.current.filter(id => !tempNominees.includes(id))
                    for (const playerId of removedPlayers) {
                        const r = await fetch(`${API_URL}/api/noty/categories/${catId}/nominees/${playerId}`, {
                            method: 'DELETE',
                            headers: { 'Authorization': `Bearer ${token}` }
                        })
                        if (!r.ok) errors.push(`Erreur suppression joueur ${playerId}`)
                    }
                }
                const currentCustomIds = customNominees.filter(n => n.id).map(n => n.id)
                const removedCustoms = originalCustomNominees.current.filter(id => !currentCustomIds.includes(id))
                for (const nid of removedCustoms) {
                    const r = await fetch(`${API_URL}/api/noty/categories/${catId}/custom-nominees/${nid}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    })
                    if (!r.ok) errors.push(`Erreur suppression nominé custom ${nid}`)
                }
            }

            // Ajouter les nominees selon le type
            if (categoryFormData.nominee_type === 'player') {
                const newPlayers = tempNominees.filter(id => !originalTempNominees.current.includes(id))
                for (const playerId of newPlayers) {
                    const r = await fetch(`${API_URL}/api/noty/categories/${catId}/nominees`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ player_id: playerId })
                    })
                    if (!r.ok) errors.push(`Erreur ajout joueur ${playerId}`)
                }
                for (const nominee of customNominees) {
                    if (!nominee.id) {
                        const r = await fetch(`${API_URL}/api/noty/categories/${catId}/custom-nominees`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({ title: nominee.title, media_url: nominee.media_url })
                        })
                        if (!r.ok) errors.push(`Erreur ajout personne "${nominee.title}"`)
                    }
                }
            } else {
                for (const nominee of customNominees) {
                    if (!nominee.id) {
                        const r = await fetch(`${API_URL}/api/noty/categories/${catId}/custom-nominees`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({ title: nominee.title, media_url: nominee.media_url, waveform_data: nominee.waveform_data || null })
                        })
                        if (!r.ok) errors.push(`Erreur ajout nominé "${nominee.title}"`)
                    }
                }
            }

            if (errors.length > 0) {
                setFormError(errors.join(', '))
            }

            setFormSuccess(editingCategoryId ? 'Catégorie modifiée' : 'Catégorie créée')

            if (continueAdding) {
                setCategoryFormData(prev => ({
                    title: '',
                    description: '',
                    image_url: '',
                    game_id: '',
                    visible_by_nyxar: 0,
                    nominee_type: prev.nominee_type
                }))
                setTempNominees([])
                setCustomNominees([])
                setNewNomineeTitle('')
                setNewNomineeUrl('')
                setNewNomineeWaveform(null)
                setAddingNominee(false)
                catReset()
                setFormSuccess('Catégorie créée - Ajoutez-en une autre')
            } else {
                handleCloseCategoryModal()
                fetchCampaignData()
            }
        } catch (err) {
            setFormError(err.message)
        } finally {
            setCategorySubmitting(false)
        }
    }

    // ============ RENDER CATEGORIES ============

    // Liste unique des jeux présents dans les catégories (pour le filtre)
    const availableGames = categories.reduce((acc, cat) => {
        if (cat.game_id && cat.game_name && !acc.find(g => g.id === cat.game_id)) {
            acc.push({ id: cat.game_id, name: cat.game_name, color: cat.game_color })
        }
        return acc
    }, [])

    const filteredCategories = categories.filter(cat => {
        const matchesSearch = !categorySearch || cat.title.toLowerCase().includes(categorySearch.toLowerCase())
        const matchesGame = !categoryGameFilter || String(cat.game_id) === categoryGameFilter
        const matchesType = !categoryTypeFilter || cat.nominee_type === categoryTypeFilter
        return matchesSearch && matchesGame && matchesType
    })

    const totalCategoryPages = Math.ceil(filteredCategories.length / CATEGORIES_PER_PAGE)
    const paginatedCategories = filteredCategories.slice(
        (categoryPage - 1) * CATEGORIES_PER_PAGE,
        categoryPage * CATEGORIES_PER_PAGE
    )

    // Reset page quand les filtres changent
    const handleCategoryFilterChange = (setter) => (value) => {
        setter(value)
        setCategoryPage(1)
    }

    const nomineeTypeLabels = { player: 'Joueurs', image: 'Images', sound: 'Sons', video: 'Vidéo', url: 'URL' }

    const handleEnterReorderMode = () => {
        setReorderCategories([...categories])
        setReorderMode(true)
    }

    const handleCancelReorder = () => {
        setReorderMode(false)
        setReorderCategories([])
        setDraggedIndex(null)
        setDragOverIndex(null)
    }

    const handleSaveReorder = async () => {
        setReorderSaving(true)
        try {
            const categoryIds = reorderCategories.map(c => c.id)
            const response = await fetch(
                `${API_URL}/api/noty/campaigns/${campaignId}/reorder-categories`,
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ category_ids: categoryIds })
                }
            )
            if (!response.ok) throw new Error('Erreur sauvegarde ordre')
            setReorderMode(false)
            setReorderCategories([])
            await fetchCampaignData()
        } catch (err) {
            setError(err.message)
        } finally {
            setReorderSaving(false)
        }
    }

    const handleDragStart = (index) => {
        setDraggedIndex(index)
    }

    const handleDragOver = (e, index) => {
        e.preventDefault()
        if (draggedIndex === null || draggedIndex === index) return
        setDragOverIndex(index)
    }

    const handleDrop = (index) => {
        if (draggedIndex === null || draggedIndex === index) return
        setReorderCategories(prev => {
            const updated = [...prev]
            const [moved] = updated.splice(draggedIndex, 1)
            updated.splice(index, 0, moved)
            return updated
        })
        setDraggedIndex(null)
        setDragOverIndex(null)
    }

    const handleDragEnd = () => {
        setDraggedIndex(null)
        setDragOverIndex(null)
    }

    const renderCategories = () => (
        <div className="c-noty-categories">
            <div className="l-admin-toolbar">
                <h3 className="l-admin-toolbar__title">Catégories de la campagne</h3>
                <div className="l-admin-toolbar__actions">
                    {reorderMode ? (
                        <>
                            <button
                                className="c-admin-button c-admin-button--secondary"
                                onClick={handleCancelReorder}
                                disabled={reorderSaving}
                            >
                                Annuler
                            </button>
                            <button
                                className="c-admin-button c-admin-button--primary"
                                onClick={handleSaveReorder}
                                disabled={reorderSaving}
                            >
                                {reorderSaving ? 'Sauvegarde...' : 'Sauvegarder l\'ordre'}
                            </button>
                        </>
                    ) : (
                        <>
                            {selectedCategoryIds.size > 0 && (
                                <button
                                    className="c-admin-button c-admin-button--danger c-admin-button--sm"
                                    onClick={() => setConfirmBatchDelete(true)}
                                >
                                    🗑️ Supprimer la sélection ({selectedCategoryIds.size})
                                </button>
                            )}
                            {categories.length > 1 && (
                                <button
                                    className="c-admin-button c-admin-button--secondary"
                                    onClick={handleEnterReorderMode}
                                >
                                    ⠿ Réorganiser
                                </button>
                            )}
                            <button
                                className="c-admin-button c-admin-button--secondary"
                                onClick={handleOpenImportModal}
                            >
                                Importer
                            </button>
                            <button
                                className="c-admin-button c-admin-button--primary"
                                onClick={handleCreateCategory}
                            >
                                + Nouvelle catégorie
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className="c-admin-filters">
                <div className="f-field c-admin-filters__search">
                    <label htmlFor="category-search">Rechercher</label>
                    <input
                        id="category-search"
                        type="text"
                        placeholder="Titre de la catégorie..."
                        value={categorySearch}
                        onChange={(e) => handleCategoryFilterChange(setCategorySearch)(e.target.value)}
                    />
                </div>
                <div className="f-field c-admin-filters__filter">
                    <label htmlFor="category-type-filter">Type</label>
                    <select
                        id="category-type-filter"
                        value={categoryTypeFilter}
                        onChange={(e) => handleCategoryFilterChange(setCategoryTypeFilter)(e.target.value)}
                    >
                        <option value="">Tous les types</option>
                        {Object.entries(nomineeTypeLabels).map(([key, label]) => (
                            <option key={key} value={key}>{label}</option>
                        ))}
                    </select>
                </div>
                {availableGames.length > 0 && (
                    <div className="f-field c-admin-filters__filter">
                        <label htmlFor="category-game-filter">Jeu</label>
                        <select
                            id="category-game-filter"
                            value={categoryGameFilter}
                            onChange={(e) => handleCategoryFilterChange(setCategoryGameFilter)(e.target.value)}
                        >
                            <option value="">Tous les jeux</option>
                            {availableGames.map(game => (
                                <option key={game.id} value={game.id}>{game.name}</option>
                            ))}
                        </select>
                    </div>
                )}
                {(categorySearch || categoryTypeFilter || categoryGameFilter) && (
                    <button
                        className="c-admin-button c-admin-button--secondary c-admin-button--sm"
                        style={{ alignSelf: 'flex-end' }}
                        onClick={() => {
                            setCategorySearch('')
                            setCategoryTypeFilter('')
                            setCategoryGameFilter('')
                            setCategoryPage(1)
                        }}
                    >
                        Réinitialiser
                    </button>
                )}
                <div className="c-admin-filters__meta">
                    {filteredCategories.length} / {categories.length} catégories
                </div>
            </div>

            {categories.length === 0 ? (
                <div className="c-admin-state c-admin-state--empty">
                    <p>Aucune catégorie dans cette campagne</p>
                    <button
                        className="c-admin-button c-admin-button--primary"
                        onClick={handleCreateCategory}
                    >
                        Créer la première catégorie
                    </button>
                </div>
            ) : filteredCategories.length === 0 ? (
                <div className="c-admin-state c-admin-state--empty">
                    <p>Aucune catégorie ne correspond à vos filtres.</p>
                </div>
            ) : (
                <>
                    <div className="l-admin-table">
                        <table className="c-admin-table">
                            <thead>
                                <tr>
                                    {reorderMode && <th style={{ width: 40 }}></th>}
                                    {!reorderMode && <th style={{ width: 36 }}></th>}
                                    <th className="c-admin-table__cell--title">Titre</th>
                                    <th>Type</th>
                                    <th>Jeu</th>
                                    <th>Visibilité</th>
                                    {!reorderMode && <th className="c-admin-table__actions">Actions</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {(reorderMode ? reorderCategories : paginatedCategories).map((category, index) => (
                                    <tr
                                        key={category.id}
                                        className={`c-admin-table__row${reorderMode ? ' c-admin-table__row--draggable' : ''}${draggedIndex === index ? ' c-admin-table__row--dragging' : ''}${dragOverIndex === index ? ' c-admin-table__row--drag-over' : ''}`}
                                        draggable={reorderMode}
                                        onDragStart={reorderMode ? () => handleDragStart(index) : undefined}
                                        onDragOver={reorderMode ? (e) => handleDragOver(e, index) : undefined}
                                        onDrop={reorderMode ? () => handleDrop(index) : undefined}
                                        onDragEnd={reorderMode ? handleDragEnd : undefined}
                                    >
                                        {reorderMode && (
                                            <td className="c-admin-table__drag-handle">⠿</td>
                                        )}
                                        {!reorderMode && (
                                            <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedCategoryIds.has(category.id)}
                                                    onChange={(e) => {
                                                        setSelectedCategoryIds(prev => {
                                                            const next = new Set(prev)
                                                            if (e.target.checked) next.add(category.id)
                                                            else next.delete(category.id)
                                                            return next
                                                        })
                                                    }}
                                                    style={{ cursor: 'pointer', width: 16, height: 16 }}
                                                />
                                            </td>
                                        )}
                                        <td className="c-admin-table__cell--title">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                {category.image_url && (
                                                    <img
                                                        src={category.image_url}
                                                        alt=""
                                                        style={{ width: 28, height: 28, borderRadius: 4, objectFit: 'cover' }}
                                                    />
                                                )}
                                                {category.title}
                                            </div>
                                        </td>
                                        <td>{nomineeTypeLabels[category.nominee_type] || category.nominee_type}</td>
                                        <td>
                                            {category.game_name ? (
                                                <span className="c-admin-chip" style={category.game_color ? { borderColor: category.game_color, color: category.game_color } : undefined}>
                                                    {category.game_name}
                                                </span>
                                            ) : (
                                                <span className="c-admin-chip">Global</span>
                                            )}
                                        </td>
                                        <td>{category.visible_by_nyxar ? 'Publique' : 'Nyxar'}</td>
                                        {!reorderMode && (
                                            <td className="c-admin-table__actions">
                                                <button
                                                    className="c-admin-button c-admin-button--sm c-admin-button--warning"
                                                    onClick={() => handleEditCategory(category.id)}
                                                    title="Modifier"
                                                >
                                                    ✏️ Modifier
                                                </button>
                                                <button
                                                    className="c-admin-button c-admin-button--sm c-admin-button--danger"
                                                    onClick={() => setConfirmDeleteCategory(category)}
                                                    title="Supprimer"
                                                >
                                                    🗑️ Supprimer
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {!reorderMode && totalCategoryPages > 1 && (
                        <div className="c-pagination">
                            <button
                                className="c-pagination__btn"
                                onClick={() => setCategoryPage(p => p - 1)}
                                disabled={categoryPage === 1}
                            >
                                &larr; Précédent
                            </button>
                            <div className="c-pagination__pages">
                                {Array.from({ length: totalCategoryPages }, (_, i) => i + 1).map(page => (
                                    <button
                                        key={page}
                                        className={`c-pagination__page${page === categoryPage ? ' c-pagination__page--active' : ''}`}
                                        onClick={() => setCategoryPage(page)}
                                    >
                                        {page}
                                    </button>
                                ))}
                            </div>
                            <button
                                className="c-pagination__btn"
                                onClick={() => setCategoryPage(p => p + 1)}
                                disabled={categoryPage === totalCategoryPages}
                            >
                                Suivant &rarr;
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* Modal erreur téléchargement ZIP */}
            {zipErrorModal && (
                <div className="c-modal-overlay c-modal-overlay--nested" onClick={(e) => { e.stopPropagation(); setZipErrorModal(false); }}>
                    <div className="c-modal-panel" onClick={e => e.stopPropagation()}>
                        <div className="c-modal-panel__header">
                            <h2 className="c-modal-panel__title">Archive introuvable</h2>
                            <button className="c-modal-panel__close" onClick={() => setZipErrorModal(false)}>✕</button>
                        </div>
                        <div className="c-modal-panel__body">
                            <p>Les cartes doivent être générées avant de pouvoir être téléchargées. Cliquez sur <strong>Regénérer cartes</strong> puis réessayez.</p>
                        </div>
                        <div className="c-modal-panel__footer">
                            <button className="c-admin-button c-admin-button--primary" onClick={() => setZipErrorModal(false)}>
                                Compris
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de confirmation de regénération des cartes */}
            {confirmRegenerateCards && (
                <div className="c-modal-overlay c-modal-overlay--nested" onClick={(e) => { e.stopPropagation(); setConfirmRegenerateCards(false); }}>
                    <div className="c-modal-panel" onClick={e => e.stopPropagation()}>
                        <div className="c-modal-panel__header">
                            <h2 className="c-modal-panel__title">Regénérer les cartes</h2>
                            <button className="c-modal-panel__close" onClick={() => setConfirmRegenerateCards(false)}>✕</button>
                        </div>
                        <div className="c-modal-panel__body">
                            <div className="c-admin-alert c-admin-alert--warning">
                                Les cartes existantes seront remplacées par les nouvelles.
                            </div>
                            <p>Confirmez-vous la regénération de toutes les cartes de cette campagne ?</p>
                        </div>
                        <div className="c-modal-panel__footer">
                            <button
                                className="c-admin-button c-admin-button--secondary"
                                onClick={() => setConfirmRegenerateCards(false)}
                            >
                                Annuler
                            </button>
                            <button
                                className="c-admin-button c-admin-button--warning"
                                disabled={generatingCards}
                                onClick={async () => {
                                    setConfirmRegenerateCards(false)
                                    setGeneratingCards(true)
                                    try {
                                        const res = await fetch(`${API_URL}/api/noty/campaigns/${campaignId}/generate-cards`, {
                                            method: 'POST',
                                            headers: { 'Authorization': `Bearer ${token}` }
                                        })
                                        if (!res.ok) throw new Error('Erreur lors de la regénération des cartes')
                                        const data = await res.json()
                                        setCardsGenerated(data)
                                    } catch (err) {
                                        setError(err.message)
                                    } finally {
                                        setGeneratingCards(false)
                                    }
                                }}
                            >
                                Regénérer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de confirmation de suppression */}
            {confirmDeleteCategory && (
                <div className="c-modal-overlay c-modal-overlay--nested" onClick={(e) => { e.stopPropagation(); setConfirmDeleteCategory(null); }}>
                    <div className="c-modal-panel" onClick={e => e.stopPropagation()}>
                        <div className="c-modal-panel__header">
                            <h2 className="c-modal-panel__title">Supprimer la catégorie</h2>
                            <button className="c-modal-panel__close" onClick={() => setConfirmDeleteCategory(null)}>✕</button>
                        </div>
                        <div className="c-modal-panel__body">
                            <div className="c-admin-alert c-admin-alert--warning">
                                Cette action supprimera également tous les nominés et votes associés.
                            </div>
                            <p>Confirmez-vous la suppression de <strong>{confirmDeleteCategory.title}</strong> ?</p>
                        </div>
                        <div className="c-modal-panel__footer">
                            <button
                                className="c-admin-button c-admin-button--secondary"
                                onClick={() => setConfirmDeleteCategory(null)}
                            >
                                Annuler
                            </button>
                            <button
                                className="c-admin-button c-admin-button--danger"
                                onClick={() => handleDeleteCategory(confirmDeleteCategory.id)}
                            >
                                Supprimer
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Modal de confirmation de suppression en lot */}
            {confirmBatchDelete && (
                <div className="c-modal-overlay c-modal-overlay--nested" onClick={(e) => { e.stopPropagation(); setConfirmBatchDelete(false); }}>
                    <div className="c-modal-panel" onClick={e => e.stopPropagation()}>
                        <div className="c-modal-panel__header">
                            <h2 className="c-modal-panel__title">Supprimer la sélection</h2>
                            <button className="c-modal-panel__close" onClick={() => setConfirmBatchDelete(false)}>✕</button>
                        </div>
                        <div className="c-modal-panel__body">
                            <div className="c-admin-alert c-admin-alert--warning">
                                Cette action supprimera également tous les nominés et votes associés.
                            </div>
                            <p>Supprimer <strong>{selectedCategoryIds.size}</strong> catégorie(s) ? Cette action est irréversible.</p>
                        </div>
                        <div className="c-modal-panel__footer">
                            <button
                                className="c-admin-button c-admin-button--secondary"
                                onClick={() => setConfirmBatchDelete(false)}
                            >
                                Annuler
                            </button>
                            <button
                                className="c-admin-button c-admin-button--danger"
                                onClick={handleBatchDeleteCategories}
                            >
                                Supprimer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )

    // ============ RENDER RESULTS (KANBAN) ============
    const renderResults = () => (
        <VotingResults isAdmin={true} campaignId={campaignId} tokenProp={token} />
    )

    return (
        <div className="c-modal-overlay" onClick={onClose}>
            <div className="c-modal-panel c-modal-panel--xl" onClick={e => e.stopPropagation()}>
                <div className="c-modal-panel__header">
                    <div className="c-modal-panel__header-content">
                        {campaign && (
                            <>
                                <h2 className="c-modal-panel__title">{campaign.title}</h2>
                                <div className="c-modal-panel__meta">
                                    <div className="c-admin-chip-list">
                                        <span className={`c-status-badge c-status-badge--${getStatus(campaign).variant}`}>
                                            <span className="c-status-badge__dot"></span>
                                            {getStatus(campaign).label}
                                        </span>
                                        <span className="c-admin-chip c-admin-chip--accent">
                                            Du {new Date(campaign.start_date).toLocaleDateString('fr-FR')} au {new Date(campaign.end_date).toLocaleDateString('fr-FR')}
                                        </span>
                                        <button
                                            className="c-admin-button c-admin-button--sm c-admin-button--secondary"
                                            onClick={async () => {
                                                try {
                                                    const res = await fetch(`${API_URL}/api/noty/campaigns/${campaignId}/export-csv`, {
                                                        headers: { 'Authorization': `Bearer ${token}` }
                                                    })
                                                    if (!res.ok) throw new Error('Erreur export')
                                                    const blob = await res.blob()
                                                    const disposition = res.headers.get('Content-Disposition') || ''
                                                    const match = disposition.match(/filename="(.+)"/)
                                                    const filename = match ? match[1] : 'noty-results.csv'
                                                    const url = URL.createObjectURL(blob)
                                                    const a = document.createElement('a')
                                                    a.href = url
                                                    a.download = filename
                                                    a.click()
                                                    URL.revokeObjectURL(url)
                                                } catch (err) {
                                                    setError(err.message)
                                                }
                                            }}
                                            title="Exporter les résultats en CSV"
                                        >
                                            📥 Exporter CSV
                                        </button>
                                        <button
                                            className={`c-admin-button c-admin-button--sm ${campaign.is_paused ? 'c-admin-button--primary' : 'c-admin-button--warning'}`}
                                            disabled={togglingPause}
                                            onClick={async () => {
                                                setTogglingPause(true)
                                                try {
                                                    const res = await fetch(`${API_URL}/api/noty/campaigns/${campaignId}/toggle-pause`, {
                                                        method: 'PATCH',
                                                        headers: { 'Authorization': `Bearer ${token}` }
                                                    })
                                                    if (!res.ok) throw new Error('Erreur lors du changement d\'état')
                                                    const data = await res.json()
                                                    setCampaign(prev => ({ ...prev, is_paused: data.is_paused }))
                                                } catch (err) {
                                                    setError(err.message)
                                                } finally {
                                                    setTogglingPause(false)
                                                }
                                            }}
                                            title={campaign.is_paused ? 'Reprendre les votes' : 'Mettre en pause les votes'}
                                        >
                                            {togglingPause ? '⏳ ...' : campaign.is_paused ? '▶️ Reprendre les votes' : '⏸️ Mettre en pause'}
                                        </button>
                                        <button
                                            className="c-admin-button c-admin-button--sm c-admin-button--secondary"
                                            disabled={exportingVoters}
                                            onClick={async () => {
                                                setExportingVoters(true)
                                                try {
                                                    const res = await fetch(`${API_URL}/api/noty/campaigns/${campaignId}/voters-export`, {
                                                        headers: { 'Authorization': `Bearer ${token}` }
                                                    })
                                                    if (!res.ok) throw new Error('Erreur export votants')
                                                    const blob = await res.blob()
                                                    const disposition = res.headers.get('Content-Disposition') || ''
                                                    const match = disposition.match(/filename="(.+)"/)
                                                    const filename = match ? match[1] : 'noty-voters.csv'
                                                    const url = URL.createObjectURL(blob)
                                                    const a = document.createElement('a')
                                                    a.href = url
                                                    a.download = filename
                                                    a.click()
                                                    URL.revokeObjectURL(url)
                                                } catch (err) {
                                                    setError(err.message)
                                                } finally {
                                                    setExportingVoters(false)
                                                }
                                            }}
                                            title="Exporter la liste des votants en CSV"
                                        >
                                            {exportingVoters ? '⏳ Export...' : '👥 Exporter votants'}
                                        </button>
                                        {!cardsGenerated ? (
                                            <button
                                                className="c-admin-button c-admin-button--sm c-admin-button--secondary"
                                                disabled={generatingCards}
                                                onClick={async () => {
                                                    setGeneratingCards(true)
                                                    try {
                                                        const res = await fetch(`${API_URL}/api/noty/campaigns/${campaignId}/generate-cards`, {
                                                            method: 'POST',
                                                            headers: { 'Authorization': `Bearer ${token}` }
                                                        })
                                                        if (!res.ok) throw new Error('Erreur génération des cartes')
                                                        const data = await res.json()
                                                        setCardsGenerated(data)
                                                    } catch (err) {
                                                        setError(err.message)
                                                    } finally {
                                                        setGeneratingCards(false)
                                                    }
                                                }}
                                                title="Générer les images partageables pour chaque catégorie"
                                            >
                                                {generatingCards ? '⏳ Génération...' : '🖼️ Générer cartes'}
                                            </button>
                                        ) : (
                                            <button
                                                className="c-admin-button c-admin-button--sm c-admin-button--warning"
                                                disabled={generatingCards}
                                                onClick={() => setConfirmRegenerateCards(true)}
                                                title="Regénérer les images (remplace les cartes existantes)"
                                            >
                                                {generatingCards ? '⏳ Génération...' : '🔄 Regénérer cartes'}
                                            </button>
                                        )}
                                        {cardsGenerated && (
                                            <button
                                                className="c-admin-button c-admin-button--sm c-admin-button--primary"
                                                onClick={async () => {
                                                    try {
                                                        const res = await fetch(`${API_URL}/api/noty/campaigns/${campaignId}/cards/all.zip`)
                                                        if (!res.ok) { setZipErrorModal(true); return }
                                                        const blob = await res.blob()
                                                        const url = URL.createObjectURL(blob)
                                                        const a = document.createElement('a')
                                                        a.href = url
                                                        a.download = `noty-cards-campagne-${campaignId}.zip`
                                                        a.click()
                                                        URL.revokeObjectURL(url)
                                                    } catch { setZipErrorModal(true) }
                                                }}
                                            >
                                                📦 Télécharger ZIP ({cardsGenerated.generated} cartes)
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                    <button className="c-modal-panel__close" onClick={onClose}>✕</button>
                </div>

                {error && <div className="c-admin-alert c-admin-alert--error u-margin-lg">{error}</div>}

                {loading ? (
                    <div className="c-admin-state loading u-padding-xl">Chargement des données...</div>
                ) : (
                    <>
                        <div className="c-modal-tabs">
                            <button
                                onClick={() => setActiveTab('dashboard')}
                                className={`c-modal-tabs__button ${activeTab === 'dashboard' ? 'is-active' : ''}`}
                            >
                                📊 Dashboard
                            </button>
                            <button
                                onClick={() => setActiveTab('categories')}
                                className={`c-modal-tabs__button ${activeTab === 'categories' ? 'is-active' : ''}`}
                            >
                                🗂️ Catégories ({categories.length})
                            </button>
                            <button
                                onClick={() => setActiveTab('results')}
                                className={`c-modal-tabs__button ${activeTab === 'results' ? 'is-active' : ''}`}
                            >
                                🏆 Résultats
                            </button>
                            <button
                                onClick={() => {
                                    setActiveTab('historique')
                                    if (auditLog.length === 0) fetchAuditLog()
                                }}
                                className={`c-modal-tabs__button ${activeTab === 'historique' ? 'is-active' : ''}`}
                            >
                                🕑 Historique
                            </button>
                        </div>

                        <div className="c-modal-panel__body c-modal-panel__body--scroll">
                            {activeTab === 'dashboard' && (
                                <NotyDashboard campaignId={campaignId} token={token} />
                            )}
                            {activeTab === 'categories' && renderCategories()}
                            {activeTab === 'results' && renderResults()}
                            {activeTab === 'historique' && (
                                <div className="c-audit-log">
                                    {auditLoading ? (
                                        <div className="c-admin-state loading">Chargement de l'historique...</div>
                                    ) : auditLog.length === 0 ? (
                                        <div className="c-admin-state c-admin-state--empty">Aucune entrée dans l'historique.</div>
                                    ) : (
                                        <table className="c-audit-log__table">
                                            <thead>
                                                <tr>
                                                    <th>Date</th>
                                                    <th>Admin</th>
                                                    <th>Action</th>
                                                    <th>Cible</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {auditLog.map(entry => (
                                                    <tr key={entry.id}>
                                                        <td className="c-audit-log__date">
                                                            {new Date(entry.created_at).toLocaleString('fr-FR', {
                                                                day: '2-digit', month: '2-digit', year: 'numeric',
                                                                hour: '2-digit', minute: '2-digit'
                                                            })}
                                                        </td>
                                                        <td className="c-audit-log__admin">{entry.admin_username}</td>
                                                        <td className="c-audit-log__action">{formatAction(entry.action)}</td>
                                                        <td className="c-audit-log__target">
                                                            {entry.target_type}{entry.target_id ? ` #${entry.target_id}` : ''}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* Modal Formulaire Catégorie */}
            {showCategoryModal && (
                <div className="c-modal-overlay c-modal-overlay--nested" onClick={(e) => { e.stopPropagation(); handleCloseCategoryModal(); }}>
                    <div className="c-modal-panel c-modal-panel--lg" onClick={e => e.stopPropagation()}>
                        <div className="c-modal-panel__header">
                            <div className="c-modal-panel__header-content">
                                <h2 className="c-modal-panel__title">
                                    {editingCategoryId ? '✏️ Modifier la catégorie' : '➕ Nouvelle catégorie'}
                                </h2>
                            </div>
                            <button className="c-modal-panel__close" onClick={handleCloseCategoryModal}>✕</button>
                        </div>

                        <div className="c-modal-panel__body c-modal-panel__body--scroll">
                            {formError && <div className="c-admin-alert c-admin-alert--error">{formError}</div>}
                            {formSuccess && <div className="c-admin-alert c-admin-alert--success">{formSuccess}</div>}

                            <div className="c-category-form">
                                {/* Section Image + Infos */}
                                <div className="c-category-form__main">
                                    <div className="c-category-form__image-section">
                                        <label htmlFor="category-image" className="c-category-form__image-upload">
                                            {categoryFormData.image_url ? (
                                                <img src={categoryFormData.image_url} alt="Aperçu" className="c-category-form__image-preview" />
                                            ) : (
                                                <span className="c-category-form__image-placeholder">📷 Ajouter une image</span>
                                            )}
                                        </label>
                                        <input
                                            id="category-image"
                                            type="file"
                                            accept="image/*"
                                            onChange={handleCategoryImageChange}
                                            disabled={false}
                                            style={{ display: 'none' }}
                                        />
                                    </div>

                                    <div className="c-category-form__fields">
                                        <div className="f-field">
                                            <label htmlFor="category-title">Titre *</label>
                                            <input
                                                id="category-title"
                                                type="text"
                                                placeholder="Titre de la catégorie"
                                                value={categoryFormData.title}
                                                onChange={(e) => setCategoryFormData({ ...categoryFormData, title: e.target.value })}
                                                required
                                            />
                                        </div>

                                        <div className="f-field">
                                            <label htmlFor="category-nominee-type">Type de nominés</label>
                                            <select
                                                id="category-nominee-type"
                                                value={categoryFormData.nominee_type}
                                                onChange={(e) => {
                                                    const hasNominees = tempNominees.length > 0 || customNominees.length > 0
                                                    if (hasNominees && !confirm('Changer le type de nominés va vider la liste actuelle. Continuer ?')) return
                                                    if (hasNominees) {
                                                        setTempNominees([])
                                                        setCustomNominees([])
                                                    }
                                                    setCategoryFormData({ ...categoryFormData, nominee_type: e.target.value, game_id: '' })
                                                }}
                                            >
                                                <option value="player">Joueurs</option>
                                                <option value="image">Images</option>
                                                <option value="sound">Sons</option>
                                                <option value="video">Vidéo (upload)</option>
                                                <option value="url">URL (YouTube, Twitch...)</option>
                                            </select>
                                        </div>

                                        {categoryFormData.nominee_type === 'player' && (
                                            <div className="f-field">
                                                <label htmlFor="category-game">Jeu (optionnel)</label>
                                                <select
                                                    id="category-game"
                                                    value={categoryFormData.game_id}
                                                    onChange={(e) => setCategoryFormData({ ...categoryFormData, game_id: e.target.value })}
                                                >
                                                    <option value="">Catégorie globale</option>
                                                    {games.map(game => (
                                                        <option key={game.id} value={game.id}>{game.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}

                                        <div className="f-field">
                                            <label htmlFor="category-description">Description</label>
                                            <textarea
                                                id="category-description"
                                                placeholder="Description de la catégorie"
                                                value={categoryFormData.description}
                                                onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
                                                rows={2}
                                            />
                                        </div>

                                        <div className="f-field">
                                            <label className="c-form-checkbox">
                                                <input
                                                    className="c-form-checkbox__input"
                                                    type="checkbox"
                                                    checked={categoryFormData.visible_by_nyxar === 1}
                                                    onChange={(e) => setCategoryFormData({ ...categoryFormData, visible_by_nyxar: e.target.checked ? 1 : 0 })}
                                                />
                                                <span>Visible à tout le monde</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                {/* Section Nominés */}
                                <div className="c-category-form__nominees-section">
                                    {categoryFormData.nominee_type === 'player' ? (
                                        <>
                                            <h4>Nominés ({tempNominees.length + customNominees.length}/6)</h4>
                                            <div className="c-category-form__players-grid">
                                                {getFilteredPlayers().map(player => (
                                                    <button
                                                        key={player.id}
                                                        type="button"
                                                        className={`c-category-form__player-btn${tempNominees.includes(player.id) ? ' is-selected' : ''}`}
                                                        onClick={() => handleAddTempNominee(player.id)}
                                                        disabled={tempNominees.includes(player.id) || (tempNominees.length + customNominees.length) >= 6}
                                                        title={player.first_name ? `${player.pseudo} (${player.first_name} ${player.last_name})` : player.pseudo}
                                                    >
                                                        {player.image_url && (
                                                            <img src={player.image_url} alt={player.pseudo} className="c-category-form__player-avatar" />
                                                        )}
                                                        <span className="c-category-form__player-name">{player.pseudo}</span>
                                                    </button>
                                                ))}
                                            </div>
                                            {tempNominees.length > 0 && (
                                                <div className="c-category-form__selected">
                                                    <h5>Joueurs sélectionnés</h5>
                                                    <div className="c-category-form__selected-list">
                                                        {tempNominees.map((playerId, index) => {
                                                            const player = allPlayers.find(p => p.id === playerId)
                                                            return player ? (
                                                                <div key={playerId} className="c-category-form__selected-item">
                                                                    <span className="c-category-form__selected-rank">{index + 1}</span>
                                                                    {player.image_url && (
                                                                        <img src={player.image_url} alt={player.pseudo} className="c-category-form__selected-avatar" />
                                                                    )}
                                                                    <span className="c-category-form__selected-name">{player.pseudo}</span>
                                                                    <button type="button" className="c-category-form__selected-remove" onClick={() => handleRemoveTempNominee(playerId)}>✕</button>
                                                                </div>
                                                            ) : null
                                                        })}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Personnes externes */}
                                            <h5 style={{ marginTop: 'var(--spacing-md)' }}>Personnes externes ({customNominees.length})</h5>
                                            <div
                                                className={`c-category-form__nominees-grid c-category-form__nominees-grid--image${draggingNominee ? ' is-dragging-over' : ''}`}
                                                onDragOver={(e) => { e.preventDefault(); setDraggingNominee(true) }}
                                                onDragEnter={(e) => { e.preventDefault(); setDraggingNominee(true) }}
                                                onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDraggingNominee(false) }}
                                                onDrop={handleNomineeDrop}
                                            >
                                                {/* Carte d'ajout */}
                                                {addingNominee ? (
                                                    <div className="c-category-form__nominee-card c-category-form__nominee-card--add c-category-form__nominee-card--image">
                                                        <button type="button" className="c-category-form__nominee-remove" onClick={() => { setAddingNominee(false); setNewNomineeTitle(''); setNewNomineeUrl('') }}>✕</button>
                                                        <div className="c-category-form__add-form">
                                                            <input
                                                                type="text"
                                                                placeholder="Pseudo"
                                                                value={newNomineeTitle}
                                                                onChange={(e) => setNewNomineeTitle(e.target.value)}
                                                                className="c-category-form__add-input"
                                                            />
                                                            {newNomineeUrl && <p className="c-category-form__add-file">{newNomineeUrl.split('/').pop()}</p>}
                                                            <label className="c-category-form__add-file-btn">
                                                                {nomineeUploading ? 'Upload...' : newNomineeUrl ? 'Changer' : 'Photo de profil'}
                                                                <input
                                                                    type="file"
                                                                    accept="image/*"
                                                                    onChange={handleNomineeFileUpload}
                                                                    disabled={nomineeUploading}
                                                                    hidden
                                                                />
                                                            </label>
                                                            <button
                                                                type="button"
                                                                className="c-category-form__add-confirm"
                                                                onClick={handleAddCustomNominee}
                                                                disabled={!newNomineeTitle.trim() || !newNomineeUrl.trim() || nomineeUploading || (tempNominees.length + customNominees.length) >= 6}
                                                            >
                                                                Ajouter
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        className="c-category-form__nominee-card c-category-form__nominee-placeholder c-category-form__nominee-placeholder--image"
                                                        onClick={() => setAddingNominee(true)}
                                                        disabled={(tempNominees.length + customNominees.length) >= 6}
                                                    >
                                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="32" height="32">
                                                            <line x1="12" y1="5" x2="12" y2="19" />
                                                            <line x1="5" y1="12" x2="19" y2="12" />
                                                        </svg>
                                                        <span>Ajouter une personne</span>
                                                    </button>
                                                )}

                                                {customNominees.map((nominee, index) => (
                                                    <div key={`custom-${index}`} className="c-category-form__nominee-card c-category-form__nominee-card--image">
                                                        <button type="button" className="c-category-form__nominee-remove" onClick={() => handleRemoveCustomNominee(index)}>✕</button>
                                                        {nominee.media_url && (
                                                            <div className="c-category-form__nominee-media">
                                                                <img src={nominee.media_url} alt={nominee.title} />
                                                            </div>
                                                        )}
                                                        <span className="c-category-form__nominee-title">{nominee.title}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <h4>Nominés custom ({customNominees.length})</h4>

                                            <div
                                                className={`c-category-form__nominees-grid c-category-form__nominees-grid--${categoryFormData.nominee_type}${draggingNominee ? ' is-dragging-over' : ''}`}
                                                onDragOver={(e) => { e.preventDefault(); setDraggingNominee(true) }}
                                                onDragEnter={(e) => { e.preventDefault(); setDraggingNominee(true) }}
                                                onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDraggingNominee(false) }}
                                                onDrop={handleNomineeDrop}
                                            >
                                                {/* Carte d'ajout en premier */}
                                                {addingNominee ? (
                                                    <div className={`c-category-form__nominee-card c-category-form__nominee-card--add c-category-form__nominee-card--${categoryFormData.nominee_type}`}>
                                                        <button type="button" className="c-category-form__nominee-remove" onClick={() => { setAddingNominee(false); setNewNomineeTitle(''); setNewNomineeUrl(''); setNewNomineeWaveform(null) }}>✕</button>
                                                        <div className="c-category-form__add-form">
                                                            <input
                                                                type="text"
                                                                placeholder="Titre du nominé"
                                                                value={newNomineeTitle}
                                                                onChange={(e) => setNewNomineeTitle(e.target.value)}
                                                                className="c-category-form__add-input"
                                                            />
                                                            {categoryFormData.nominee_type === 'url' ? (
                                                                <input
                                                                    type="url"
                                                                    placeholder="https://..."
                                                                    value={newNomineeUrl}
                                                                    onChange={(e) => setNewNomineeUrl(e.target.value)}
                                                                    className="c-category-form__add-input"
                                                                />
                                                            ) : categoryFormData.nominee_type === 'video' ? (
                                                                <>
                                                                    <input
                                                                        type="url"
                                                                        placeholder="URL YouTube / Twitch..."
                                                                        value={newNomineeUrl.startsWith('/uploads/') ? '' : newNomineeUrl}
                                                                        onChange={(e) => setNewNomineeUrl(e.target.value)}
                                                                        className="c-category-form__add-input"
                                                                    />
                                                                    {newNomineeUrl && !newNomineeUrl.startsWith('/uploads/') && (detectPlatform(newNomineeUrl) === 'youtube' || detectPlatform(newNomineeUrl) === 'twitch') && (
                                                                        <div className="c-category-form__add-preview">
                                                                            {detectPlatform(newNomineeUrl) === 'youtube' ? (
                                                                                <iframe
                                                                                    src={`https://www.youtube.com/embed/${extractYouTubeId(newNomineeUrl)}`}
                                                                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                                                    allowFullScreen
                                                                                />
                                                                            ) : (
                                                                                <iframe
                                                                                    src={`https://clips.twitch.tv/embed?clip=${extractTwitchClipSlug(newNomineeUrl)}&parent=${window.location.hostname}`}
                                                                                    allowFullScreen
                                                                                />
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                    <span className="c-category-form__add-separator">ou</span>
                                                                    {newNomineeUrl.startsWith('/uploads/') && <p className="c-category-form__add-file">{newNomineeUrl.split('/').pop()}</p>}
                                                                    <label className="c-category-form__add-file-btn">
                                                                        {nomineeUploading ? 'Upload...' : newNomineeUrl.startsWith('/uploads/') ? 'Changer' : 'Fichier local'}
                                                                        <input
                                                                            type="file"
                                                                            accept="video/*"
                                                                            onChange={handleNomineeFileUpload}
                                                                            disabled={nomineeUploading}
                                                                            hidden
                                                                        />
                                                                    </label>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    {newNomineeUrl && <p className="c-category-form__add-file">{newNomineeUrl.split('/').pop()}</p>}
                                                                    <label className="c-category-form__add-file-btn">
                                                                        {nomineeUploading ? 'Upload...' : newNomineeUrl ? 'Changer' : 'Choisir un fichier'}
                                                                        <input
                                                                            type="file"
                                                                            accept={categoryFormData.nominee_type === 'sound' ? 'audio/*' : 'image/*'}
                                                                            onChange={handleNomineeFileUpload}
                                                                            disabled={nomineeUploading}
                                                                            hidden
                                                                        />
                                                                    </label>
                                                                </>
                                                            )}
                                                            <button
                                                                type="button"
                                                                className="c-category-form__add-confirm"
                                                                onClick={handleAddCustomNominee}
                                                                disabled={!newNomineeTitle.trim() || !newNomineeUrl.trim() || nomineeUploading}
                                                            >
                                                                Ajouter
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        className={`c-category-form__nominee-card c-category-form__nominee-placeholder c-category-form__nominee-placeholder--${categoryFormData.nominee_type}`}
                                                        onClick={() => setAddingNominee(true)}
                                                    >
                                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="32" height="32">
                                                            <line x1="12" y1="5" x2="12" y2="19" />
                                                            <line x1="5" y1="12" x2="19" y2="12" />
                                                        </svg>
                                                        <span>Ajouter un nominé</span>
                                                    </button>
                                                )}

                                                {customNominees.map((nominee, index) => (
                                                    <div key={index} className={`c-category-form__nominee-card c-category-form__nominee-card--${categoryFormData.nominee_type}`}>
                                                        <button type="button" className="c-category-form__nominee-remove" onClick={() => handleRemoveCustomNominee(index)}>✕</button>
                                                        {categoryFormData.nominee_type === 'image' && nominee.media_url && (
                                                            <div className="c-category-form__nominee-media">
                                                                <img src={nominee.media_url} alt={nominee.title} />
                                                            </div>
                                                        )}
                                                        {categoryFormData.nominee_type === 'video' && nominee.media_url && (
                                                            <div className="c-category-form__nominee-media c-category-form__nominee-media--video">
                                                                {detectPlatform(nominee.media_url) === 'twitch' ? (
                                                                    <iframe
                                                                        src={`https://clips.twitch.tv/embed?clip=${extractTwitchClipSlug(nominee.media_url)}&parent=${window.location.hostname}`}
                                                                        allowFullScreen
                                                                    />
                                                                ) : detectPlatform(nominee.media_url) === 'youtube' ? (
                                                                    <iframe
                                                                        src={`https://www.youtube.com/embed/${extractYouTubeId(nominee.media_url)}`}
                                                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                                        allowFullScreen
                                                                    />
                                                                ) : (
                                                                    <video src={nominee.media_url} preload="metadata" controls onClick={(e) => e.stopPropagation()} />
                                                                )}
                                                            </div>
                                                        )}
                                                        <span className="c-category-form__nominee-title">{nominee.title}</span>
                                                        {categoryFormData.nominee_type === 'sound' && nominee.media_url && (
                                                            <SoundWavePlayer src={nominee.media_url} name={nominee.title} waveform={nominee.waveform_data} />
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="c-modal-panel__footer">
                            <button
                                className="c-admin-button c-admin-button--secondary"
                                onClick={handleCloseCategoryModal}
                                disabled={categorySubmitting}
                            >
                                Annuler
                            </button>
                            {!editingCategoryId && (
                                <button
                                    className="c-admin-button c-admin-button--outline"
                                    onClick={() => handleSubmitCategory(true)}
                                    disabled={categorySubmitting}
                                >
                                    {categorySubmitting ? 'Création...' : '+ Créer et continuer'}
                                </button>
                            )}
                            <button
                                className="c-admin-button c-admin-button--primary"
                                onClick={() => handleSubmitCategory(false)}
                                disabled={categorySubmitting}
                            >
                                {categorySubmitting ? 'Sauvegarde...' : (editingCategoryId ? '✓ Sauvegarder' : '✓ Créer')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Import Catégories */}
            {showImportModal && (
                <div className="c-modal-overlay c-modal-overlay--nested" onClick={(e) => { e.stopPropagation(); setShowImportModal(false); }}>
                    <div className="c-modal-panel c-modal-panel--lg" onClick={e => e.stopPropagation()}>
                        <div className="c-modal-panel__header">
                            <div className="c-modal-panel__header-content">
                                <h2 className="c-modal-panel__title">Importer des catégories</h2>
                            </div>
                            <button className="c-modal-panel__close" onClick={() => setShowImportModal(false)}>✕</button>
                        </div>

                        <div className="c-modal-panel__body c-modal-panel__body--scroll">
                            {importError && <div className="c-admin-alert c-admin-alert--error">{importError}</div>}

                            {importLoading && importableCategories.length === 0 ? (
                                <div className="c-admin-state loading">Chargement...</div>
                            ) : importableCategories.length === 0 ? (
                                <div className="c-admin-state c-admin-state--empty">
                                    <p>Aucune catégorie disponible pour l'import.</p>
                                    <p>Toutes les catégories existantes sont déjà liées à cette campagne.</p>
                                </div>
                            ) : (
                                <>
                                    <div className="c-admin-filters__meta" style={{ marginBottom: '0.75rem' }}>
                                        {selectedImportIds.size} / {importableCategories.length} sélectionnée(s)
                                    </div>

                                    <div className="l-admin-table">
                                        <table className="c-admin-table">
                                            <thead>
                                                <tr>
                                                    <th style={{ width: 40, textAlign: 'center' }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedImportIds.size === importableCategories.length}
                                                            onChange={handleSelectAllImport}
                                                            title={selectedImportIds.size === importableCategories.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                                                        />
                                                    </th>
                                                    <th className="c-admin-table__cell--title">Titre</th>
                                                    <th>Type</th>
                                                    <th>Campagne d'origine</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {importableCategories.map(cat => (
                                                    <tr
                                                        key={cat.id}
                                                        className={`c-admin-table__row${selectedImportIds.has(cat.id) ? ' is-selected' : ''}`}
                                                        onClick={() => handleToggleImportId(cat.id)}
                                                        style={{ cursor: 'pointer' }}
                                                    >
                                                        <td style={{ textAlign: 'center' }}>
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedImportIds.has(cat.id)}
                                                                onChange={() => handleToggleImportId(cat.id)}
                                                                onClick={e => e.stopPropagation()}
                                                            />
                                                        </td>
                                                        <td className="c-admin-table__cell--title">
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                {cat.image_url && (
                                                                    <img
                                                                        src={cat.image_url}
                                                                        alt=""
                                                                        style={{ width: 28, height: 28, borderRadius: 4, objectFit: 'cover' }}
                                                                    />
                                                                )}
                                                                {cat.title}
                                                            </div>
                                                        </td>
                                                        <td>{nomineeTypeLabels[cat.nominee_type] || cat.nominee_type}</td>
                                                        <td>{cat.origin_campaign || '—'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="c-modal-panel__footer">
                            <div className="c-form-actions">
                                <button
                                    className="c-admin-button c-admin-button--secondary"
                                    onClick={() => setShowImportModal(false)}
                                >
                                    Annuler
                                </button>
                                <button
                                    className="c-admin-button c-admin-button--primary"
                                    onClick={handleImportCategories}
                                    disabled={selectedImportIds.size === 0 || importLoading}
                                >
                                    {importLoading ? 'Import en cours...' : `Importer (${selectedImportIds.size})`}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {lightboxImg && (
                <div
                    className="c-noty-lightbox"
                    onClick={() => setLightboxImg(null)}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Aperçu de la carte"
                >
                    <button
                        className="c-noty-lightbox__close"
                        onClick={() => setLightboxImg(null)}
                        aria-label="Fermer"
                    >
                        ✕
                    </button>
                    <img
                        src={lightboxImg}
                        alt="Aperçu carte"
                        className="c-noty-lightbox__img"
                        onClick={e => e.stopPropagation()}
                    />
                </div>
            )}
        </div>
    )
})

export default CampaignDetailsModal
