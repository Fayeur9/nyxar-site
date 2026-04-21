import { useState, useEffect, useCallback } from 'react'
import { API_URL } from '../services/api'
import { NotyCampaignContext } from './NotyCampaignContext.js'

const EMPTY_CAMPAIGN_STATE = {
    hasActiveCampaign: false,
    currentActiveCampaign: null,
    votingOpen: false,
    resultsPhase: false
}

async function fetchActiveCampaign() {
    try {
        const response = await fetch(`${API_URL}/api/noty/active`)
        if (!response.ok) return EMPTY_CAMPAIGN_STATE
        const data = await response.json()
        return {
            hasActiveCampaign: data.hasActiveCampaign,
            currentActiveCampaign: data.campaign,
            votingOpen: data.votingOpen ?? false,
            resultsPhase: data.resultsPhase ?? false
        }
    } catch {
        return EMPTY_CAMPAIGN_STATE
    }
}

async function fetchPastCampaignsFlag() {
    try {
        const response = await fetch(`${API_URL}/api/noty/has-past-campaigns`)
        if (!response.ok) return false
        const data = await response.json()
        return data.hasPastCampaigns ?? false
    } catch {
        return false
    }
}

export function NotyCampaignProvider({ children }) {
    const [campaignState, setCampaignState] = useState(EMPTY_CAMPAIGN_STATE)
    const [hasPastCampaigns, setHasPastCampaigns] = useState(false)

    const refreshActiveCampaign = useCallback(async () => {
        const next = await fetchActiveCampaign()
        setCampaignState(next)
    }, [])

    // Vérifier s'il y a des campagnes passées au montage
    useEffect(() => {
        let cancelled = false
        fetchPastCampaignsFlag().then(flag => {
            if (!cancelled) setHasPastCampaigns(flag)
        })
        return () => { cancelled = true }
    }, [])

    // Vérifier s'il y a une campagne en cours au montage, puis toutes les 30s
    useEffect(() => {
        let cancelled = false
        const load = async () => {
            const next = await fetchActiveCampaign()
            if (!cancelled) setCampaignState(next)
        }
        load()
        const interval = setInterval(load, 30 * 1000)
        return () => {
            cancelled = true
            clearInterval(interval)
        }
    }, [])

    return (
        <NotyCampaignContext.Provider value={{
            ...campaignState,
            hasPastCampaigns,
            refreshActiveCampaign
        }}>
            {children}
        </NotyCampaignContext.Provider>
    )
}
