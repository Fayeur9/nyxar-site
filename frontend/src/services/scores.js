import API_URL from './api'

export async function fetchScoreboard(game, order = 'desc') {
  const orderParam = order === 'asc' ? '?order=asc' : ''
  const res = await fetch(`${API_URL}/api/scoreboard/${game}${orderParam}`)
  if (!res.ok) throw new Error('Erreur chargement classement')
  return res.json()
}

export async function fetchMyScore(game, token) {
  const res = await fetch(`${API_URL}/api/scores/me/${game}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })

  if (!res.ok) throw new Error('Erreur chargement meilleur score')
  return res.json()
}

export async function resetScores(game, token) {
  const url = game ? `${API_URL}/api/admin/scores/${game}` : `${API_URL}/api/admin/scores`
  const res = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  if (!res.ok) throw new Error('Erreur reset scores')
  return res.json()
}

export async function deleteScore(game, userId, token) {
  const res = await fetch(`${API_URL}/api/admin/scores/${game}/${userId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  if (!res.ok) throw new Error('Erreur suppression score')
  return res.json()
}
