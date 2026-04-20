import { useState, useEffect, useCallback } from 'react'
import { API_URL } from '../../services/api'

const COLORS = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe', '#43e97b', '#38f9d7']

// Cache du module recharts au niveau module (chargé une seule fois)
let rechartsCache = null
const rechartsPromise = (() => {
    const mod = 'recharts'
    return import(/* @vite-ignore */ mod)
        .then(module => { rechartsCache = module; return module })
        .catch(() => null)
})()

export default function NotyDashboard({ campaignId, token }) {
    const [stats, setStats] = useState(null)
    const [loading, setLoading] = useState(true)
    const [recharts, setRecharts] = useState(rechartsCache)

    // Chargement dynamique de Recharts (optionnel)
    useEffect(() => {
        if (recharts) return
        rechartsPromise.then(module => { if (module) setRecharts(module) })
    }, [])
    const [error, setError] = useState(null)

    const fetchStats = useCallback(async () => {
        setLoading(true)
        try {
            const response = await fetch(`${API_URL}/api/noty/campaigns/${campaignId}/stats`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (!response.ok) throw new Error('Erreur récupération stats')
            const data = await response.json()
            setStats(data)
            setError(null)
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [campaignId, token])

    useEffect(() => {
        fetchStats()
    }, [fetchStats])

    if (loading) {
        return <div className="c-admin-state loading">Chargement des statistiques...</div>
    }

    if (error) {
        return <div className="c-admin-alert c-admin-alert--error">{error}</div>
    }

    if (!stats) return null

    const { overview, charts, alerts, engagement } = stats
    const hasRecharts = !!recharts

    // Destructure Recharts components if available
    const {
        ResponsiveContainer, AreaChart, Area, BarChart, Bar,
        LineChart, Line, PieChart, Pie, Cell,
        XAxis, YAxis, CartesianGrid, Tooltip
    } = recharts || {}

    return (
        <div className="c-noty-dashboard">
            {/* Header avec export */}
            <div className="c-noty-dashboard__header">
                <button
                    className="c-admin-button c-admin-button--sm c-admin-button--secondary"
                    onClick={async () => {
                        try {
                            const res = await fetch(`${API_URL}/api/noty/campaigns/${campaignId}/export-csv`, {
                                headers: { 'Authorization': `Bearer ${token}` }
                            })
                            if (!res.ok) throw new Error('Erreur export')
                            const blob = await res.blob()
                            const disposition = res.headers.get('Content-Disposition') || ''
                            const match = disposition.match(/filename="(.+)"/)
                            const filename = match ? match[1] : 'noty-results.csv'
                            const url = URL.createObjectURL(blob)
                            const a = document.createElement('a')
                            a.href = url
                            a.download = filename
                            a.click()
                            URL.revokeObjectURL(url)
                        } catch (err) {
                            setError(err.message)
                        }
                    }}
                    title="Exporter les résultats en CSV"
                >
                    📥 Exporter CSV
                </button>
            </div>

            {/* Progress de la campagne */}
            <div className="c-noty-dashboard__progress">
                <div className="c-noty-progress">
                    <div className="c-noty-progress__header">
                        <span className="c-noty-progress__label">Progression de la campagne</span>
                        <span className="c-noty-progress__value">{overview.progressPercent}%</span>
                    </div>
                    <div className="c-noty-progress__bar">
                        <div
                            className="c-noty-progress__fill"
                            style={{ width: `${overview.progressPercent}%` }}
                        />
                    </div>
                    <div className="c-noty-progress__footer">
                        {overview.daysRemaining > 0 ? (
                            <span>{overview.daysRemaining} jour{overview.daysRemaining > 1 ? 's' : ''} restant{overview.daysRemaining > 1 ? 's' : ''}</span>
                        ) : (
                            <span className="c-noty-progress__ended">Campagne terminée</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Stats principales */}
            <div className="c-noty-dashboard__grid">
                <div className="c-noty-stat-card">
                    <div className="c-noty-stat-card__icon" aria-hidden="true">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                            <circle cx="9" cy="7" r="4"/>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                        </svg>
                    </div>
                    <div className="c-noty-stat-card__content">
                        <div className="c-noty-stat-card__value">{overview.totalVoters}</div>
                        <div className="c-noty-stat-card__label">Votants</div>
                        <div className="c-noty-stat-card__sub">
                            {overview.participationRate}% de participation
                        </div>
                    </div>
                </div>
                <div className="c-noty-stat-card">
                    <div className="c-noty-stat-card__icon" aria-hidden="true">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 8h1a4 4 0 0 1 0 8h-1"/>
                            <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/>
                            <line x1="6" y1="1" x2="6" y2="4"/>
                            <line x1="10" y1="1" x2="10" y2="4"/>
                            <line x1="14" y1="1" x2="14" y2="4"/>
                        </svg>
                    </div>
                    <div className="c-noty-stat-card__content">
                        <div className="c-noty-stat-card__value">{overview.totalVotes}</div>
                        <div className="c-noty-stat-card__label">Votes</div>
                        <div className="c-noty-stat-card__sub">
                            {overview.avgCategoriesPerVoter} cat./votant en moy.
                        </div>
                    </div>
                </div>
                <div className="c-noty-stat-card">
                    <div className="c-noty-stat-card__icon" aria-hidden="true">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                            <line x1="12" y1="11" x2="12" y2="17"/>
                            <line x1="9" y1="14" x2="15" y2="14"/>
                        </svg>
                    </div>
                    <div className="c-noty-stat-card__content">
                        <div className="c-noty-stat-card__value">{overview.totalCategories}</div>
                        <div className="c-noty-stat-card__label">Catégories</div>
                        <div className="c-noty-stat-card__sub">
                            {overview.avgVotesPerCategory} votes/cat. en moy.
                        </div>
                    </div>
                </div>
                <div className="c-noty-stat-card">
                    <div className="c-noty-stat-card__icon" aria-hidden="true">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"/>
                            <circle cx="12" cy="12" r="6"/>
                            <circle cx="12" cy="12" r="2"/>
                        </svg>
                    </div>
                    <div className="c-noty-stat-card__content">
                        <div className="c-noty-stat-card__value">{overview.totalNominees}</div>
                        <div className="c-noty-stat-card__label">Nominés</div>
                    </div>
                </div>
            </div>

            {/* Alertes */}
            {(alerts.categoriesWithoutVotes.length > 0 || alerts.closeCompetitions.length > 0) && (
                <div className="c-noty-dashboard__alerts">
                    {alerts.categoriesWithoutVotes.length > 0 && (
                        <div className="c-noty-alert c-noty-alert--warning">
                            <span className="c-noty-alert__icon">⚠️</span>
                            <span className="c-noty-alert__text">
                                {alerts.categoriesWithoutVotes.length} catégorie{alerts.categoriesWithoutVotes.length > 1 ? 's' : ''} sans vote :
                                {' '}{alerts.categoriesWithoutVotes.map(c => c.title).join(', ')}
                            </span>
                        </div>
                    )}
                    {alerts.closeCompetitions.length > 0 && (
                        <div className="c-noty-alert c-noty-alert--info">
                            <span className="c-noty-alert__icon">🔥</span>
                            <span className="c-noty-alert__text">
                                {alerts.closeCompetitions.length} compétition{alerts.closeCompetitions.length > 1 ? 's' : ''} serrée{alerts.closeCompetitions.length > 1 ? 's' : ''} (écart {'<'} 2 pts)
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* Graphiques */}
            <div className="c-noty-dashboard__charts">
                {/* Evolution des votes */}
                {charts.votesPerDay.length > 0 && (
                    <div className="c-noty-chart-card">
                        <h4 className="c-noty-chart-card__title">📈 Évolution des votes</h4>
                        <div className="c-noty-chart-card__content">
                            {hasRecharts ? (
                                <ResponsiveContainer width="100%" height={200}>
                                    <AreaChart data={charts.votesPerDay}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                        <XAxis
                                            dataKey="date"
                                            stroke="#888"
                                            tick={{ fill: '#888', fontSize: 11 }}
                                            tickFormatter={(d) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                                        />
                                        <YAxis stroke="#888" tick={{ fill: '#888', fontSize: 11 }} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #333' }}
                                            labelFormatter={(d) => new Date(d).toLocaleDateString('fr-FR')}
                                        />
                                        <Area type="monotone" dataKey="count" stroke="#667eea" fill="url(#colorGradient)" />
                                        <defs>
                                            <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#667eea" stopOpacity={0.8}/>
                                                <stop offset="95%" stopColor="#667eea" stopOpacity={0.1}/>
                                            </linearGradient>
                                        </defs>
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="c-noty-chart-fallback">
                                    <p>Installer recharts pour voir ce graphique</p>
                                    <code>npm install recharts</code>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Votes par catégorie */}
                {charts.votersPerCategory.length > 0 && (
                    <div className="c-noty-chart-card">
                        <h4 className="c-noty-chart-card__title">📊 Votants par catégorie</h4>
                        <div className="c-noty-chart-card__content">
                            {hasRecharts ? (
                                <ResponsiveContainer width="100%" height={Math.max(200, charts.votersPerCategory.length * 35)}>
                                    <BarChart data={charts.votersPerCategory} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                        <XAxis type="number" stroke="#888" tick={{ fill: '#888', fontSize: 11 }} />
                                        <YAxis
                                            type="category"
                                            dataKey="title"
                                            stroke="#888"
                                            tick={{ fill: '#888', fontSize: 11 }}
                                            width={120}
                                        />
                                        <Tooltip contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #333' }} />
                                        <Bar dataKey="voters_count" fill="#667eea" radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="c-noty-simple-bars">
                                    {charts.votersPerCategory.map((cat, i) => (
                                        <div key={cat.id} className="c-noty-simple-bar">
                                            <span className="c-noty-simple-bar__label">{cat.title}</span>
                                            <div className="c-noty-simple-bar__track">
                                                <div
                                                    className="c-noty-simple-bar__fill"
                                                    style={{
                                                        width: `${(cat.voters_count / Math.max(...charts.votersPerCategory.map(c => c.voters_count))) * 100}%`,
                                                        backgroundColor: COLORS[i % COLORS.length]
                                                    }}
                                                />
                                            </div>
                                            <span className="c-noty-simple-bar__value">{cat.voters_count}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Votes par jour de la semaine */}
                {charts.votesByDayOfWeek.length > 0 && (
                    <div className="c-noty-chart-card c-noty-chart-card--half">
                        <h4 className="c-noty-chart-card__title">📅 Votes par jour</h4>
                        <div className="c-noty-chart-card__content">
                            {hasRecharts ? (
                                <ResponsiveContainer width="100%" height={180}>
                                    <BarChart data={charts.votesByDayOfWeek}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                        <XAxis dataKey="day_name" stroke="#888" tick={{ fill: '#888', fontSize: 11 }} />
                                        <YAxis stroke="#888" tick={{ fill: '#888', fontSize: 11 }} />
                                        <Tooltip contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #333' }} />
                                        <Bar dataKey="count" fill="#764ba2" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="c-noty-simple-bars c-noty-simple-bars--vertical">
                                    {charts.votesByDayOfWeek.map((d, i) => (
                                        <div key={d.day_of_week} className="c-noty-simple-bar c-noty-simple-bar--vertical">
                                            <div
                                                className="c-noty-simple-bar__fill"
                                                style={{
                                                    height: `${(d.count / Math.max(...charts.votesByDayOfWeek.map(x => x.count))) * 100}%`,
                                                    backgroundColor: COLORS[i % COLORS.length]
                                                }}
                                            />
                                            <span className="c-noty-simple-bar__label">{d.day_name}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Votes par heure */}
                {charts.votesByHour.length > 0 && (
                    <div className="c-noty-chart-card c-noty-chart-card--half">
                        <h4 className="c-noty-chart-card__title">🕐 Votes par heure</h4>
                        <div className="c-noty-chart-card__content">
                            {hasRecharts ? (
                                <ResponsiveContainer width="100%" height={180}>
                                    <LineChart data={charts.votesByHour}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                        <XAxis
                                            dataKey="hour"
                                            stroke="#888"
                                            tick={{ fill: '#888', fontSize: 11 }}
                                            tickFormatter={(h) => `${h}h`}
                                        />
                                        <YAxis stroke="#888" tick={{ fill: '#888', fontSize: 11 }} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #333' }}
                                            labelFormatter={(h) => `${h}h - ${h + 1}h`}
                                        />
                                        <Line type="monotone" dataKey="count" stroke="#f093fb" strokeWidth={2} dot={{ fill: '#f093fb' }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="c-noty-chart-fallback">
                                    <p>Installer recharts pour voir ce graphique</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Distribution des points */}
                {charts.pointsDistribution && (
                    <div className="c-noty-chart-card c-noty-chart-card--half">
                        <h4 className="c-noty-chart-card__title">🎯 Distribution des choix</h4>
                        <div className="c-noty-chart-card__content">
                            {hasRecharts ? (
                                <ResponsiveContainer width="100%" height={180}>
                                    <PieChart>
                                        <Pie
                                            data={[
                                                { name: '1er choix (2pts)', value: charts.pointsDistribution.first_choices },
                                                { name: '2ème choix (1.5pts)', value: charts.pointsDistribution.second_choices },
                                                { name: '3ème choix (1pt)', value: charts.pointsDistribution.third_choices }
                                            ]}
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={60}
                                            dataKey="value"
                                            label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                                        >
                                            <Cell fill="#667eea" />
                                            <Cell fill="#764ba2" />
                                            <Cell fill="#f093fb" />
                                        </Pie>
                                        <Tooltip contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #333' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="c-noty-distribution">
                                    <div className="c-noty-distribution__item">
                                        <span className="c-noty-distribution__dot" style={{ backgroundColor: '#667eea' }} />
                                        <span>1er choix: {charts.pointsDistribution.first_choices}</span>
                                    </div>
                                    <div className="c-noty-distribution__item">
                                        <span className="c-noty-distribution__dot" style={{ backgroundColor: '#764ba2' }} />
                                        <span>2ème choix : {charts.pointsDistribution.second_choices}</span>
                                    </div>
                                    <div className="c-noty-distribution__item">
                                        <span className="c-noty-distribution__dot" style={{ backgroundColor: '#f093fb' }} />
                                        <span>3ème choix : {charts.pointsDistribution.third_choices}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Top 10 nominés */}
            {charts.topNominees.length > 0 && (
                <div className="c-noty-dashboard__top">
                    <h4 className="c-noty-dashboard__section-title">🏆 Top 10 Global</h4>
                    <div className="c-noty-top-list">
                        {charts.topNominees.map((nominee, index) => (
                            <div key={nominee.id} className={`c-noty-top-item c-noty-top-item--rank${index + 1}`}>
                                <div className="c-noty-top-item__rank">
                                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                                </div>
                                <div className="c-noty-top-item__avatar">
                                    {nominee.image_url ? (
                                        <img src={nominee.image_url} alt={nominee.pseudo} />
                                    ) : (
                                        <span>{nominee.pseudo[0]}</span>
                                    )}
                                </div>
                                <div className="c-noty-top-item__info">
                                    <span className="c-noty-top-item__name">{nominee.pseudo}</span>
                                </div>
                                <div className="c-noty-top-item__stats">
                                    <span className="c-noty-top-item__points">{nominee.total_points} pts</span>
                                    <span className="c-noty-top-item__votes">{nominee.vote_count} votes</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Votants les plus actifs */}
            {engagement.mostActiveVoters.length > 0 && (
                <div className="c-noty-dashboard__engagement">
                    <h4 className="c-noty-dashboard__section-title">⭐ Votants les plus actifs</h4>
                    <div className="c-noty-voters-list">
                        {engagement.mostActiveVoters.map((voter, index) => (
                            <div key={voter.id} className="c-noty-voter-item">
                                <span className="c-noty-voter-item__rank">#{index + 1}</span>
                                <span className="c-noty-voter-item__name">{voter.username}</span>
                                <span className="c-noty-voter-item__count">{voter.categories_voted} catégories</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Compétitions serrées */}
            {alerts.closeCompetitions.length > 0 && (
                <div className="c-noty-dashboard__close-races">
                    <h4 className="c-noty-dashboard__section-title">🔥 Compétitions serrées</h4>
                    <div className="c-noty-close-list">
                        {alerts.closeCompetitions.map((comp) => (
                            <div key={comp.id} className="c-noty-close-item">
                                <span className="c-noty-close-item__category">{comp.title}</span>
                                <span className="c-noty-close-item__leader">{comp.first_name}</span>
                                <span className="c-noty-close-item__gap">+{comp.gap} pts</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
