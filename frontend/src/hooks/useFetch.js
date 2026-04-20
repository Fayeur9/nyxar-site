import { useState, useEffect, useCallback } from 'react'
import { API_URL } from '../services/api'

/**
 * Hook pour les appels API simples (fetch → loading/data/error).
 *
 * @param {string} path       - Chemin API relatif (ex: '/api/skins') ou URL absolue
 * @param {Object} options
 * @param {string} [options.token]      - JWT pour les routes authentifiées
 * @param {Function} [options.transform] - Transformation optionnelle de la réponse
 * @param {Array} [options.deps]         - Dépendances supplémentaires pour re-fetch
 */
export default function useFetch(path, { token = null, transform = (d) => d, deps = [] } = {}) {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const url = path.startsWith('http') ? path : `${API_URL}${path}`

    const load = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const headers = token ? { Authorization: `Bearer ${token}` } : {}
            const response = await fetch(url, { headers })
            if (!response.ok) throw new Error(`Erreur HTTP ${response.status}`)
            const raw = await response.json()
            setData(transform(raw))
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [url, token, ...deps])

    useEffect(() => {
        load()
    }, [load])

    return { data, loading, error, refetch: load }
}
