import { API_URL } from './api'

export async function fetchMiniGamesSettings() {
    const res = await fetch(`${API_URL}/api/mini-games/settings`)
    if (!res.ok) {
        throw new Error('Erreur chargement statuts mini-jeux')
    }
    return res.json()
}

export async function updateMiniGameStatus(slug, payload, token) {
    const res = await fetch(`${API_URL}/api/admin/mini-games/${slug}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
    })

    if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.message || 'Erreur mise à jour mini-jeu')
    }

    return res.json()
}

export async function reorderMiniGames(order, token) {
    const res = await fetch(`${API_URL}/api/admin/mini-games/reorder`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ orders: order })
    })

    if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.message || 'Erreur réorganisation mini-jeux')
    }

    return res.json()
}
