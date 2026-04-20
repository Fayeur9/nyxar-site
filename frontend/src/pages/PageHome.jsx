import { useState, useEffect, useContext } from 'react'
import { Link } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'
import { Swiper, SwiperSlide } from 'swiper/react'
import { EffectCube, Autoplay } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/effect-cube'
import { API_URL } from '../services/api'
import HeroBanner from '../components/home/HeroBanner'
import PlayerCard from '../components/players/PlayerCard'
import '../styles/pages/LineUpsPage.css'

export default function PageHome() {
    const { token } = useContext(AuthContext)
    const [staff, setStaff] = useState([])
    const [loadingStaff, setLoadingStaff] = useState(true)
    const [competitions, setCompetitions] = useState([])
    const [loadingCompetitions, setLoadingCompetitions] = useState(true)

    useEffect(() => {
        document.title = 'Accueil | Nyxar'
    }, [])

    useEffect(() => {
        fetchStaff()
        fetchCompetitions()
    }, [])

    const fetchStaff = async () => {
        try {
            const headers = token ? { 'Authorization': `Bearer ${token}` } : {}
            const response = await fetch(`${API_URL}/api/nyxariens/poste/staff`, { headers })
            if (response.ok) setStaff(await response.json())
        } catch (err) {
            console.error('Erreur chargement staff:', err)
        } finally {
            setLoadingStaff(false)
        }
    }

    const fetchCompetitions = async () => {
        try {
            const response = await fetch(`${API_URL}/api/competitions/public`)
            if (response.ok) {
                const data = await response.json()
                setCompetitions(data.slice(0, 3))
            }
        } catch (err) {
            console.error('Erreur chargement compétitions:', err)
        } finally {
            setLoadingCompetitions(false)
        }
    }

    return (
        <>
            <HeroBanner />

            <div className="page-wrapper landing-page">
                <section className="section section--padded">
                    <div className="container landing-hero landing-hero--minimal">
                        <div className="landing-hero__visual">
                            <img src="/logo_main.png" alt="Logo NYXAR" className="landing-hero__logo" />
                        </div>
                        <div className="landing-hero__content">
                            <h1 className="landing-hero__title">NYXAR</h1>
                            <p className="landing-hero__subtitle">Équipe e-sport depuis mars 2025</p>
                        </div>
                    </div>
                </section>

                <section className="section section--padded" id="about">
                    <div className="container">
                        <div className="story-highlight">
                            <div className="story-highlight__visual">
                                <img src="/kuumba.png" alt="Kuumba - Fondateur de NYXAR" className="story-highlight__image" />
                            </div>
                            <div className="story-highlight__content">
                                <h2 className="story-highlight__title">Notre Histoire</h2>
                                <p className="story-highlight__text">
                                    Tout a commencé avec la KCUP, une équipe créée par Kuumba pour jouer entre copains.
                                    On était là pour le fun, sans pression, juste pour partager notre passion du jeu ensemble.
                                </p>
                                <p className="story-highlight__text">
                                    Puis est arrivée une compétition en équipe où on s'est particulièrement bien débrouillés.
                                    Ce déclic nous a poussés à voir plus grand : c'est ainsi qu'est née <strong>NYXAR</strong>,
                                    dont le nom et l'identité visuelle s'inspirent de la déesse Nyx.
                                </p>
                                <p className="story-highlight__text">
                                    Au début, on ne recrutait que des joueurs de niveau confirmé, comme nous.
                                    Mais face aux demandes d'amis de niveau intermédiaire, on a créé <strong>NYXAR Academy</strong>.
                                    Puis, avec l'arrivée de profils réellement compétitifs, une troisième line-up est née :
                                    <strong> NYXAR Compétitive</strong>.
                                </p>
                                <p className="story-highlight__text">
                                    Aujourd'hui, nous sommes <strong>38 sur Trackmania</strong> et <strong>8 sur Rematch</strong>.
                                    Notre ambition : continuer à grandir et s'imposer sur la scène Trackmania et Rematch, à notre échelle.
                                </p>
                                <p className="story-highlight__credit">
                                    <strong>Fondateur :</strong> Kuumba
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="section section--padded">
                    <div className="container">
                        <div className="section-header">
                            <h2>Notre Staff</h2>
                            <p className="section-subtitle">Les personnes qui pilotent NYXAR au quotidien</p>
                        </div>
                        {loadingStaff ? (
                            <p className="landing-placeholder">Chargement...</p>
                        ) : staff.length === 0 ? (
                            <p className="landing-placeholder">Aucun membre du staff pour le moment</p>
                        ) : (
                            <>
                                <div className="lineup-players staff-showcase">
                                    {staff.map((member) => (
                                        <PlayerCard key={member.id} player={member} className="staff-card" />
                                    ))}
                                </div>
                                <div className="section-footer">
                                    <Link to="/teams" className="btn btn-primary">
                                        Voir toute l'équipe →
                                    </Link>
                                </div>
                            </>
                        )}
                    </div>
                </section>

                <section className="section section--padded competitions-showcase">
                    <div className="container">
                        <div className="competitions-showcase__layout">
                            <div className="competitions-showcase__content">
                                <h2 className="competitions-showcase__title">L'e-sport, notre passion</h2>
                                <p className="competitions-showcase__text">
                                    Chez NYXAR, l'e-sport n'est pas qu'un hobby, c'est une vraie passion qui nous anime au quotidien.
                                    Nous croyons que la compétition donne vie aux communautés et révèle le meilleur de chaque joueur.
                                </p>
                                <p className="competitions-showcase__text">
                                    C'est pourquoi nous organisons des compétitions variées : différents jeux, différents formats,
                                    et toujours des <strong>cash prizes</strong> pour récompenser les meilleurs et donner vie
                                    aux scènes que nous aimons tant.
                                </p>
                                <p className="competitions-showcase__text">
                                    De l'endurance aux formats alternatifs, en passant par nos séries mensuelles,
                                    chaque événement est pensé pour créer des moments mémorables.
                                </p>
                                <Link to="/competitions" className="btn btn-primary btn-lg">
                                    Voir nos compétitions
                                </Link>
                            </div>

                            <div className="competitions-showcase__slider">
                                {loadingCompetitions ? (
                                    <div className="cube-slider-placeholder">Chargement...</div>
                                ) : competitions.length === 0 ? (
                                    <div className="cube-slider-placeholder">Aucune compétition</div>
                                ) : (
                                    <Swiper
                                        effect="cube"
                                        grabCursor={true}
                                        loop={true}
                                        speed={1000}
                                        autoplay={{
                                            delay: 2000,
                                            disableOnInteraction: false,
                                            pauseOnMouseEnter: true
                                        }}
                                        cubeEffect={{
                                            shadow: false,
                                            slideShadows: true,
                                            shadowOffset: 10,
                                            shadowScale: 0.94
                                        }}
                                        modules={[EffectCube, Autoplay]}
                                        className="cube-slider"
                                    >
                                        {competitions.map((comp) => (
                                            <SwiperSlide key={comp.id}>
                                                <div
                                                    className="cube-slide"
                                                    style={{
                                                        backgroundImage: comp.image ? `url(${comp.image})` : 'none',
                                                        backgroundColor: comp.image ? 'transparent' : 'var(--bg-secondary)'
                                                    }}
                                                >
                                                    {comp.prize && (
                                                        <div className="cube-slide__prize">{comp.prize}</div>
                                                    )}
                                                    <div className="cube-slide__overlay">
                                                        <span className="cube-slide__badge">{comp.game}</span>
                                                        <h3 className="cube-slide__title">{comp.title}</h3>
                                                        {comp.description && (
                                                            <p className="cube-slide__description">{comp.description}</p>
                                                        )}
                                                        <span className="cube-slide__date">{comp.date}</span>
                                                    </div>
                                                </div>
                                            </SwiperSlide>
                                        ))}
                                    </Swiper>
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                <section className="section section--padded">
                    <div className="container">
                        <div className="section-header">
                            <h2>Nos Objectifs</h2>
                        </div>
                        <div className="grid grid--3 objective-grid">
                            <article className="card objective-card">
                                <div className="objective-card__icon">🏆</div>
                                <h3>Organiser des compétitions</h3>
                                <p>Créer des événements accessibles à tous les niveaux, avec des formats originaux et des cash prizes.</p>
                            </article>
                            <article className="card objective-card">
                                <div className="objective-card__icon">📈</div>
                                <h3>Permettre la progression</h3>
                                <p>Accompagner chaque joueur dans sa montée en compétences, de l'Academy jusqu'au niveau Compétitif.</p>
                            </article>
                            <article className="card objective-card">
                                <div className="objective-card__icon">🤝</div>
                                <h3>Créer une communauté</h3>
                                <p>Rassembler des passionnés autour de Trackmania et Rematch dans une ambiance conviviale.</p>
                            </article>
                        </div>
                    </div>
                </section>
            </div>
        </>
    )
}
