import { useState, useCallback, useContext, useMemo } from 'react'
import { AuthContext } from '../context/AuthContext'
import { API_URL } from '../services/api'

/**
 * Hook pour gérer les opérations CRUD admin
 * @param {string} apiEndpoint - Endpoint de l'API (ex: '/api/sponsors')
 * @param {Object} options - Options de configuration
 * @param {Object} options.emptyItem - Objet vide pour les nouveaux items
 * @param {Function} options.transformResponse - Fonction pour transformer la réponse API
 * @param {Function} options.filterFn - Fonction de filtre personnalisée
 */
export default function useAdminCRUD(apiEndpoint, options = {}) {
    const { token } = useContext(AuthContext)
    const {
        emptyItem = {},
        transformResponse = (data) => data,
        filterFn = null,
        fetchEndpoint = apiEndpoint
    } = options

    // États principaux
    const [items, setItems] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [searchQuery, setSearchQuery] = useState('')

    // États d'édition
    const [editingId, setEditingId] = useState(null)
    const [editData, setEditData] = useState({})
    const [isAdding, setIsAdding] = useState(false)
    const [newItem, setNewItem] = useState({ ...emptyItem })

    // État dérivé
    const isEditing = editingId !== null

    // Items filtrés
    const filteredItems = useMemo(() => {
        if (!searchQuery && !filterFn) return items

        return items.filter(item => {
            if (filterFn) {
                return filterFn(item, searchQuery)
            }
            // Filtre par défaut: recherche dans toutes les propriétés string
            const query = searchQuery.toLowerCase()
            return Object.values(item).some(
                value => typeof value === 'string' && value.toLowerCase().includes(query)
            )
        })
    }, [items, searchQuery, filterFn])

    // ============ FETCH ============
    const fetchItems = useCallback(async () => {
        setLoading(true)
        try {
            const response = await fetch(`${API_URL}${fetchEndpoint}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })

            if (!response.ok) {
                // 403 = pas de permissions, on affiche juste une liste vide sans erreur
                if (response.status === 403) {
                    setItems([])
                    setError(null)
                    return
                }
                throw new Error('Erreur lors de la récupération des données')
            }

            const data = await response.json()
            setItems(transformResponse(data))
            setError(null)
        } catch (err) {
            setError(err.message)
            setItems([])
        } finally {
            setLoading(false)
        }
    }, [fetchEndpoint, token, transformResponse])

    // ============ CREATE ============
    const createItem = useCallback(async (data, opts = {}) => {
        try {
            const response = await fetch(`${API_URL}${apiEndpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(data)
            })

            if (!response.ok) throw new Error('Erreur lors de la création')

            const responseData = await response.json()
            // Si la réponse contient le nouvel item, l'ajouter directement sans refetch
            if (responseData && typeof responseData === 'object' && responseData.id) {
                setItems(prev => [...prev, responseData])
            } else {
                await fetchItems()
            }
            setIsAdding(false)
            setNewItem({ ...emptyItem })
            setError(null)
            return opts.returnResponse ? responseData : true
        } catch (err) {
            setError(err.message)
            return false
        }
    }, [apiEndpoint, token, fetchItems, emptyItem])

    // ============ UPDATE ============
    const updateItem = useCallback(async (id, data) => {
        try {
            const response = await fetch(`${API_URL}${apiEndpoint}/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(data)
            })

            if (!response.ok) throw new Error('Erreur lors de la mise à jour')

            const responseData = await response.json()
            // Si la réponse contient l'item mis à jour, mettre à jour le state directement
            if (responseData && typeof responseData === 'object' && responseData.id) {
                setItems(prev => prev.map(item => item.id === id ? { ...item, ...responseData } : item))
            } else {
                await fetchItems()
            }
            setEditingId(null)
            setEditData({})
            setError(null)
            return true
        } catch (err) {
            setError(err.message)
            return false
        }
    }, [apiEndpoint, token, fetchItems])

    // ============ DELETE ============
    const deleteItem = useCallback(async (id) => {
        try {
            const response = await fetch(`${API_URL}${apiEndpoint}/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            })

            if (!response.ok) throw new Error('Erreur lors de la suppression')

            // Suppression optimiste : retire l'item du state sans refetch
            setItems(prev => prev.filter(item => item.id !== id))
            setError(null)
            return true
        } catch (err) {
            setError(err.message)
            return false
        }
    }, [apiEndpoint, token])

    // ============ TOGGLE ACTIVE ============
    const toggleActive = useCallback(async (id) => {
        try {
            const response = await fetch(`${API_URL}${apiEndpoint}/${id}/toggle`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}` }
            })

            if (!response.ok) throw new Error('Erreur lors du changement de statut')

            const responseData = await response.json()
            // Si la réponse contient l'item mis à jour, mettre à jour le state directement
            if (responseData && typeof responseData === 'object' && responseData.id) {
                setItems(prev => prev.map(item => item.id === id ? { ...item, ...responseData } : item))
            } else {
                await fetchItems()
            }
            setError(null)
            return true
        } catch (err) {
            setError(err.message)
            return false
        }
    }, [apiEndpoint, token, fetchItems])

    // ============ UI STATE MANAGEMENT ============
    const startEdit = useCallback((item) => {
        if (isAdding) return
        setEditingId(item.id)
        setEditData({ ...item })
    }, [isAdding])

    const cancelEdit = useCallback(() => {
        setEditingId(null)
        setEditData({})
    }, [])

    const startAdd = useCallback(() => {
        if (isEditing) return
        setIsAdding(true)
        setNewItem({ ...emptyItem })
    }, [isEditing, emptyItem])

    const cancelAdd = useCallback(() => {
        setIsAdding(false)
        setNewItem({ ...emptyItem })
    }, [emptyItem])

    const clearError = useCallback(() => {
        setError(null)
    }, [])

    return {
        // État
        items,
        filteredItems,
        loading,
        error,
        searchQuery,
        editingId,
        editData,
        isAdding,
        isEditing,
        newItem,

        // Setters
        setItems,
        setSearchQuery,
        setEditData,
        setNewItem,
        setError,
        clearError,

        // Actions CRUD
        fetchItems,
        createItem,
        updateItem,
        deleteItem,
        toggleActive,

        // Actions UI
        startEdit,
        cancelEdit,
        startAdd,
        cancelAdd
    }
}
