import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Pagination, Mousewheel } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/pagination'
import { useFetch } from '../hooks'
import PlayerCard from '../components/players/PlayerCard'
import '../styles/pages/EventPage.css'

const SLIDER_PHOTOS = [
    { src: '/uploads/resultats/insa-2026/slider/IMG_7091.jpg', alt: 'INSA LAN 2026 - photo 1',  title: 'Photo 1' },
    { src: '/uploads/resultats/insa-2026/slider/IMG_7088.jpg', alt: 'INSA LAN 2026 - photo 2',  title: 'Photo 2' },
    { src: '/uploads/resultats/insa-2026/slider/IMG_7078.jpg', alt: 'INSA LAN 2026 - photo 3',  title: 'Photo 3' },
    { src: '/uploads/resultats/insa-2026/slider/IMG_7063.jpg', alt: 'INSA LAN 2026 - photo 4',  title: 'Photo 4' },
    { src: '/uploads/resultats/insa-2026/slider/IMG_7091.jpg', alt: 'INSA LAN 2026 - photo 5',  title: 'Photo 5' },
    { src: '/uploads/resultats/insa-2026/slider/IMG_7091.jpg', alt: 'INSA LAN 2026 - photo 6',  title: 'Photo 6' },
    { src: '/uploads/resultats/insa-2026/slider/slider-7.jpg', alt: 'INSA LAN 2026 - photo 7',  title: 'Photo 7' },
    { src: '/uploads/resultats/insa-2026/slider/slider-8.jpg', alt: 'INSA LAN 2026 - photo 8',  title: 'Photo 8' },
    { src: '/uploads/resultats/insa-2026/slider/slider-9.jpg', alt: 'INSA LAN 2026 - photo 9',  title: 'Photo 9' },
    { src: '/uploads/resultats/insa-2026/slider/slider-10.jpg', alt: 'INSA LAN 2026 - photo 10', title: 'Photo 10' },
    { src: '/uploads/resultats/insa-2026/slider/slider-11.jpg', alt: 'INSA LAN 2026 - photo 11', title: 'Photo 11' },
    { src: '/uploads/resultats/insa-2026/slider/slider-12.jpg', alt: 'INSA LAN 2026 - photo 12', title: 'Photo 12' },
]

const RAG_CUP_PODIUM = [
    { rank: 2, pseudo: 'Roquett', img: '/uploads/resultats/insa-2026/rag-cup/roquett.png', className: 'podium__spot--2nd' },
    { rank: 1, pseudo: 'Golio',   img: '/uploads/resultats/insa-2026/rag-cup/golio.png',   className: 'podium__spot--1st' },
    { rank: 3, pseudo: 'Doyle',   img: '/uploads/resultats/insa-2026/rag-cup/doyle.png',   className: 'podium__spot--3rd' },
]

const RAG_CUP_LIQUIPEDIA = 'https://liquipedia.net/trackmania/InsaLan_XX/Bonus_Cup'
const ELITE_LIQUIPEDIA   = 'https://liquipedia.net/trackmania/InsaLan_XX/Elite'
const AMATEUR_LIQUIPEDIA = 'https://liquipedia.net/trackmania/InsaLan_XX/Amateur'

// Roster complet — section "L'équipe présente" (sans badge)
const ROSTER = [
    'Quentin43', 'Roquett', 'Tommy', 'Aapril', 'Fayeur', 'Bvddy', 'Kuumba',
    'Rag', 'Senjojoveller', 'Dolit0x', 'Ujimaa',
]

// Résultats — section dédiée (avec photo + rank)
const PLAYERS_ELITE = [
    { pseudo: 'Quentin43', rank: 'Top 9-12' },
    { pseudo: 'Roquett',   rank: 'Top 9-12' },
    { pseudo: 'Tommy',     rank: 'Top 17-24' },
    { pseudo: 'Aapril',    rank: 'Top 25-32' },
]
const PLAYERS_AMATEUR = [
    { pseudo: 'Fayeur', rank: 'Top 9-12' },
    { pseudo: 'Bvddy',  rank: 'Top 9-12' },
]

function PhotoSlider({ photos }) {
    return (
        <div className="photo-slider">
            <Swiper
                modules={[Pagination, Mousewheel]}
                grabCursor={true}
                initialSlide={0}
                centeredSlides={true}
                slidesPerView="auto"
                spaceBetween={10}
                speed={1000}
                freeMode={false}
                mousewheel={{ thresholdDelta: 30 }}
                pagination={{ el: '.swiper-pagination', clickable: true }}
                onClick={(swiper) => swiper.slideTo(swiper.clickedIndex)}
                className="photo-slider__swiper"
            >
                {photos.map((photo, i) => (
                    <SwiperSlide key={i} className="photo-slider__slide">
                        <img src={photo.src} alt={photo.alt} />
                        <p>{photo.title}</p>
                    </SwiperSlide>
                ))}
                <div className="swiper-pagination"></div>
            </Swiper>
        </div>
    )
}

function RosterPlayerCard({ player }) {
    return (
        <div className="event-roster-card">
            <PlayerCard player={player} className="event-roster-card__playercard" />
        </div>
    )
}

function ResultPlayerCard({ player, rank, type }) {
    return (
        <div className="event-roster-card">
            <PlayerCard player={player} className="event-roster-card__playercard" />
            <span className={`event-roster-card__badge event-roster-card__badge--${type}`}>{rank}</span>
        </div>
    )
}

export default function PageInsaLan2026() {
    const { data: nyxariensData } = useFetch('/api/nyxariens')
    const nyxariens = nyxariensData ?? []

    useEffect(() => {
        document.title = 'INSA LAN 2026 | Nyxar'
    }, [])

    // Lookup pseudo (insensible à la casse) → données nyxarien
    const byPseudo = Object.fromEntries(
        nyxariens.map(p => [p.pseudo.toLowerCase(), p])
    )

    const getPlayer = (pseudo) =>
        byPseudo[pseudo.toLowerCase()] ?? { pseudo }

    return (
        <div className="event-page">

            <header className="event-page__hero"></header>

            <div className="event-page__body">
                <Link to="/resultats" className="event-page__back">← Retour aux résultats</Link>
                <h1 className="event-page__title">INSA LAN 2026</h1>
                <p className="event-page__subtitle">7 & 8 mars 2026 · INSA de Rennes</p>
                <div className="event-page__tags">
                    <span className="event-tag">Trackmania</span>
                    <span className="event-tag">LAN</span>
                </div>

                {/* L'équipe */}
                <section className="event-section">
                    <h2>L'équipe présente</h2>
                    <p>
                        Pour cette première aventure commune à Rennes, Nyxar a déplacé 11 membres : 6 joueurs en
                        compétition, Kuumba aux commandes, et 4 membres venus soutenir et vivre l'événement depuis
                        les travées. Deux AirBnB avaient été réservés — un pour les joueurs, un pour les
                        accompagnateurs — pour que chacun soit dans les meilleures conditions possible.
                    </p>

                    <div className="event-roster__cards">
                        {ROSTER.map(pseudo => (
                            <RosterPlayerCard key={pseudo} player={getPlayer(pseudo)} />
                        ))}
                    </div>
                </section>

                {/* Photos gros plan */}
                <section className="event-section">
                    <h2>Sur place</h2>
                    <div className="event-featured-photos">
                        <img src="/uploads/resultats/insa-2026/equipe.jpg" alt="INSA LAN 2026 - ambiance" className="event-featured-photo" />
                        <img src="/uploads/resultats/insa-2026/equipe.jpg" alt="INSA LAN 2026 - équipe" className="event-featured-photo" />
                    </div>
                </section>

                {/* Récit */}
                <section className="event-section">
                    <h2>Notre weekend</h2>
                    <p>
                        Les 7 et 8 mars 2026, Nyxar a pris la direction de Rennes pour la toute première fois.
                        Au programme : l'INSA LAN, l'une des LAN Trackmania les plus attendues de l'année.
                        Pour quatre de nos six joueurs, c'était aussi leur toute première LAN — une grande première
                        qui se vivait pleinement, pas seulement en tant que compétiteurs mais en tant que membres
                        d'une structure qui se déplace ensemble pour la première fois.
                    </p>
                    <p>
                        L'ambiance a été incroyable sur tout le weekend — au sein de l'équipe d'abord, avec cette
                        énergie propre aux premières fois qu'on partage tous ensemble, mais aussi avec l'ensemble
                        de la communauté présente. Nyxar s'est parfaitement intégré dans l'atmosphère de l'événement,
                        et ça s'est senti dans les deux sens. Les supporters ont assuré depuis les travées, et les
                        joueurs ont pu se concentrer dans les meilleures dispositions.
                    </p>
                </section>

                {/* Résultats */}
                <section className="event-section">
                    <h2>Résultats</h2>
                    <p>
                        Seuls Quentin43 et Tommy avaient déjà vécu une LAN Trackmania — pour Roquett, Aapril,
                        Fayeur et Bvddy, c'était une première. Une première réussie : l'ensemble du roster s'en est
                        tiré avec les honneurs dans les deux arbres.
                    </p>
                    <div className="event-results">
                        <div className="event-results__category">
                            <h3>
                                Arbre Elite
                                <a href={ELITE_LIQUIPEDIA} target="_blank" rel="noopener noreferrer" className="event-liquipedia-link event-liquipedia-link--inline">Liquipedia</a>
                            </h3>
                            <div className="event-roster__cards">
                                {PLAYERS_ELITE.map(p => (
                                    <ResultPlayerCard key={p.pseudo} player={getPlayer(p.pseudo)} rank={p.rank} type="elite" />
                                ))}
                            </div>
                        </div>
                        <div className="event-results__category">
                            <h3>
                                Arbre Amateur
                                <a href={AMATEUR_LIQUIPEDIA} target="_blank" rel="noopener noreferrer" className="event-liquipedia-link event-liquipedia-link--inline">Liquipedia</a>
                            </h3>
                            <div className="event-roster__cards">
                                {PLAYERS_AMATEUR.map(p => (
                                    <ResultPlayerCard key={p.pseudo} player={getPlayer(p.pseudo)} rank={p.rank} type="amateur" />
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Galerie slider */}
                <section className="event-section">
                    <h2>Galerie</h2>
                    <PhotoSlider photos={SLIDER_PHOTOS} />
                </section>

                {/* Random Cup */}
                <section className="event-section">
                    <div className="event-highlight">
                        <div className="event-highlight__icon">🏆</div>
                        <div className="event-highlight__content">
                            <h3>La Random Cup — le moment de la soirée</h3>
                            <p>
                                À la fin de cette première journée bien remplie, Rag a décidé d'improviser avec Auwrah une petite
                                cup pour clôturer le samedi en beauté. Pas de prise de tête : une compétition ouverte aux joueurs de la LAN,
                                une heure de pur fun, et 100€ en jeu pour le vainqueur. Un moment spontané et fédérateur
                                qui a mis tout le monde dans le même état d'esprit — joueurs, spectateurs.
                                L'incarnation parfaite de ce que la scène Trackmania a de meilleur à offrir.
                            </p>
                            {RAG_CUP_LIQUIPEDIA && (
                                <a href={RAG_CUP_LIQUIPEDIA} target="_blank" rel="noopener noreferrer" className="event-liquipedia-link">
                                    Voir sur Liquipedia
                                </a>
                            )}
                            <div className="podium">
                                {RAG_CUP_PODIUM.map(({ rank, pseudo, img, className }) => (
                                    <div key={rank} className={`podium__spot ${className}`}>
                                        <div className="podium__avatar-wrap">
                                            {rank === 1 && <span className="podium__crown">👑</span>}
                                            <img src={img} alt={pseudo} className="podium__avatar" />
                                        </div>
                                        <span className="podium__name">{pseudo}</span>
                                        <span className="podium__rank">{rank}</span>
                                        <div className="podium__bar"></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Vidéo */}
                <section className="event-section">
                    <h2>Highlight</h2>
                    <div className="event-video">
                        <video
                            src="/uploads/resultats/insa-2026/video_insalan_nyxar.mp4"
                            controls
                            playsInline
                        />
                    </div>
                </section>

            </div>
        </div>
    )
}
