import { createContext, useState, useEffect } from 'react'
import { API_URL } from '../services/api'

export const NotyCampaignContext = createContext()

export function NotyCampaignProvider({ children }) {
    const [hasActiveCampaign, setHasActiveCampaign] = useState(false)
    const [currentActiveCampaign, setCurrentActiveCampaign] = useState(null)
    const [votingOpen, setVotingOpen] = useState(false)
    const [resultsPhase, setResultsPhase] = useState(false)
    const [hasPastCampaigns, setHasPastCampaigns] = useState(false)

    // Fonction pour vérifier s'il y a une campagne en cours
    const refreshActiveCampaign = async () => {
        try {
            const response = await fetch(`${API_URL}/api/noty/active`)
            // Si erreur serveur ou pas de réponse valide, on considère qu'il n'y a pas de campagne
            if (!response.ok) {
                setHasActiveCampaign(false)
                setCurrentActiveCampaign(null)
                return
            }
            const data = await response.json()
            setHasActiveCampaign(data.hasActiveCampaign)
            setCurrentActiveCampaign(data.campaign)
            setVotingOpen(data.votingOpen ?? false)
            setResultsPhase(data.resultsPhase ?? false)
        } catch {
            // Erreur réseau ou autre - pas de campagne active par défaut
            setHasActiveCampaign(false)
            setCurrentActiveCampaign(null)
            setVotingOpen(false)
            setResultsPhase(false)
        }
    }

    // Vérifier s'il y a des campagnes passées au montage
    useEffect(() => {
        const fetchHasPastCampaigns = async () => {
            try {
                const response = await fetch(`${API_URL}/api/noty/has-past-campaigns`)
                if (!response.ok) return
                const data = await response.json()
                setHasPastCampaigns(data.hasPastCampaigns ?? false)
            } catch {
                // Erreur réseau - pas de campagnes passées par défaut
            }
        }
        fetchHasPastCampaigns()
    }, [])

    // Vérifier s'il y a une campagne en cours au montage, puis toutes les 30s
    useEffect(() => {
        refreshActiveCampaign()
        const interval = setInterval(refreshActiveCampaign, 30 * 1000)
        return () => clearInterval(interval)
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <NotyCampaignContext.Provider value={{
            hasActiveCampaign,
            currentActiveCampaign,
            votingOpen,
            resultsPhase,
            hasPastCampaigns,
            refreshActiveCampaign
        }}>
            {children}
        </NotyCampaignContext.Provider>
    )
}
