import { useState, useCallback } from 'react'

/**
 * Hook pour gérer les données d'un formulaire
 * @param {Object} initialData - Données initiales du formulaire
 * @returns {Object} - { formData, setFormData, handleInputChange, handleCheckboxChange, resetForm }
 */
export default function useFormData(initialData = {}) {
    const [formData, setFormData] = useState(initialData)

    // Gère les changements d'input standard (text, number, select, etc.)
    const handleInputChange = useCallback((e) => {
        const { name, value } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: value
        }))
    }, [])

    // Gère les changements de checkbox
    const handleCheckboxChange = useCallback((e) => {
        const { name, checked } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: checked
        }))
    }, [])

    // Réinitialise le formulaire aux valeurs initiales ou à de nouvelles valeurs
    const resetForm = useCallback((newData) => {
        setFormData(newData !== undefined ? newData : initialData)
    }, [initialData])

    // Met à jour un champ spécifique (utile pour les composants contrôlés)
    const setField = useCallback((name, value) => {
        setFormData(prev => ({
            ...prev,
            [name]: value
        }))
    }, [])

    return {
        formData,
        setFormData,
        handleInputChange,
        handleCheckboxChange,
        resetForm,
        setField
    }
}
