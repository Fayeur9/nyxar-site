import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { API_URL } from '../services/api'
import { useFetch } from '../hooks'
import { formatDateFr } from '../utils/format'
import { titleToFilename } from '../utils/noty'
import '../styles/pages/NotyPage.css'

export default function PageNotyHallOfFame() {
    const { data: campaigns, loading, error } = useFetch('/api/noty/hall-of-fame')
    const [openCampaignId, setOpenCampaignId] = useState(null)
    const initializedRef = useRef(false)

    useEffect(() => {
        document.title = 'Hall of Fame — NOTY | Nyxar'
    }, [])

    // Ouvrir la première campagne une seule fois au chargement initial
    useEffect(() => {
        if (!initializedRef.current && campaigns?.length > 0) {
            initializedRef.current = true
            setOpenCampaignId(campaigns[0].id)
        }
    }, [campaigns])

    const toggleCampaign = (id) => {
        setOpenCampaignId(prev => prev === id ? null : id)
    }

    if (loading) return <div className="page-container"><div className="noty-hof__loading">Chargement...</div></div>
    if (error) return <div className="page-container"><div className="noty-hof__error">Erreur : {error}</div></div>

    const campaignList = campaigns ?? []

    return (
        <div className="page-container">
            <div className="noty-header">
                <h1 className="page-title">Hall of Fame</h1>
                <p>Historique des campagnes NOTY</p>
                <Link to="/noty" className="noty-hof__back">← Retour au NOTY</Link>
            </div>

            {campaignList.length === 0 ? (
                <div className="noty-hof__empty">Aucune campagne terminée</div>
            ) : (
                <div className="noty-hof">
                    {campaignList.map(campaign => (
                        <div key={campaign.id} className="noty-hof__campaign">
                            <button
                                className={`noty-hof__campaign-header ${openCampaignId === campaign.id ? 'noty-hof__campaign-header--open' : ''}`}
                                onClick={() => toggleCampaign(campaign.id)}
                            >
                                <div className="noty-hof__campaign-info">
                                    <h2 className="noty-hof__campaign-title">{campaign.title}</h2>
                                    <span className="noty-hof__campaign-dates">
                                        {formatDateFr(campaign.start_date)} — {formatDateFr(campaign.end_date)}
                                    </span>
                                </div>
                                <span className="noty-hof__campaign-toggle">
                                    {openCampaignId === campaign.id ? '−' : '+'}
                                </span>
                            </button>

                            {openCampaignId === campaign.id && (
                                <CampaignBody campaign={campaign} />
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

const PAGE_SIZE = 15

function CampaignBody({ campaign }) {
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(1)
    const query = search.trim().toLowerCase()

    const filtered = query
        ? campaign.categories.filter(c => c.title.toLowerCase().includes(query))
        : campaign.categories

    const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
    const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

    const handleSearch = (e) => {
        setSearch(e.target.value)
        setPage(1)
    }

    return (
        <div className="noty-hof__campaign-body">
            <div className="noty-hof__search-wrap">
                <input
                    type="search"
                    className="noty-hof__search"
                    placeholder="Rechercher une catégorie…"
                    value={search}
                    onChange={handleSearch}
                />
            </div>

            {filtered.length === 0 ? (
                <div className="noty-hof__no-votes">Aucune catégorie trouvée</div>
            ) : (
                <>
                    <Pagination page={page} totalPages={totalPages} setPage={setPage} />

                    <div className="noty-hof__categories-grid">
                        {visible.map(category => (
                            <HofCategoryCard
                                key={category.id}
                                category={category}
                                campaignId={campaign.id}
                                cardsAvailable={campaign.cards_available}
                            />
                        ))}
                    </div>

                    <Pagination page={page} totalPages={totalPages} setPage={setPage} />
                </>
            )}

            {campaign.cards_available && (
                <div className="noty-hof__campaign-actions">
                    <a
                        href={`${API_URL}/api/noty/campaigns/${campaign.id}/cards/all.zip`}
                        className="noty-hof__download-all"
                        download
                        rel="noopener noreferrer"
                    >
                        Télécharger toutes les cartes
                    </a>
                </div>
            )}
        </div>
    )
}

function Pagination({ page, totalPages, setPage }) {
    if (totalPages <= 1) return null
    return (
        <div className="noty-hof__pagination">
            <button
                className="noty-hof__page-btn"
                onClick={() => setPage(p => p - 1)}
                disabled={page === 1}
            >
                ‹
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                <button
                    key={n}
                    className={`noty-hof__page-btn${n === page ? ' noty-hof__page-btn--active' : ''}`}
                    onClick={() => setPage(n)}
                >
                    {n}
                </button>
            ))}
            <button
                className="noty-hof__page-btn"
                onClick={() => setPage(p => p + 1)}
                disabled={page === totalPages}
            >
                ›
            </button>
        </div>
    )
}

function HofCategoryCard({ category, campaignId, cardsAvailable }) {
    const podium = category.podium || []
    const [copied, setCopied] = useState(false)

    const top3 = podium.slice(0, 3)
    const rest = podium.slice(3)

    // Réorganiser : 2e - 1er - 3e
    const spots = [
        { rank: 2, nominee: top3[1] || null, className: 'podium__spot--2nd' },
        { rank: 1, nominee: top3[0] || null, className: 'podium__spot--1st' },
        { rank: 3, nominee: top3[2] || null, className: 'podium__spot--3rd' },
    ]

    const handleShare = useCallback(async () => {
        const winner = podium[0]?.name
        const shareText = winner
            ? `NOTY — ${category.title} : victoire de ${winner} !`
            : `NOTY — ${category.title}`
        const shareUrl = `${window.location.origin}/noty/hall-of-fame`

        if (navigator.share) {
            try {
                await navigator.share({ title: `NOTY — ${category.title}`, text: shareText, url: shareUrl })
            } catch {
                // Annulé par l'utilisateur
            }
        } else {
            try {
                await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`)
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
            } catch {
                // Fallback silencieux
            }
        }
    }, [category.title, podium])

    return (
        <div className="noty-hof__category-card">
            <h3 className="noty-hof__category-title">{category.title}</h3>

            {top3.length === 0 ? (
                <div className="noty-hof__no-votes">Pas de votes</div>
            ) : (
                <>
                    <div className="podium">
                        {spots.map(({ rank, nominee, className }) => (
                            <div key={rank} className={`podium__spot ${className}`}>
                                {nominee ? (
                                    <>
                                        <div className="podium__avatar-wrap">
                                            {nominee.image_url ? (
                                                <img
                                                    className="podium__avatar"
                                                    src={nominee.image_url}
                                                    alt={nominee.name}
                                                    loading="lazy"
                                                />
                                            ) : (
                                                <div className="podium__avatar podium__avatar--placeholder">
                                                    {nominee.name?.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                        <span className="podium__name">{nominee.name}</span>
                                        <span className="podium__rank">{rank}</span>
                                        <div className="noty-hof__nominee-stats">
                                            <span className="noty-hof__points">{nominee.total_points} pts</span>
                                            <span className="noty-hof__votes">{nominee.vote_count} vote{nominee.vote_count > 1 ? 's' : ''}</span>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="podium__empty">—</div>
                                        <span className="podium__name"></span>
                                        <span className="podium__rank podium__rank--empty">{rank}</span>
                                    </>
                                )}
                                <div className="podium__bar"></div>
                            </div>
                        ))}
                    </div>

                    {rest.length > 0 && (
                        <ol className="noty-hof__rest" start={4}>
                            {rest.map((nominee, i) => (
                                <li key={nominee.name} className="noty-hof__rest-item">
                                    <span className="noty-hof__rest-rank">{i + 4}</span>
                                    {nominee.image_url && (
                                        <img
                                            className="noty-hof__rest-avatar"
                                            src={nominee.image_url}
                                            alt={nominee.name}
                                            loading="lazy"
                                        />
                                    )}
                                    <span className="noty-hof__rest-name">{nominee.name}</span>
                                    <span className="noty-hof__rest-pts">{nominee.total_points} pts</span>
                                </li>
                            ))}
                        </ol>
                    )}
                </>
            )}

            <div className="noty-hof__card-actions">
                <button
                    className={`noty-hof__share-btn${copied ? ' noty-hof__share-btn--copied' : ''}`}
                    onClick={handleShare}
                    title="Partager cette catégorie"
                    aria-label={`Partager la catégorie ${category.title}`}
                >
                    {copied ? 'Lien copié !' : 'Partager'}
                </button>
                {cardsAvailable && (
                    <a
                        href={`${API_URL}/api/noty/campaigns/${campaignId}/cards/${titleToFilename(category.title)}.png`}
                        className="noty-hof__download-card"
                        download
                    >
                        Télécharger la carte
                    </a>
                )}
            </div>
        </div>
    )
}
