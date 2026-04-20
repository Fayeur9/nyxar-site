import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthProvider } from './context/AuthContext'
import { NotyCampaignProvider } from './context/NotyCampaignContext'
import './styles/global.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <NotyCampaignProvider>
        <App />
      </NotyCampaignProvider>
    </AuthProvider>
  </StrictMode>,
)
