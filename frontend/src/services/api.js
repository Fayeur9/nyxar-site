// Configuration dynamique de l'API
const getApiUrl = () => {
  // Si VITE_API_URL est configuré en environnement, l'utiliser
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL
  }
  
  // En développement, utiliser le serveur backend sur le port 5176
  if (import.meta.env.DEV) {
    return `http://${window.location.hostname}:5176`
  }
  
  // En production, utiliser le domaine actuel
  return `${window.location.protocol}//${window.location.host}`
}

export const API_URL = getApiUrl()

export default API_URL
