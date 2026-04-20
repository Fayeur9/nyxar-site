import { useState, useEffect, useContext, useMemo } from 'react'
import { AuthContext } from '../../../context/AuthContext'
import { NotyCampaignContext } from '../../../context/NotyCampaignContext'
import { API_URL } from '../../../services/api'
import { titleToFilename } from '../../../utils/noty'
import '../../../styles/components/VotingResults.css'

export default function VotingResults({ isAdmin = false, campaignId: campaignIdProp, tokenProp }) {
    const { token: contextToken } = useContext(AuthContext)
    const { currentActiveCampaign } = useContext(NotyCampaignContext)

    const token = tokenProp || contextToken
    const campaignId = campaignIdProp || currentActiveCampaign?.id

    const [results, setResults] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    // Recherche, filtres et pagination
    const [search, setSearch] = useState('')
    const [gameFilter, setGameFilter] = useState('')
    const [typeFilter, setTypeFilter] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const RESULTS_PER_PAGE = 9

    // Admin : votes détaillés par catégorie
    const [expandedCategory, setExpandedCategory] = useState(null)
    const [votesDetail, setVotesDetail] = useState({})
    const [loadingVotes, setLoadingVotes] = useState(false)
    const [confirmingDeleteVote, setConfirmingDeleteVote] = useState(null)

    useEffect(() => {
        if (campaignId) fetchResults()
    }, [campaignId, token])

    const fetchResults = async () => {
        try {
            const headers = token ? { 'Authorization': `Bearer ${token}` } : {}
            const url = `${API_URL}/api/noty/campaigns/${campaignId}/results`
            const response = await fetch(url, { headers })
            if (!response.ok) throw new Error('Erreur récupération résultats')
            setResults(await response.json())
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const fetchVotesDetail = async (categoryId) => {
        if (votesDetail[categoryId]) return
        setLoadingVotes(true)
        try {
            const response = await fetch(`${API_URL}/api/noty/categories/${categoryId}/votes-detail`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (!response.ok) throw new Error('Erreur récupération des votes détaillés')
            const data = await response.json()
            setVotesDetail(prev => ({ ...prev, [categoryId]: data }))
        } catch (err) {
            console.error('Erreur fetch votes détaillés:', err)
        } finally {
            setLoadingVotes(false)
        }
    }

    const handleToggleDetail = (categoryId) => {
        if (expandedCategory === categoryId) {
            setExpandedCategory(null)
        } else {
            setExpandedCategory(categoryId)
            fetchVotesDetail(categoryId)
        }
    }

    const handleDeleteVote = async (voteId, categoryId) => {
        try {
            const response = await fetch(`${API_URL}/api/noty/votes/${voteId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (!response.ok) throw new Error('Erreur suppression')
            // Rafraîchir les votes de cette catégorie
            setVotesDetail(prev => ({
                ...prev,
                [categoryId]: prev[categoryId].filter(v => v.vote_id !== voteId)
            }))
            // Rafraîchir les résultats
            fetchResults()
        } catch (err) {
            setError(err.message)
        }
    }

    // Listes uniques pour les filtres
    const gameOptions = useMemo(() => {
        const games = new Map()
        results.forEach(c => {
            if (c.game_id && c.game_name) games.set(c.game_id, c.game_name)
        })
        return [...games.entries()].sort((a, b) => a[1].localeCompare(b[1]))
    }, [results])

    const typeOptions = useMemo(() => {
        const types = new Set()
        results.forEach(c => { if (c.nominee_type) types.add(c.nominee_type) })
        return [...types].sort()
    }, [results])

    const nomineeTypeLabels = { player: 'Joueur', image: 'Image', video: 'Vidéo', sound: 'Son', url: 'URL' }

    const filteredResults = useMemo(() => {
        return results.filter(c => {
            if (search && !c.title.toLowerCase().includes(search.toLowerCase())) return false
            if (gameFilter && String(c.game_id) !== gameFilter) return false
            if (typeFilter && c.nominee_type !== typeFilter) return false
            return true
        })
    }, [results, search, gameFilter, typeFilter])

    const totalPages = Math.ceil(filteredResults.length / RESULTS_PER_PAGE)
    const paginatedResults = useMemo(() => {
        const start = (currentPage - 1) * RESULTS_PER_PAGE
        return filteredResults.slice(start, start + RESULTS_PER_PAGE)
    }, [filteredResults, currentPage])

    // Reset page quand un filtre change
    const handleFilterChange = (setter) => (value) => {
        setter(value)
        setCurrentPage(1)
    }

    if (loading) return <div className="results-loading">Chargement des résultats...</div>
    if (error) return <div className="results-error">Erreur: {error}</div>
    if (!results.length) return <div className="results-loading">Aucun résultat disponible</div>

    const detailCategory = results.find(c => c.id === expandedCategory)

    const pagination = totalPages > 1 ? (
        <div className="c-pagination">
            <button
                className="c-pagination__btn"
                onClick={() => setCurrentPage(p => p - 1)}
                disabled={currentPage === 1}
            >
                &larr; Précédent
            </button>
            <div className="c-pagination__pages">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                        key={page}
                        className={`c-pagination__page${page === currentPage ? ' c-pagination__page--active' : ''}`}
                        onClick={() => setCurrentPage(page)}
                    >
                        {page}
                    </button>
                ))}
            </div>
            <button
                className="c-pagination__btn"
                onClick={() => setCurrentPage(p => p + 1)}
                disabled={currentPage === totalPages}
            >
                Suivant &rarr;
            </button>
        </div>
    ) : null

    return (
        <div className="noty-results">
            {!isAdmin && <h2 className="noty-results__title">Résultats des votes</h2>}

            <div className="noty-results__toolbar">
                <div className="noty-results__filters">
                    <div className="f-field noty-results__search">
                        <input
                            type="text"
                            placeholder="Rechercher une catégorie..."
                            value={search}
                            onChange={(e) => handleFilterChange(setSearch)(e.target.value)}
                        />
                    </div>
                    {gameOptions.length > 1 && (
                        <div className="f-field noty-results__filter">
                            <select
                                value={gameFilter}
                                onChange={(e) => handleFilterChange(setGameFilter)(e.target.value)}
                            >
                                <option value="">Tous les jeux</option>
                                {gameOptions.map(([id, name]) => (
                                    <option key={id} value={id}>{name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    {typeOptions.length > 1 && (
                        <div className="f-field noty-results__filter">
                            <select
                                value={typeFilter}
                                onChange={(e) => handleFilterChange(setTypeFilter)(e.target.value)}
                            >
                                <option value="">Tous les types</option>
                                {typeOptions.map(t => (
                                    <option key={t} value={t}>{nomineeTypeLabels[t] || t}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    <span className="noty-results__count">
                        {filteredResults.length} / {results.length} catégories
                    </span>
                </div>
                {pagination}
            </div>

            <div className="noty-results__grid">
                {paginatedResults.map(category => (
                    <CategoryResult
                        key={category.id}
                        category={category}
                        isAdmin={isAdmin}
                        campaignId={campaignId}
                        onToggleDetail={() => handleToggleDetail(category.id)}
                    />
                ))}
            </div>

            {pagination}

            {/* Modal votes détaillés (nested par-dessus la modale admin) */}
            {isAdmin && expandedCategory && detailCategory && (
                <div className="c-modal-overlay c-modal-overlay--nested" onClick={() => setExpandedCategory(null)}>
                    <div className="c-modal-panel c-modal-panel--lg" onClick={e => e.stopPropagation()}>
                        <div className="c-modal-panel__header">
                            <div className="c-modal-panel__header-content">
                                <h2 className="c-modal-panel__title">
                                    Votes — {detailCategory.title}
                                </h2>
                            </div>
                            <button className="c-modal-panel__close" onClick={() => setExpandedCategory(null)}>✕</button>
                        </div>
                        <div className="c-modal-panel__body c-modal-panel__body--scroll">
                            {loadingVotes ? (
                                <p className="noty-results__loading-votes">Chargement...</p>
                            ) : (votesDetail[expandedCategory] || []).length === 0 ? (
                                <p className="noty-results__loading-votes">Aucun vote</p>
                            ) : (
                                <table className="noty-results__votes-table">
                                    <thead>
                                        <tr>
                                            <th scope="col">Votant</th>
                                            <th scope="col">1er choix</th>
                                            <th scope="col">2e choix</th>
                                            <th scope="col">3e choix</th>
                                            <th scope="col"><span className="sr-only">Actions</span></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(votesDetail[expandedCategory] || []).map(vote => (
                                            <tr key={vote.vote_id}>
                                                <td className="noty-results__voter-cell">{vote.voter_pseudo}</td>
                                                <td>
                                                    <div className="noty-results__nominee-cell">
                                                        {vote.first_image && <img className="noty-results__nominee-img" src={vote.first_image} alt="" />}
                                                        <span>{vote.first_name || '—'}</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="noty-results__nominee-cell">
                                                        {vote.second_image && <img className="noty-results__nominee-img" src={vote.second_image} alt="" />}
                                                        <span>{vote.second_name || '—'}</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="noty-results__nominee-cell">
                                                        {vote.third_image && <img className="noty-results__nominee-img" src={vote.third_image} alt="" />}
                                                        <span>{vote.third_name || '—'}</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    {confirmingDeleteVote === vote.vote_id ? (
                                                        <span className="noty-results__confirm-delete">
                                                            <button
                                                                className="noty-results__confirm-yes"
                                                                onClick={() => { setConfirmingDeleteVote(null); handleDeleteVote(vote.vote_id, expandedCategory) }}
                                                                aria-label="Confirmer la suppression"
                                                            >
                                                                Oui
                                                            </button>
                                                            <button
                                                                className="noty-results__confirm-no"
                                                                onClick={() => setConfirmingDeleteVote(null)}
                                                                aria-label="Annuler la suppression"
                                                            >
                                                                Non
                                                            </button>
                                                        </span>
                                                    ) : (
                                                        <button
                                                            className="noty-results__delete-vote"
                                                            onClick={() => setConfirmingDeleteVote(vote.vote_id)}
                                                            title="Supprimer ce vote"
                                                            aria-label={`Supprimer le vote de ${vote.voter_pseudo}`}
                                                        >
                                                            &times;
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}


function CategoryResult({ category, isAdmin, campaignId, onToggleDetail }) {
    const [showAll, setShowAll] = useState(false)

    const sorted = [...(category.nominees || [])].sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points
        if ((b.first_count || 0) !== (a.first_count || 0)) return (b.first_count || 0) - (a.first_count || 0)
        if ((b.second_count || 0) !== (a.second_count || 0)) return (b.second_count || 0) - (a.second_count || 0)
        return (b.third_count || 0) - (a.third_count || 0)
    })

    const totalPoints = sorted.reduce((sum, n) => sum + (n.points || 0), 0)
    const pct = (points) => totalPoints > 0 ? `${((points / totalPoints) * 100).toFixed(1)}%` : '0%'

    const podium = sorted.slice(0, 3)
    const rest = showAll ? sorted.slice(3) : sorted.slice(3, 6)
    const hasMore = sorted.length > 6

    const handleDownloadCard = async () => {
        const filename = titleToFilename(category.title)
        const url = `${API_URL}/api/noty/campaigns/${campaignId}/cards/${filename}.png`
        try {
            const res = await fetch(url)
            if (!res.ok) throw new Error('Carte non disponible')
            const blob = await res.blob()
            const a = document.createElement('a')
            a.href = URL.createObjectURL(blob)
            a.download = `${filename}.png`
            a.click()
            URL.revokeObjectURL(a.href)
        } catch {
            alert('Carte non disponible. Générez les cartes d\'abord.')
        }
    }

    // Réorganiser le podium pour l'affichage : 2nd - 1st - 3rd
    const podiumDisplay = []
    if (podium[1]) podiumDisplay.push({ ...podium[1], rank: 2 })
    if (podium[0]) podiumDisplay.push({ ...podium[0], rank: 1 })
    if (podium[2]) podiumDisplay.push({ ...podium[2], rank: 3 })

    return (
        <div className="noty-results__card">
            <h3 className="noty-results__card-title">{category.title}</h3>

            {sorted.length === 0 ? (
                <p className="noty-results__no-votes">Aucun vote</p>
            ) : (
                <>
                    {/* Podium */}
                    <div className="noty-results__podium">
                        {podiumDisplay.map(nominee => (
                            <div key={nominee.id} className={`noty-results__spot noty-results__spot--${nominee.rank}`}>
                                <div className="noty-results__rank-badge">
                                    {nominee.rank === 1 ? '1' : nominee.rank === 2 ? '2' : '3'}
                                </div>
                                <div className="noty-results__avatar">
                                    {nominee.image_url ? (
                                        <img src={nominee.image_url} alt={nominee.pseudo} />
                                    ) : (
                                        <span>{(nominee.pseudo || '?')[0]}</span>
                                    )}
                                </div>
                                <span className="noty-results__name">{nominee.pseudo}</span>
                                <span className="noty-results__points">
                                    {nominee.points} pts
                                    <span className="noty-results__pct"> ({pct(nominee.points)})</span>
                                </span>
                                <div className="noty-results__bar" />
                            </div>
                        ))}
                    </div>

                    {/* 4e place et suivantes */}
                    {rest.length > 0 && (
                        <div className="noty-results__rest">
                            {rest.map((nominee, i) => (
                                <div key={nominee.id} className="noty-results__rest-item">
                                    <span className="noty-results__rest-rank">#{i + 4}</span>
                                    <div className="noty-results__rest-avatar">
                                        {nominee.image_url ? (
                                            <img src={nominee.image_url} alt={nominee.pseudo} />
                                        ) : (
                                            <span>{(nominee.pseudo || '?')[0]}</span>
                                        )}
                                    </div>
                                    <span className="noty-results__rest-name" title={nominee.pseudo}>{nominee.pseudo}</span>
                                    <span className="noty-results__rest-points">
                                        {nominee.points} pts
                                        <span className="noty-results__pct"> ({pct(nominee.points)})</span>
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                    {hasMore && (
                        <button
                            className="noty-results__show-all-btn"
                            onClick={() => setShowAll(v => !v)}
                        >
                            {showAll ? 'Réduire' : `Voir tous les résultats (${sorted.length - 6} de plus)`}
                        </button>
                    )}
                </>
            )}

            {/* Admin : actions */}
            {isAdmin && sorted.length > 0 && (
                <div className="noty-results__card-actions">
                    <button
                        className="noty-results__detail-btn"
                        onClick={onToggleDetail}
                    >
                        Voir les votes détaillés
                    </button>
                    <button
                        className="noty-results__download-btn"
                        onClick={handleDownloadCard}
                        title="Télécharger la carte de cette catégorie"
                    >
                        Télécharger la carte
                    </button>
                </div>
            )}
        </div>
    )
}
