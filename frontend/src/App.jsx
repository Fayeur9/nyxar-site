import { useContext, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthContext } from './context/AuthContext'

// Pages de consultation (Page*)
import PageHome from './pages/PageHome'
import PageNoty from './pages/PageNoty'
import PageNotyVote from './pages/PageNotyVote'
import PageNotyHallOfFame from './pages/PageNotyHallOfFame'
import PageNotyCategories from './pages/PageNotyCategories'
import PageTeams from './pages/PageTeams'
import PageGames from './pages/PageGames'
import PageCompetitions from './pages/PageCompetitions'
import PageResultats from './pages/PageResultats'
import PageInsaLan2026 from './pages/PageInsaLan2026'
import PageSkins from './pages/PageSkins'
import PageMiniJeux from './pages/PageMiniJeux'
import PageMiniJeuPlay from './pages/PageMiniJeuPlay'
import Page404 from './pages/Page404'

// Pages de formulaire (Form*)
import FormAuth from './pages/form/FormAuth'
import FormLineUp from './pages/form/FormLineUp'
import FormCategory from './pages/form/FormCategory'
import FormProfile from './pages/form/FormProfile'
import FormPassword from './pages/form/FormPassword'

// Pages d'administration (Gestion*)
import GestionDashboard from './pages/admin/GestionDashboard'
import GestionUsers from './pages/admin/GestionUsers'
import GestionGames from './pages/admin/GestionGames'
import GestionSponsors from './pages/admin/GestionSponsors'
import GestionHeroBanner from './pages/admin/GestionHeroBanner'

// Composants globaux
import Footer from './components/global/Footer'
import Navbar from './components/global/Navbar'
import ScrollToTop from './components/global/ScrollToTop'

function PermissionRoute({ permission, children }) {
  const { user, canViewSite, hasPermission } = useContext(AuthContext)

  if (!user || !canViewSite) {
    return <Navigate to="/login" replace />
  }

  if (permission && !hasPermission(permission)) {
    return <Navigate to="/" replace />
  }

  return children
}

function AppContent() {
  const { user, token, loading, canViewSite } = useContext(AuthContext)
  const location = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  if (loading) {
    return (
      <div className="app loading">
        <div className="loader">Chargement...</div>
      </div>
    )
  }

  const isLoginPage = location.pathname === '/login'
  const isAuthenticated = Boolean(user && canViewSite)

  if (!isAuthenticated && !isLoginPage) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return (
    <>
      <div className="app">
{!isLoginPage && isAuthenticated && <Navbar />}
          <div className="main-content">
            <Routes>
              {/* Routes publiques accessibles à tous */}
              <Route path="/login" element={<FormAuth />} />
              <Route path="/noty" element={<PageNoty />} />
              <Route path="/noty/categories" element={<PageNotyCategories />} />
              <Route path="/noty/vote/:id" element={<PageNotyVote />} />
              <Route path="/noty/hall-of-fame" element={<PageNotyHallOfFame />} />
              <Route path="/teams" element={<PageTeams />} />
              <Route path="/games" element={<PageGames />} />
              <Route path="/competitions" element={<PageCompetitions />} />
              <Route path="/" element={<PageHome />} />
              <Route path="/resultats" element={<PageResultats />} />
              <Route path="/resultats/insa-2026" element={<PageInsaLan2026 />} />
              <Route path="/skins" element={<PageSkins />} />
              <Route path="/mini-jeux" element={<PageMiniJeux />} />
              <Route path="/mini-jeux/:gameKey" element={<PageMiniJeuPlay />} />

              {/* Routes protégées - authentification requise */}
              {isAuthenticated ? (
                <>
                  <Route path="/profile" element={<FormProfile />} />
                  <Route path="/profile/change-password" element={<FormPassword />} />
                  <Route
                    path="/admin/users"
                    element={(
                      <PermissionRoute permission="adminFull">
                        <GestionUsers />
                      </PermissionRoute>
                    )}
                  />
                  <Route
                    path="/admin/sponsors"
                    element={(
                      <PermissionRoute permission="manageGames">
                        <GestionSponsors />
                      </PermissionRoute>
                    )}
                  />
                  <Route
                    path="/admin/herobanner"
                    element={(
                      <PermissionRoute permission="manageGames">
                        <GestionHeroBanner />
                      </PermissionRoute>
                    )}
                  />
                  <Route
                    path="/admin"
                    element={(
                      <PermissionRoute permission="manageGames">
                        <GestionDashboard />
                      </PermissionRoute>
                    )}
                  />
                  <Route
                    path="/teams/lineup/add"
                    element={(
                      <PermissionRoute permission="manageGames">
                        <FormLineUp />
                      </PermissionRoute>
                    )}
                  />
                  <Route
                    path="/teams/lineup/edit"
                    element={(
                      <PermissionRoute permission="manageGames">
                        <FormLineUp />
                      </PermissionRoute>
                    )}
                  />
                  <Route
                    path="/teams/player/add"
                    element={<Navigate to="/admin" state={{ activeTab: 'players', openAddModal: true }} replace />}
                  />
                  <Route
                    path="/teams/player/edit"
                    element={<Navigate to="/admin" state={{ activeTab: 'players', openAddModal: true }} replace />}
                  />
                  <Route
                    path="/games/edit"
                    element={(
                      <PermissionRoute permission="manageGames">
                        <GestionGames />
                      </PermissionRoute>
                    )}
                  />
                  <Route
                    path="/noty/category/new"
                    element={(
                      <PermissionRoute permission="manageGames">
                        <FormCategory token={token} />
                      </PermissionRoute>
                    )}
                  />
                  <Route
                    path="/noty/category/:id"
                    element={(
                      <PermissionRoute permission="manageGames">
                        <FormCategory token={token} />
                      </PermissionRoute>
                    )}
                  />
                </>
              ) : (
                <>
                  {/* Rediriger les routes protégées vers login */}
                  <Route path="/profile/*" element={<Navigate to="/login" replace />} />
                  <Route path="/admin/*" element={<Navigate to="/login" replace />} />
                  <Route path="/teams/lineup/*" element={<Navigate to="/login" replace />} />
                  <Route path="/teams/player/*" element={<Navigate to="/login" replace />} />
                  <Route path="/games/edit" element={<Navigate to="/login" replace />} />
                  <Route path="/noty/category/*" element={<Navigate to="/login" replace />} />
                </>
              )}

              <Route path="*" element={<Page404 />} />
            </Routes>
          </div>
        <ScrollToTop />
      </div>
      {!isLoginPage && <Footer />}
    </>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}

export default App
