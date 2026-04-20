import { useState, useCallback, useRef, useContext } from 'react'
import { AuthContext } from '../context/AuthContext'
import { API_URL } from '../services/api'

/**
 * Hook pour différer les uploads d'images au moment du submit.
 *
 * Au lieu d'uploader immédiatement quand l'utilisateur sélectionne un fichier,
 * on stocke le File et on retourne un blob URL pour le preview.
 * L'upload réel se fait via uploadPendingFiles() au moment du save.
 */
export default function useDeferredUpload() {
    const { token } = useContext(AuthContext)
    const [pendingFiles, setPendingFiles] = useState({})
    const blobUrlsRef = useRef([])

    const handleFileSelect = useCallback((field, file, uploadEndpoint, formDataFieldName = 'image') => {
        const blobUrl = URL.createObjectURL(file)
        blobUrlsRef.current.push(blobUrl)

        setPendingFiles(prev => ({
            ...prev,
            [field]: { file, blobUrl, endpoint: uploadEndpoint, fieldName: formDataFieldName }
        }))

        return blobUrl
    }, [])

    const hasPending = Object.keys(pendingFiles).length > 0

    const uploadPendingFiles = useCallback(async () => {
        const results = {}

        for (const [field, { file, endpoint, fieldName }] of Object.entries(pendingFiles)) {
            const formData = new FormData()
            formData.append(fieldName, file)

            const response = await fetch(`${API_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            })

            if (!response.ok) throw new Error(`Erreur upload image (${field})`)
            const data = await response.json()
            results[field] = data.url
        }

        setPendingFiles({})
        return results
    }, [pendingFiles, token])

    const reset = useCallback(() => {
        blobUrlsRef.current.forEach(url => URL.revokeObjectURL(url))
        blobUrlsRef.current = []
        setPendingFiles({})
    }, [])

    return { handleFileSelect, uploadPendingFiles, hasPending, reset }
}
