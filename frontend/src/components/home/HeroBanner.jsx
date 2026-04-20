import { useState, useEffect } from 'react'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Autoplay, Pagination, EffectFade } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/pagination'
import 'swiper/css/effect-fade'
import { API_URL } from '../../services/api'
import '../../styles/components/HeroBanner.css'

export default function HeroBanner() {
    const [banners, setBanners] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchBanners()
    }, [])

    const fetchBanners = async () => {
        try {
            const response = await fetch(`${API_URL}/api/herobanner`)
            if (response.ok) {
                const data = await response.json()
                setBanners(data)
            }
        } catch (err) {
            console.error('Erreur chargement banners:', err)
        } finally {
            setLoading(false)
        }
    }

    const scrollToContent = () => {
        const aboutSection = document.getElementById('about')
        if (aboutSection) {
            const offsetTop = aboutSection.offsetTop + 650
            window.scrollTo({ top: offsetTop, behavior: 'smooth' })
        }
    }

    // Si pas de banners, ne rien afficher
    if (loading || banners.length === 0) return null

    return (
        <section className="hero-banner">
            <Swiper
                effect="fade"
                loop={banners.length > 1}
                autoplay={banners.length > 1 ? {
                    delay: 5000,
                    disableOnInteraction: false,
                } : false}
                pagination={banners.length > 1 ? {
                    clickable: true,
                } : false}
                modules={[Autoplay, Pagination, EffectFade]}
                className="hero-banner__slider"
            >
                {banners.map((banner) => (
                    <SwiperSlide key={banner.id}>
                        <div
                            className="hero-banner__slide"
                            style={{ backgroundImage: `url(${banner.image_url})` }}
                        >
                            {banner.title && (
                                <div className="hero-banner__overlay">
                                    <h2 className="hero-banner__title">{banner.title}</h2>
                                </div>
                            )}
                        </div>
                    </SwiperSlide>
                ))}
            </Swiper>

            {/* Flèche de scroll animée */}
            <button
                className="hero-banner__scroll-arrow"
                onClick={scrollToContent}
                aria-label="Défiler vers le contenu"
            >
                <span className="hero-banner__arrow"></span>
            </button>
        </section>
    )
}
