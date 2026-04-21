import { useContext, useState, useEffect, useRef, useMemo } from 'react'
import { AuthContext } from '../../context/AuthContext'
import { NotyCampaignContext } from '../../context/NotyCampaignContext'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import '../../styles/components/Navbar.css'

export default function Navbar() {
    const { user, logout } = useContext(AuthContext)
    const { hasActiveCampaign, hasPastCampaigns } = useContext(NotyCampaignContext)
    const navigate = useNavigate()
    const location = useLocation()
    const [dropdownOpen, setDropdownOpen] = useState(false)
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const [mobileUserDropdownOpen, setMobileUserDropdownOpen] = useState(false)
    const [prevPathname, setPrevPathname] = useState(location.pathname)
    const dropdownRef = useRef(null)
    const sidebarRef = useRef(null)

    // Fermer le dropdown quand on clique ailleurs
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setDropdownOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Fermer le menu mobile lors du changement de route — pattern setState pendant le render
    if (prevPathname !== location.pathname) {
        setPrevPathname(location.pathname)
        setMobileMenuOpen(false)
        setMobileUserDropdownOpen(false)
    }

    // Bloquer le scroll du body quand le menu mobile est ouvert
    useEffect(() => {
        if (mobileMenuOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => {
            document.body.style.overflow = ''
        }
    }, [mobileMenuOpen])

    const getMenuItems = () => {
        const baseMenuItems = [
            { path: '/', label: 'Accueil', icon: '🏠' },
            { path: '/teams', label: 'Équipes', icon: '👥' },
            { path: '/games', label: 'Jeux', icon: '🎮' },
            { path: '/skins', label: 'Skins', icon: '🏎️' },
            { path: '/competitions', label: 'Compétitions', icon: '🎯' },
            { path: '/resultats', label: 'Résultats', icon: '🎖️' },
            { path: '/mini-jeux', label: 'Mini-jeux', icon: '🎲' },
        ]

        // Ajouter l'onglet Noty si une campagne est en cours ou s'il y a des campagnes passées
        if (hasActiveCampaign || hasPastCampaigns) {
            baseMenuItems.push({ path: '/noty', label: 'Noty', icon: '🏆' })
        }

        // Ajouter l'onglet Administration si l'utilisateur est admin
        if (user?.role === 'admin') {
            baseMenuItems.push({ path: '/admin', label: 'Administration', icon: '⚙️', authOnly: true })
        }

        return baseMenuItems
    }

    const menuItems = getMenuItems()

    // Calculer dynamiquement la position de l'indicator (dérivé, pas besoin de state)
    const { indicatorStyle, indicatorVisible } = useMemo(() => {
        const filtered = user
            ? menuItems.filter(item => !item.authOnly || user)
            : menuItems.filter(item => !item.authOnly)

        const activeIndex = filtered.findIndex(item => {
            if (item.path === '/') {
                return location.pathname === '/'
            }
            const regex = new RegExp(`^${item.path}(/|$)`)
            return regex.test(location.pathname)
        })

        if (activeIndex !== -1) {
            // 80px (width) + 8px (margin-left) + 8px (margin-right) = 96px
            return {
                indicatorVisible: true,
                indicatorStyle: { transform: `translateX(${activeIndex * 96}px)` }
            }
        }
        return { indicatorVisible: false, indicatorStyle: {} }
    }, [location.pathname, user, menuItems])

    const handleLogout = () => {
        logout()
        navigate('/login')
    }

    const isActive = (itemPath) => {
        // Pour la homepage, vérifier l'égalité exacte
        if (itemPath === '/') {
            return location.pathname === '/'
        }
        // Pour les autres pages, vérifier si le chemin actuel commence par le chemin de l'item
        // et que le caractère suivant est soit '/' (sous-page) soit la fin de chaîne
        const regex = new RegExp(`^${itemPath}(/|$)`)
        return regex.test(location.pathname)
    }

    const visibleMenuItems = user
        ? menuItems.filter(item => !item.authOnly || user)
        : menuItems.filter(item => !item.authOnly)

    if (!user) {
        return (
            <>
                <div className="navbar-wrapper">
                    <Link to="/" className="nav-logo">
                        <img src="/logo_main.png" alt="NYXAR" className="logo-img" />
                        <span>NYXAR</span>
                    </Link>

                    <nav className="navigation desktop-nav">
                        <ul className="nav-menu">
                            {visibleMenuItems.map((item) => (
                                <li
                                    key={item.path}
                                    className={`list ${isActive(item.path) ? 'active' : ''}`}
                                >
                                    <Link to={item.path} className="nav-icon">
                                        <span className="icon">{item.icon}</span>
                                        <span className="text">{item.label}</span>
                                    </Link>
                                </li>
                            ))}
                            <div className={`indicator ${indicatorVisible ? 'visible' : 'hidden'}`} style={indicatorStyle}></div>
                        </ul>
                    </nav>

                    <div className="nav-user">
                        <Link to="/login" className="btn-login desktop-login">
                            Se connecter
                        </Link>
                        <button
                            className={`burger-btn ${mobileMenuOpen ? 'open' : ''}`}
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            aria-label="Menu"
                        >
                            <span></span>
                            <span></span>
                            <span></span>
                        </button>
                    </div>
                </div>

                {/* Mobile Sidebar */}
                <div className={`sidebar-overlay ${mobileMenuOpen ? 'open' : ''}`} onClick={() => setMobileMenuOpen(false)} />
                <aside className={`mobile-sidebar ${mobileMenuOpen ? 'open' : ''}`} ref={sidebarRef}>
                    <div className="sidebar-header">
                        <Link to="/" className="nav-logo" onClick={() => setMobileMenuOpen(false)}>
                            <img src="/logo_main.png" alt="NYXAR" className="logo-img" />
                            <span>NYXAR</span>
                        </Link>
                    </div>
                    <nav className="sidebar-nav">
                        {visibleMenuItems.map((item) => (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`sidebar-link ${isActive(item.path) ? 'active' : ''}`}
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                <span className="sidebar-icon">{item.icon}</span>
                                <span className="sidebar-text">{item.label}</span>
                            </Link>
                        ))}
                    </nav>
                    <div className="sidebar-footer">
                        <Link to="/login" className="btn-login" onClick={() => setMobileMenuOpen(false)}>
                            Se connecter
                        </Link>
                    </div>
                </aside>
            </>
        )
    }

    return (
        <>
            <div className="navbar-wrapper">
                <Link to="/" className="nav-logo">
                    <img src="/logo_main.png" alt="NYXAR" className="logo-img" />
                    <span>NYXAR</span>
                </Link>

                <nav className="navigation desktop-nav">
                    <ul className="nav-menu">
                        {visibleMenuItems.map((item) => (
                            <li
                                key={item.path}
                                className={`list ${isActive(item.path) ? 'active' : ''}`}
                            >
                                <Link to={item.path} className="nav-icon">
                                    <span className="icon">{item.icon}</span>
                                    <span className="text">{item.label}</span>
                                </Link>
                            </li>
                        ))}
                        <div className={`indicator ${indicatorVisible ? 'visible' : 'hidden'}`} style={indicatorStyle}></div>
                    </ul>
                </nav>

                <div className="nav-user" ref={dropdownRef}>
                    <div
                        className={`user-dropdown-trigger desktop-user ${dropdownOpen ? 'open' : ''}`}
                        onClick={() => setDropdownOpen(!dropdownOpen)}
                    >
                        {user.image_url ? (
                            <img src={user.image_url} alt={user.username || 'User'} className="user-avatar" />
                        ) : (
                            <div className="user-avatar-placeholder">
                                {(user.username || user.email || '?').charAt(0).toUpperCase()}
                            </div>
                        )}
                        <span className="user-name">{user.username || user.email || 'Utilisateur'}</span>
                        <svg className="dropdown-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </div>

                    {dropdownOpen && (
                        <div className="user-dropdown-menu">
                            <Link
                                to="/profile"
                                className="dropdown-item"
                                onClick={() => setDropdownOpen(false)}
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="12" cy="7" r="4"></circle>
                                </svg>
                                Voir profil
                            </Link>
                            <button onClick={handleLogout} className="dropdown-item logout">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                                    <polyline points="16 17 21 12 16 7"></polyline>
                                    <line x1="21" y1="12" x2="9" y2="12"></line>
                                </svg>
                                Déconnexion
                            </button>
                        </div>
                    )}

                    <button
                        className={`burger-btn ${mobileMenuOpen ? 'open' : ''}`}
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        aria-label="Menu"
                    >
                        <span></span>
                        <span></span>
                        <span></span>
                    </button>
                </div>
            </div>

            {/* Mobile Sidebar */}
            <div className={`sidebar-overlay ${mobileMenuOpen ? 'open' : ''}`} onClick={() => setMobileMenuOpen(false)} />
            <aside className={`mobile-sidebar ${mobileMenuOpen ? 'open' : ''}`} ref={sidebarRef}>
                <div className="sidebar-header">
                    <Link to="/" className="nav-logo" onClick={() => setMobileMenuOpen(false)}>
                        <img src="/logo_main.png" alt="NYXAR" className="logo-img" />
                        <span>NYXAR</span>
                    </Link>
                </div>
                <nav className="sidebar-nav">
                    {visibleMenuItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`sidebar-link ${isActive(item.path) ? 'active' : ''}`}
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            <span className="sidebar-icon">{item.icon}</span>
                            <span className="sidebar-text">{item.label}</span>
                        </Link>
                    ))}
                </nav>
                <div className="sidebar-footer">
                    <button
                        type="button"
                        className={`sidebar-user-dropdown-trigger ${mobileUserDropdownOpen ? 'open' : ''}`}
                        onClick={() => setMobileUserDropdownOpen(v => !v)}
                        aria-expanded={mobileUserDropdownOpen}
                    >
                        {user.image_url ? (
                            <img src={user.image_url} alt={user.username || 'User'} className="user-avatar" />
                        ) : (
                            <div className="user-avatar-placeholder">
                                {(user.username || user.email || '?').charAt(0).toUpperCase()}
                            </div>
                        )}
                        <span className="user-name">{user.username || user.email || 'Utilisateur'}</span>
                        <svg className="dropdown-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </button>

                    {mobileUserDropdownOpen && (
                        <div className="sidebar-user-dropdown-menu">
                            <Link
                                to="/profile"
                                className="dropdown-item"
                                onClick={() => { setMobileMenuOpen(false); setMobileUserDropdownOpen(false) }}
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="12" cy="7" r="4"></circle>
                                </svg>
                                Voir profil
                            </Link>
                            <button
                                onClick={() => { handleLogout(); setMobileMenuOpen(false); setMobileUserDropdownOpen(false) }}
                                className="dropdown-item logout"
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                                    <polyline points="16 17 21 12 16 7"></polyline>
                                    <line x1="21" y1="12" x2="9" y2="12"></line>
                                </svg>
                                Déconnexion
                            </button>
                        </div>
                    )}
                </div>
            </aside>
        </>
    )
}