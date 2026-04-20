import { useState, useEffect, useContext, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { AuthContext } from '../../../context/AuthContext'
import { NotyCampaignContext } from '../../../context/NotyCampaignContext'
import { API_URL } from '../../../services/api'
import VotingResults from './VotingResults'
import NotyResultsModal from '../../modals/NotyResultsModal'
import VoteCountdown from '../VoteCountdown'
import '../../../styles/components/VotingCategories.css'

// Helpers cookie
function getCookie(name) {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
    return match ? match[2] : null
}

function setCookie(name, value, expires) {
    let cookie = `${name}=${value}; path=/noty; SameSite=Lax`
    if (expires) {
        cookie += `; expires=${new Date(expires).toUTCString()}`
    }
    if (window.location.protocol === 'https:') {
        cookie += '; Secure'
    }
    document.cookie = cookie
}

export default function VotingCategories() {
    const { user, token } = useContext(AuthContext)
    const { currentActiveCampaign, resultsPhase } = useContext(NotyCampaignContext)
    const [categories, setCategories] = useState([])
    const [votedCategoryIds, setVotedCategoryIds] = useState(new Set())
    const [searchQuery, setSearchQuery] = useState('')
    const [showUnvotedOnly, setShowUnvotedOnly] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [showResultsModal, setShowResultsModal] = useState(false)
    const [summary, setSummary] = useState(null)
    const [showResults, setShowResults] = useState(false)
    const [liveStats, setLiveStats] = useState(null)
    const [liveStatsError, setLiveStatsError] = useState(false)
    const liveStatsInterval = useRef(null)
    const ITEMS_PER_PAGE = 24

    // Vérifier si on doit afficher les résultats (cookie) ou la modal
    useEffect(() => {
        if (resultsPhase && currentActiveCampaign?.id) {
            const cookieName = `noty_results_${currentActiveCampaign.id}`
            if (getCookie(cookieName)) {
                setShowResults(true)
            } else if (user && token) {
                fetchSummary()
            }
        }
    }, [resultsPhase, currentActiveCampaign, user, token])

    useEffect(() => {
        if (currentActiveCampaign?.id) {
            fetchCategories()
        }
    }, [currentActiveCampaign])

    useEffect(() => {
        if (user && token && currentActiveCampaign?.id) {
            fetchVotedCategories()
        }
    }, [currentActiveCampaign, user, token])

    // Live stats polling pour les badges par carte (toutes les 60s, uniquement si votes ouverts)
    useEffect(() => {
        if (!resultsPhase && currentActiveCampaign?.id) {
            fetchLiveStats()
            liveStatsInterval.current = setInterval(fetchLiveStats, 60000)
        }
        return () => {
            if (liveStatsInterval.current) {
                clearInterval(liveStatsInterval.current)
                liveStatsInterval.current = null
            }
        }
    }, [currentActiveCampaign, resultsPhase])

    const fetchCategories = async () => {
        try {
            const headers = user && token ? { 'Authorization': `Bearer ${token}` } : {}
            const url = `${API_URL}/api/noty/categories?campaign_id=${currentActiveCampaign.id}`
            const response = await fetch(url, { headers })
            if (!response.ok) throw new Error('Erreur récupération catégories')
            const data = await response.json()
            setCategories(data)
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const fetchVotedCategories = async () => {
        try {
            const response = await fetch(`${API_URL}/api/noty/campaigns/${currentActiveCampaign.id}/my-votes`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (!response.ok) throw new Error('Erreur récupération votes')
            const votedIds = await response.json()
            setVotedCategoryIds(new Set(votedIds))
        } catch (err) {
            console.error('Erreur récupération votes:', err)
        }
    }

    const fetchSummary = async () => {
        try {
            const response = await fetch(`${API_URL}/api/noty/campaigns/${currentActiveCampaign.id}/my-summary`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (response.ok) {
                const data = await response.json()
                setSummary(data)
                setShowResultsModal(true)
            }
        } catch (err) {
            console.error('Erreur récupération résumé:', err)
        }
    }

    const handleViewResults = () => {
        if (currentActiveCampaign?.id && summary?.results_end_date) {
            setCookie(`noty_results_${currentActiveCampaign.id}`, '1', summary.results_end_date)
        }
        setShowResultsModal(false)
        setShowResults(true)
    }

    const liveStatsErrorCount = useRef(0)

    const fetchLiveStats = async () => {
        try {
            const response = await fetch(`${API_URL}/api/noty/campaigns/${currentActiveCampaign.id}/live-stats`)
            if (response.ok) {
                setLiveStats(await response.json())
                liveStatsErrorCount.current = 0
            } else {
                throw new Error('Réponse non OK')
            }
        } catch (err) {
            liveStatsErrorCount.current++
            console.error('Erreur récupération live stats:', err)
            if (liveStatsErrorCount.current >= 3 && liveStatsInterval.current) {
                clearInterval(liveStatsInterval.current)
                liveStatsInterval.current = null
                setLiveStatsError(true)
            }
        }
    }

    const filteredCategories = useMemo(() => {
        let result = categories
        if (showUnvotedOnly && votedCategoryIds.size > 0) {
            result = result.filter(c => !votedCategoryIds.has(c.id))
        }
        const q = searchQuery.trim().toLowerCase()
        if (q) {
            result = result.filter(c => c.title.toLowerCase().includes(q))
        }
        return result
    }, [categories, searchQuery, showUnvotedOnly, votedCategoryIds])

    const totalPages = Math.ceil(filteredCategories.length / ITEMS_PER_PAGE)
    const paginatedCategories = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE
        return filteredCategories.slice(start, start + ITEMS_PER_PAGE)
    }, [filteredCategories, currentPage])

    // Reset page quand la recherche ou le filtre change
    useEffect(() => {
        setCurrentPage(1)
    }, [searchQuery, showUnvotedOnly])

    if (loading) return <div className="categories-loading">Chargement...</div>

    // Phase résultats : afficher les résultats si cookie présent
    if (showResults && resultsPhase) {
        return (
            <div className="voting-categories">
                <div className="info-message info-message--results">
                    Les votes sont terminés — voici les résultats de la campagne.
                </div>
                <VotingResults />
            </div>
        )
    }

    return (
        <div className="voting-categories">
            {error && <div className="error-message">{error}</div>}

            {/* Modal récapitulatif phase résultats */}
            <NotyResultsModal
                isOpen={showResultsModal}
                summary={summary}
                onClose={() => setShowResultsModal(false)}
                onViewResults={handleViewResults}
            />

            {resultsPhase && !showResults && (
                <div className="info-message">
                    Les votes sont clôturés pour cette campagne.
                </div>
            )}

            {!user && !resultsPhase && (
                <div className="info-message">
                    Connectez-vous pour voter ! Le vote est réservé aux utilisateurs authentifiés.
                </div>
            )}

            {!resultsPhase && currentActiveCampaign?.end_date && (
                <VoteCountdown endDate={currentActiveCampaign.end_date} />
            )}

            {liveStatsError && (
                <div className="warning-message">
                    Les statistiques en direct sont temporairement indisponibles.
                </div>
            )}

            {categories.length > 0 && (
                <div className="categories-section">
                    <div className="categories-header">
                        <h2 className="section-title">Catégories</h2>
                        <div className="categories-filters">
                            <div className="categories-search">
                                <input
                                    type="text"
                                    placeholder="Rechercher une catégorie..."
                                    aria-label="Rechercher une catégorie"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="categories-search__input"
                                />
                                {searchQuery && (
                                    <button
                                        className="categories-search__clear"
                                        onClick={() => setSearchQuery('')}
                                        aria-label="Effacer la recherche"
                                    >
                                        &times;
                                    </button>
                                )}
                            </div>
                            {user && votedCategoryIds.size > 0 && votedCategoryIds.size < categories.length && !resultsPhase && (
                                <button
                                    className={`categories-filter-btn${showUnvotedOnly ? ' categories-filter-btn--active' : ''}`}
                                    onClick={() => setShowUnvotedOnly(v => !v)}
                                >
                                    Reste à voter
                                </button>
                            )}
                        </div>
                    </div>
                    {filteredCategories.length > 0 ? (
                        <>
                            <div className="noty-grid">
                                {paginatedCategories.map(category => (
                                    <NotyCard
                                        key={category.id}
                                        category={category}
                                        voted={votedCategoryIds.has(category.id)}
                                        voteCount={liveStats?.per_category?.[category.id] ?? null}
                                    />
                                ))}
                            </div>
                            {totalPages > 1 && (
                                <div className="categories-pagination">
                                    <button
                                        className="categories-pagination__btn"
                                        onClick={() => setCurrentPage(p => p - 1)}
                                        disabled={currentPage === 1}
                                    >
                                        &larr; Précédent
                                    </button>
                                    <div className="categories-pagination__pages">
                                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                            <button
                                                key={page}
                                                className={`categories-pagination__page${page === currentPage ? ' categories-pagination__page--active' : ''}`}
                                                onClick={() => setCurrentPage(page)}
                                            >
                                                {page}
                                            </button>
                                        ))}
                                    </div>
                                    <button
                                        className="categories-pagination__btn"
                                        onClick={() => setCurrentPage(p => p + 1)}
                                        disabled={currentPage === totalPages}
                                    >
                                        Suivant &rarr;
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="no-categories">Aucune catégorie ne correspond à votre recherche</div>
                    )}
                </div>
            )}

            {categories.length === 0 && (
                <div className="no-categories">Aucune catégorie disponible</div>
            )}
        </div>
    )
}

function NotyCard({ category, voted, voteCount }) {
    return (
        <Link to={`/noty/vote/${category.id}`} className={`noty-card${voted ? ' noty-card--voted' : ''}`}>
            {category.image_url ? (
                <img
                    src={category.image_url}
                    alt={category.title}
                    className="noty-card__image"
                    loading="lazy"
                />
            ) : (
                <div className="noty-card__placeholder">
                    {category.title.charAt(0)}
                </div>
            )}
            {voted && <div className="noty-card__badge-voted">Voté</div>}
            {voteCount != null && (
                <div className="noty-card__vote-count">
                    {voteCount} {voteCount > 1 ? 'votes' : 'vote'}
                </div>
            )}
            <div className="noty-card__overlay">
                <h3 className="noty-card__title">{category.title}</h3>
                {category.description && (
                    <p className="noty-card__desc">{category.description}</p>
                )}
                <span className="noty-card__link">
                    {voted ? 'Modifier mon vote' : 'Votez'} &rarr;
                </span>
            </div>
        </Link>
    )
}
