import { useNavigate, useLocation } from 'react-router-dom'

/**
 * Hook personnalisé pour une navigation dynamique intelligente
 * Retourne vers la page d'administration si on en vient, sinon vers une page par défaut
 */
export const useSmartNavigation = (defaultPath = '/') => {
    const navigate = useNavigate()
    const location = useLocation()

    const goBack = (fromAdminPath = '/admin') => {
        // Vérifier si on vient de la page d'administration
        const previousPath = location.state?.from?.pathname
        
        if (previousPath?.includes('/admin')) {
            navigate(fromAdminPath)
        } else {
            navigate(defaultPath)
        }
    }

    return { goBack, navigate, location }
}
