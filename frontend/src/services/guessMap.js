import API_URL from './api'

export async function fetchCurrentGuessMap() {
  const res = await fetch(`${API_URL}/api/guess-map/current`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error('Impossible de charger le défi en cours.')
  return res.json()
}

export async function submitGuessMapAnswer(challengeId, answer, token) {
  const res = await fetch(`${API_URL}/api/guess-map/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ challengeId, answer })
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const error = new Error(data.message || 'Réponse incorrecte.')
    error.details = data
    error.status = res.status
    throw error
  }
  return data
}

export async function uploadGuessMapImage(file, token) {
  const formData = new FormData()
  formData.append('image', file)

  const res = await fetch(`${API_URL}/api/admin/guess-map/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: formData
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || 'Upload impossible.')
  }
  return res.json()
}

export async function createGuessMapChallenge(payload, token) {
  const res = await fetch(`${API_URL}/api/admin/guess-map/challenges`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || 'Création impossible.')
  }
  return res.json()
}

export async function fetchGuessMapHistory(token) {
  const res = await fetch(`${API_URL}/api/admin/guess-map/challenges`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || 'Impossible de charger l\'historique.')
  }
  return res.json()
}

export async function resetGuessMapAttempts(userId, token, challengeId) {
  const params = challengeId ? `?challengeId=${challengeId}` : ''
  const res = await fetch(`${API_URL}/api/admin/guess-map/attempts/${userId}${params}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`
    }
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.message || 'Impossible de réinitialiser les essais.')
  }
  return data
}

export async function resetAllGuessMapAttempts(token, challengeId) {
  const url = new URL(`${API_URL}/api/admin/guess-map/attempts`)
  if (challengeId) {
    url.searchParams.set('challengeId', challengeId)
  }

  const res = await fetch(url.toString(), {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`
    }
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.message || 'Impossible de réinitialiser les essais.')
  }
  return data
}
