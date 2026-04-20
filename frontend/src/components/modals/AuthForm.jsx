import { useState, useContext, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { AuthContext } from '../../context/AuthContext'
import { API_URL } from '../../services/api'
import '../../styles/components/AuthForm.css'

const NO_SITE_ACCESS_MESSAGE = 'Site en cours de développement, merci de revenir plus tard ou de contacter un administrateur'

export default function AuthForm() {
    const navigate = useNavigate()
    const { login, user, canViewSite } = useContext(AuthContext)
    const [mode, setMode] = useState('login')
    const [isActive, setIsActive] = useState(false)
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [showLoginPassword, setShowLoginPassword] = useState(false)
    const [showRegisterPassword, setShowRegisterPassword] = useState(false)
    const [showRegisterConfirmPassword, setShowRegisterConfirmPassword] = useState(false)
    const usernameLoginRef = useRef(null)

    // Contournement bug Brave : readOnly empêche l'autofill popup au premier clic
    useEffect(() => {
        usernameLoginRef.current?.setAttribute('readonly', '')
    }, [])

    // Déclencher l'animation au montage
    useEffect(() => {
        setIsActive(false)
        const frameId = requestAnimationFrame(() => {
            setIsActive(true)
        })
        return () => cancelAnimationFrame(frameId)
    }, [])

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: value
        }))
        setError('')
    }

    const switchMode = (newMode) => {
        if (newMode === mode) return
        setIsActive(false)
        setMode(newMode)
        setShowLoginPassword(false)
        setShowRegisterPassword(false)
        setShowRegisterConfirmPassword(false)
        requestAnimationFrame(() => {
            setIsActive(true)
        })
    }

    useEffect(() => {
        if (user && !canViewSite) {
            setError(NO_SITE_ACCESS_MESSAGE)
            setSuccess('')
            setLoading(false)
        }
    }, [user, canViewSite])

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        setSuccess('')

        try {
            const isLoginMode = mode === 'login'

            // Validation pour le register
            if (!isLoginMode) {
                if (formData.password !== formData.confirmPassword) {
                    setError('Les mots de passe ne correspondent pas')
                    setLoading(false)
                    return
                }
                if (formData.password.length < 6) {
                    setError('Le mot de passe doit contenir au moins 6 caractères')
                    setLoading(false)
                    return
                }
            }

            const endpoint = isLoginMode ? `${API_URL}/api/auth/login` : `${API_URL}/api/auth/register`
            const payload = isLoginMode
                ? { username: formData.username, password: formData.password }
                : { username: formData.username, email: formData.email, password: formData.password }

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.message || 'Une erreur est survenue')
            }

            if (data.token && data.user) {
                login(data.user, data.token)
                const allowed = Boolean(data.user?.permissions?.viewSite)

                if (!allowed) {
                    setError(NO_SITE_ACCESS_MESSAGE)
                    setSuccess('')
                    setLoading(false)
                    return
                }

                setSuccess(isLoginMode ? 'Connexion réussie !' : 'Inscription réussie !')
                // Naviguer sans timeout supplémentaire - React Router gère la transition
                navigate('/')
            }

            setFormData({
                username: '',
                email: '',
                password: '',
                confirmPassword: '',
            })
        } catch (err) {
            setError(err.message)
            setLoading(false)
        }
    }

    return (
        <div className="authPage">
            {/* Écran de chargement qui apparaît après la connexion */}
            {loading && success && (
                <div className="loadingOverlay">
                    <div className="loader">
                        <div className="spinner"></div>
                        <p>{success}</p>
                    </div>
                </div>
            )}
            
            <div className={`authContainer ${mode === 'register' ? 'mode-register' : ''} ${isActive ? 'active' : ''} ${loading && success ? 'fading-out' : ''}`}>
                
                {/* TOGGLE BOX - Panneau orange avec arc */}
                <div className="toggleBox" aria-hidden="true">
                    <div className="togglePanel toggleLeft">
                        <h2>WELCOME!</h2>
                        <p>We're delighted to have you here. If you need any assistance, feel free to reach out.</p>
                        <button type="button" className="toggleButton" onClick={() => switchMode('login')}>
                            Sign In
                        </button>
                    </div>
                    <div className="togglePanel toggleRight">
                        <h2>WELCOME BACK!</h2>
                        <p>We are happy to have you with us again. If you need anything, we are here to help.</p>
                        <button type="button" className="toggleButton" onClick={() => switchMode('register')}>
                            Sign Up
                        </button>
                    </div>
                </div>

                {/* FORMULAIRE LOGIN */}
                <form className={`formBox login ${mode === 'login' ? 'active' : ''}`} onSubmit={handleSubmit}>
                    <div className={`animationContainer ${isActive && mode === 'login' ? 'active' : ''}`}>
                        
                        <div className="animation" style={{ "--i": 0 }}>
                            <h2>Login</h2>
                        </div>

                        <div className="animation" style={{ "--i": 1 }}>
                            <div className="inputGroup">
                                <input
                                    ref={usernameLoginRef}
                                    type="text"
                                    name="username"
                                    placeholder="Username"
                                    value={formData.username}
                                    onChange={handleChange}
                                    disabled={mode !== 'login'}
                                    onFocus={(e) => setTimeout(() => e.target.removeAttribute('readonly'), 20)}
                                    onBlur={(e) => { if (!e.target.value) e.target.setAttribute('readonly', '') }}
                                    required
                                />
                                <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="12" cy="7" r="4"></circle>
                                </svg>
                            </div>
                        </div>

                        <div className="animation" style={{ "--i": 2 }}>
                            <div className="inputGroup">
                                <input
                                    type={showLoginPassword ? 'text' : 'password'}
                                    name="password"
                                    placeholder="Password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    disabled={mode !== 'login'}
                                    required
                                />
                                <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                </svg>
                                <button
                                    type="button"
                                    className="toggle-visibility"
                                    onClick={() => setShowLoginPassword(prev => !prev)}
                                    aria-label={showLoginPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                                    disabled={mode !== 'login'}
                                >
                                    {showLoginPassword ? '🙈' : '👁️'}
                                </button>
                            </div>
                        </div>

                        <div className="animation" style={{ "--i": 3 }}>
                            <button type="submit" disabled={loading || mode !== 'login'} className="submitButton">
                                {loading ? 'Chargement...' : 'Login'}
                            </button>
                        </div>
                    </div>
                </form>

                {/* FORMULAIRE REGISTER */}
                <form className={`formBox register ${mode === 'register' ? 'active' : ''}`} onSubmit={handleSubmit}>
                    <div className={`animationContainer ${isActive && mode === 'register' ? 'active' : ''}`}>
                        
                        <div className="animation" style={{ "--i": 0 }}>
                            <h2>Register</h2>
                        </div>

                        <div className="animation" style={{ "--i": 1 }}>
                            <div className="inputGroup">
                                <input
                                    type="text"
                                    name="username"
                                    placeholder="Username"
                                    value={formData.username}
                                    onChange={handleChange}
                                    disabled={mode !== 'register'}
                                    required
                                />
                                <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="12" cy="7" r="4"></circle>
                                </svg>
                            </div>
                        </div>

                        <div className="animation" style={{ "--i": 2 }}>
                            <div className="inputGroup">
                                <input
                                    type="email"
                                    name="email"
                                    placeholder="Email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    disabled={mode !== 'register'}
                                    required
                                />
                                <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <rect x="2" y="4" width="20" height="16" rx="2"></rect>
                                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
                                </svg>
                            </div>
                        </div>

                        <div className="animation" style={{ "--i": 3 }}>
                            <div className="inputGroup">
                                <input
                                    type={showRegisterPassword ? 'text' : 'password'}
                                    name="password"
                                    placeholder="Password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    disabled={mode !== 'register'}
                                    required
                                />
                                <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                </svg>
                                <button
                                    type="button"
                                    className="toggle-visibility"
                                    onClick={() => setShowRegisterPassword(prev => !prev)}
                                    aria-label={showRegisterPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                                    disabled={mode !== 'register'}
                                >
                                    {showRegisterPassword ? '🙈' : '👁️'}
                                </button>
                            </div>
                        </div>

                        <div className="animation" style={{ "--i": 4 }}>
                            <div className="inputGroup">
                                <input
                                    type={showRegisterConfirmPassword ? 'text' : 'password'}
                                    name="confirmPassword"
                                    placeholder="Confirm Password"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    disabled={mode !== 'register'}
                                    required
                                />
                                <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                    <path d="M12 16v-2"></path>
                                </svg>
                                <button
                                    type="button"
                                    className="toggle-visibility"
                                    onClick={() => setShowRegisterConfirmPassword(prev => !prev)}
                                    aria-label={showRegisterConfirmPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                                    disabled={mode !== 'register'}
                                >
                                    {showRegisterConfirmPassword ? '🙈' : '👁️'}
                                </button>
                            </div>
                        </div>

                        <div className="animation" style={{ "--i": 5 }}>
                            <button type="submit" disabled={loading || mode !== 'register'} className="submitButton">
                                {loading ? 'Chargement...' : 'Register'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>

            {/* Lien retour au site */}
            <Link to="/" className="backToSite">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
                Continuer en tant que visiteur
            </Link>

            {/* Messages d'erreur/succès */}
            {error && <div className="message error">{error}</div>}
            {success && <div className="message success">{success}</div>}
        </div>
    )
}
