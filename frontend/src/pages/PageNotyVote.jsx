import { useState, useEffect, useContext, useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'
import { NotyCampaignContext } from '../context/NotyCampaignContext'
import { API_URL } from '../services/api'
import { detectPlatform, getUrlThumbnail, extractTwitchClipSlug, extractYouTubeId } from '../utils/media'
import VoteConfirmModal from '../components/modals/VoteConfirmModal'
import ConfirmModal from '../components/modals/ConfirmModal'
import NotyCompletionModal from '../components/modals/NotyCompletionModal'
import UnsavedVoteModal from '../components/modals/UnsavedVoteModal'
import SoundWavePlayer from '../components/noty/SoundWavePlayer'
import VoteCountdown from '../components/noty/VoteCountdown'
import '../styles/components/SoundWavePlayer.css'
import '../styles/components/VotingCategories.css'
import '../styles/pages/NotyPage.css'

export default function PageNotyVote() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { user, token } = useContext(AuthContext)
    const { currentActiveCampaign, votingOpen } = useContext(NotyCampaignContext)
    const [category, setCategory] = useState(null)
    const [allCategories, setAllCategories] = useState([])
    const [players, setPlayers] = useState([])
    const [userVote, setUserVote] = useState(null)
    const [votingState, setVotingState] = useState([])
    const [searchQuery, setSearchQuery] = useState('')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [submitting, setSubmitting] = useState(false)
    const [showConfirmModal, setShowConfirmModal] = useState(false)
    const [isLocked, setIsLocked] = useState(false)
    const [progress, setProgress] = useState(null)
    const [showCompletionModal, setShowCompletionModal] = useState(false)
    const [showUnsavedModal, setShowUnsavedModal] = useState(false)
    const [pendingNav, setPendingNav] = useState(null)
    const [showWithdrawModal, setShowWithdrawModal] = useState(false)

    // Navigation gardée : intercepte si des choix non enregistrés
    const safeNavigate = (path) => {
        if (votingState.length > 0) {
            setPendingNav(path)
            setShowUnsavedModal(true)
        } else {
            navigate(path)
        }
    }

    // Reset state au changement de catégorie
    useEffect(() => {
        setVotingState([])
        setShowConfirmModal(false)
        setUserVote(null)
        setIsLocked(false)
        setSearchQuery('')
        setError(null)
        document.title = 'Vote — NOTY | Nyxar'
    }, [id])

    useEffect(() => {
        loadData()
        if (user && token) {
            fetchUserVote()
            fetchProgress()
        }
    }, [id, user, token])

    // Verrouiller la grille et afficher la modal si catégorie déjà votée
    useEffect(() => {
        if (userVote && votingState.length === 0 && !submitting) {
            setIsLocked(true)
            setShowConfirmModal(true)
        }
    }, [userVote])

    const loadData = async () => {
        try {
            // 1. Charger les catégories pour connaître le type
            const headers = user && token ? { 'Authorization': `Bearer ${token}` } : {}
            const campaignParam = currentActiveCampaign?.id ? `?campaign_id=${currentActiveCampaign.id}` : ''
            const catResponse = await fetch(`${API_URL}/api/noty/categories${campaignParam}`, { headers })
            if (!catResponse.ok) throw new Error('Erreur récupération catégorie')
            const catData = await catResponse.json()
            setAllCategories(catData)
            const found = catData.find(c => String(c.id) === String(id))
            if (!found) throw new Error('Catégorie introuvable')
            setCategory(found)

            // 2. Charger les nominés selon le type
            const nomineeType = found.nominee_type || 'player'
            if (nomineeType === 'player') {
                const response = await fetch(`${API_URL}/api/noty/categories/${id}/eligible-players`)
                if (!response.ok) throw new Error('Erreur récupération joueurs')
                setPlayers(await response.json())
            } else {
                const response = await fetch(`${API_URL}/api/noty/categories/${id}/custom-nominees`)
                if (!response.ok) throw new Error('Erreur récupération nominés')
                const data = await response.json()
                setPlayers(data.map(n => ({
                    id: n.id,
                    pseudo: n.title,
                    image_url: n.media_url,
                    media_url: n.media_url,
                    waveform_data: n.waveform_data
                })))
            }
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const fetchUserVote = async () => {
        try {
            const campaignParam = currentActiveCampaign?.id ? `?campaign_id=${currentActiveCampaign.id}` : ''
            const response = await fetch(`${API_URL}/api/noty/categories/${id}/my-vote${campaignParam}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (!response.ok) throw new Error('Erreur récupération vote')
            const data = await response.json()
            setUserVote(data)
        } catch (err) {
            console.error('Erreur fetch vote:', err)
        }
    }

    const fetchProgress = async () => {
        if (!currentActiveCampaign?.id) return null
        try {
            const response = await fetch(`${API_URL}/api/noty/campaigns/${currentActiveCampaign.id}/my-progress`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (response.ok) {
                const data = await response.json()
                setProgress(data)
                return data
            }
        } catch (err) {
            console.error('Erreur récupération progression:', err)
        }
        return null
    }

    const filteredPlayers = useMemo(() => {
        const q = searchQuery.trim().toLowerCase()
        if (!q) return players
        return players.filter(p => p.pseudo?.toLowerCase().includes(q))
    }, [players, searchQuery])

    // Navigation circulaire prev/next
    const { prevCategoryId, nextCategoryId } = useMemo(() => {
        if (allCategories.length <= 1) return { prevCategoryId: null, nextCategoryId: null }
        const currentIndex = allCategories.findIndex(c => String(c.id) === String(id))
        if (currentIndex === -1) return { prevCategoryId: null, nextCategoryId: null }

        const prevIndex = (currentIndex - 1 + allCategories.length) % allCategories.length
        const nextIndex = (currentIndex + 1) % allCategories.length

        return {
            prevCategoryId: allCategories[prevIndex].id,
            nextCategoryId: allCategories[nextIndex].id,
        }
    }, [allCategories, id])

    // Podium players (depuis le vote enregistré)
    const podiumPlayers = useMemo(() => {
        if (!userVote) return []
        const choices = [userVote.first_choice, userVote.second_choice, userVote.third_choice]
        return choices.map(choiceId => players.find(p => p.id === choiceId)).filter(Boolean)
    }, [userVote, players])

    // Positions des choix verrouillés (affichage read-only)
    const lockedPositions = useMemo(() => {
        if (!userVote || !isLocked) return {}
        const map = {}
        if (userVote.first_choice) map[userVote.first_choice] = 0
        if (userVote.second_choice) map[userVote.second_choice] = 1
        if (userVote.third_choice) map[userVote.third_choice] = 2
        return map
    }, [userVote, isLocked])

    const handleUnlockVote = () => {
        setIsLocked(false)
        setVotingState([])
        setShowConfirmModal(false)
    }

    const openWithdrawConfirm = () => setShowWithdrawModal(true)

    const handleWithdrawVote = async () => {
        setShowWithdrawModal(false)
        try {
            const campaignParam = currentActiveCampaign?.id ? `?campaign_id=${currentActiveCampaign.id}` : ''
            const response = await fetch(`${API_URL}/api/noty/categories/${id}/vote${campaignParam}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (!response.ok) {
                const data = await response.json().catch(() => ({}))
                throw new Error(data.message || 'Erreur retrait vote')
            }
            setUserVote(null)
            setIsLocked(false)
            setVotingState([])
            setShowConfirmModal(false)
            setError(null)
            await fetchProgress()
        } catch (err) {
            setError(err.message)
        }
    }

    const togglePlayer = (playerId) => {
        setVotingState(prev => {
            if (prev.includes(playerId)) {
                return prev.filter(id => id !== playerId)
            }
            if (prev.length >= 3) return prev
            return [...prev, playerId]
        })
    }

    const handleSubmitVote = async () => {
        if (votingState.length === 0) return false
        setSubmitting(true)
        try {
            const response = await fetch(`${API_URL}/api/noty/categories/${id}/vote`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    first_choice: votingState[0] || null,
                    second_choice: votingState[1] || null,
                    third_choice: votingState[2] || null,
                    noty_campaign_id: currentActiveCampaign?.id || null
                })
            })
            if (!response.ok) {
                const data = await response.json().catch(() => ({}))
                throw new Error(data.error || data.message || 'Erreur enregistrement vote')
            }
            await fetchUserVote()
            const progressData = await fetchProgress()
            setVotingState([])
            setError(null)
            // Vérifier si 100% et pas encore affiché
            const cookieName = `noty_completed_${currentActiveCampaign?.id}`
            const alreadyShown = document.cookie.split('; ').some(c => c.startsWith(`${cookieName}=`))
            if (progressData && progressData.voted === progressData.total && !alreadyShown) {
                document.cookie = `${cookieName}=1; path=/noty; SameSite=Lax${window.location.protocol === 'https:' ? '; Secure' : ''}`
                setShowCompletionModal(true)
            } else {
                setShowConfirmModal(true)
            }
            return true
        } catch (err) {
            setError(err.message)
            return false
        } finally {
            setSubmitting(false)
        }
    }

    const SubmitButton = ({ inline = false }) => (
        votingState.length > 0 && votingOpen ? (
            <button
                className={`btn-submit-vote${submitting ? ' btn-submit-vote--loading' : ''}${inline ? ' btn-submit-vote--inline' : ''}`}
                onClick={handleSubmitVote}
                disabled={!user || submitting}
            >
                {submitting ? 'Enregistrement...' : 'Enregistrer mon vote'}
            </button>
        ) : null
    )

    const nomineeType = category?.nominee_type || 'player'

    if (loading) return <div className="categories-loading"><div className="spinner" /><span>Chargement...</span></div>
    if (error && !category) return <div className="categories-error">{error}</div>

    return (
        <div className="page-container noty-vote-page">
            <button onClick={() => safeNavigate('/noty/categories')} className="noty-vote-back">&larr; Retour aux catégories</button>

            {category && (
                <div className="noty-vote-header">
                    <div className="noty-vote-nav">
                        {prevCategoryId && (
                            <button
                                className="noty-vote-nav__btn"
                                onClick={() => safeNavigate(`/noty/vote/${prevCategoryId}`)}
                                title="Catégorie précédente"
                                aria-label="Catégorie précédente"
                            >
                                ← Précédent
                            </button>
                        )}
                        <h1>{category.title}</h1>
                        {nextCategoryId && (
                            <button
                                className="noty-vote-nav__btn"
                                onClick={() => safeNavigate(`/noty/vote/${nextCategoryId}`)}
                                title="Catégorie suivante"
                                aria-label="Catégorie suivante"
                            >
                                Suivant →
                            </button>
                        )}
                    </div>
                    {category.description && <p className="noty-vote-header__desc">{category.description}</p>}
                    {progress && (
                        <div className="noty-vote-header__progress">
                            <span>Catégorie {progress.voted} / {progress.total}</span>
                            <div className="noty-vote-progress-bar">
                                <div
                                    className="noty-vote-progress-bar__fill"
                                    style={{ width: `${(progress.voted / progress.total) * 100}%` }}
                                />
                            </div>
                        </div>
                    )}
                    {votingOpen && currentActiveCampaign?.end_date && (
                        <VoteCountdown endDate={currentActiveCampaign.end_date} />
                    )}
                </div>
            )}

            {isLocked && !showConfirmModal && votingOpen && (
                <div className="previous-vote-info noty-vote-locked-banner">
                    <span>Votre vote a été enregistré pour cette catégorie</span>
                    <div className="noty-vote-locked-banner__actions">
                        <button className="btn btn-cancel btn-sm" onClick={handleUnlockVote}>
                            Changer mon vote
                        </button>
                        <button className="btn btn-delete btn-sm" onClick={openWithdrawConfirm}>
                            Retirer mon vote
                        </button>
                    </div>
                </div>
            )}

            {error && <div className="error-message">{error}</div>}

            {!votingOpen && (
                <div className="info-message">
                    Les votes sont clôturés pour cette campagne. Vous pouvez consulter les résultats.
                </div>
            )}

            {!user && votingOpen && (
                <div className="info-message">
                    Connectez-vous pour voter ! Le vote est réservé aux utilisateurs authentifiés.
                </div>
            )}

            <div className="noty-vote-content">
                {votingOpen ? (
                    <div className="noty-vote-content__header">
                        <div>
                            <h2>Sélectionnez jusqu'à 3 nominés</h2>
                            <p className="noty-vote-hint">
                                1er choix = 3 pts, 2e choix = 2 pts, 3e choix = 1 pt.
                                Cliquez dans l'ordre de votre préférence.
                            </p>
                        </div>
                        <SubmitButton inline />
                    </div>
                ) : (
                    <h2>Nominés de cette catégorie</h2>
                )}

                {/* Recherche */}
                {players.length > 8 && (
                    <div className="noty-vote-search">
                        <input
                            type="text"
                            placeholder="Rechercher un nominé..."
                            aria-label="Rechercher un nominé"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                )}

                {/* Grille des nominés */}
                {filteredPlayers.length > 0 ? (
                    <div className={`noty-vote-grid${isLocked ? ' noty-vote-grid--locked' : ''}${nomineeType !== 'player' ? ` noty-vote-grid--${nomineeType}` : ''}`}>
                        {filteredPlayers.map((player) => {
                            const votePosition = isLocked
                                ? (lockedPositions[player.id] ?? -1)
                                : votingState.indexOf(player.id)
                            const isSelected = votePosition >= 0
                            const isDimmed = !isLocked && votingState.length >= 3 && !isSelected
                            const isInteractive = !isLocked && votingOpen && user
                            const hasInteractiveContent = ['video', 'sound'].includes(nomineeType)
                            const CardTag = hasInteractiveContent ? 'div' : 'button'
                            const cardProps = hasInteractiveContent
                                ? { role: 'button', tabIndex: isInteractive ? 0 : -1, 'aria-disabled': !isInteractive, onKeyDown: (e) => { if ((e.key === 'Enter' || e.key === ' ') && isInteractive) { e.preventDefault(); togglePlayer(player.id) } } }
                                : { type: 'button', disabled: !isInteractive }
                            return (
                                <CardTag
                                    key={player.id}
                                    {...cardProps}
                                    className={`noty-player-card noty-player-card--${nomineeType}${isSelected ? ' noty-player-card--selected' : ''}${isDimmed ? ' noty-player-card--dimmed' : ''}`}
                                    onClick={() => isInteractive && togglePlayer(player.id)}
                                    title={!user ? 'Connectez-vous pour voter' : player.pseudo}
                                >
                                    {isSelected && (
                                        <div className="noty-player-card__badge">{votePosition + 1}</div>
                                    )}
                                    {nomineeType === 'player' && (
                                        <div className="noty-player-card__avatar">
                                            {player.image_url ? (
                                                <img src={player.image_url} alt={player.pseudo} loading="lazy" />
                                            ) : (
                                                <span>{player.pseudo.charAt(0).toUpperCase()}</span>
                                            )}
                                        </div>
                                    )}
                                    {(nomineeType === 'image' || nomineeType === 'video' || nomineeType === 'url') && (
                                        <span className="noty-player-card__media-title">{player.pseudo}</span>
                                    )}
                                    {nomineeType === 'image' && (
                                        <div className="noty-player-card__media">
                                            <img src={player.image_url} alt={player.pseudo} loading="lazy" />
                                        </div>
                                    )}
                                    {nomineeType === 'url' && (
                                        <div className={`noty-player-card__media noty-player-card__media--url noty-player-card__media--${detectPlatform(player.media_url)}`}>
                                            <img src={getUrlThumbnail(player.media_url) || player.image_url} alt={player.pseudo} loading="lazy" />
                                            <div className="noty-player-card__play-icon">
                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                                    <path d="M8 5v14l11-7z"/>
                                                </svg>
                                            </div>
                                        </div>
                                    )}
                                    {nomineeType === 'video' && (
                                        <div className="noty-player-card__media noty-player-card__media--video">
                                            {detectPlatform(player.media_url) === 'twitch' ? (
                                                <iframe
                                                    src={`https://clips.twitch.tv/embed?clip=${extractTwitchClipSlug(player.media_url)}&parent=${window.location.hostname}`}
                                                    allowFullScreen
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            ) : detectPlatform(player.media_url) === 'youtube' ? (
                                                <iframe
                                                    src={`https://www.youtube.com/embed/${extractYouTubeId(player.media_url)}`}
                                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                    allowFullScreen
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            ) : (
                                                <video
                                                    src={player.media_url}
                                                    controls
                                                    preload="metadata"
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            )}
                                        </div>
                                    )}
                                    {nomineeType === 'sound' && !player.media_url && (
                                        <div className="noty-player-card__sound-icon">&#9835;</div>
                                    )}
                                    {nomineeType !== 'image' && nomineeType !== 'video' && nomineeType !== 'url' && (
                                        <span className="noty-player-card__name">{player.pseudo}</span>
                                    )}
                                    {nomineeType === 'sound' && player.media_url && (
                                        <SoundWavePlayer src={player.media_url} name={player.pseudo} waveform={player.waveform_data} />
                                    )}
                                </CardTag>
                            )
                        })}
                    </div>
                ) : players.length > 0 ? (
                    <p className="no-nominees">Aucun nominé ne correspond à votre recherche</p>
                ) : (
                    <p className="no-nominees">Aucun nominé pour cette catégorie</p>
                )}

                {/* Bouton soumettre en bas */}
                <SubmitButton />
            </div>

            <VoteConfirmModal
                isOpen={showConfirmModal}
                onClose={() => setShowConfirmModal(false)}
                onChangeVote={handleUnlockVote}
                onGoCategories={() => navigate('/noty/categories')}
                onNextCategory={() => {
                    setShowConfirmModal(false)
                    if (nextCategoryId) navigate(`/noty/vote/${nextCategoryId}`)
                    else navigate('/noty/categories')
                }}
                podiumPlayers={podiumPlayers}
                categoryTitle={category?.title || ''}
                nomineeType={nomineeType}
            />

            <UnsavedVoteModal
                isOpen={showUnsavedModal}
                onCancel={() => { setShowUnsavedModal(false); setPendingNav(null) }}
                onDiscard={() => { setVotingState([]); setShowUnsavedModal(false); if (pendingNav) navigate(pendingNav); setPendingNav(null) }}
                onSave={async () => {
                    const success = await handleSubmitVote()
                    if (success) {
                        setShowUnsavedModal(false)
                        if (pendingNav) navigate(pendingNav)
                        setPendingNav(null)
                    }
                }}
                submitting={submitting}
            />

            <ConfirmModal
                isOpen={showWithdrawModal}
                onClose={() => setShowWithdrawModal(false)}
                onConfirm={handleWithdrawVote}
                title="Retirer mon vote"
                message="Êtes-vous sûr de vouloir retirer votre vote pour cette catégorie ?"
            />

            <NotyCompletionModal
                isOpen={showCompletionModal}
                total={progress?.total}
                onClose={() => {
                    setShowCompletionModal(false)
                    setShowConfirmModal(true)
                }}
            />
        </div>
    )
}
