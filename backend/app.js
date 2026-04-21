import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import fileUpload from 'express-fileupload'
import path from 'path'
import { fileURLToPath } from 'url'
import authRoutes from './routes/auth.js'
import notyCampaignsRoutes from './routes/noty-campaigns.js'
import notyCategoriesRoutes from './routes/noty-categories.js'
import notyVotesRoutes from './routes/noty-votes.js'
import notyStatsRoutes from './routes/noty-stats.js'
import notyCardsRoutes from './routes/noty-cards.js'
import lineUpsRoutes from './routes/line_ups.js'
import gamesRoutes from './routes/games.js'
import adminRoutes from './routes/admin.js'
import adminMiniGamesRoutes from './routes/admin_mini_games.js'
import adminScoresRoutes from './routes/admin_scores.js'
import skinsRoutes from './routes/skins.js'
import nyxariensRoutes from './routes/nyxariens.js'
import resultatsRoutes from './routes/resultats.js'
import competitionsRoutes from './routes/competitions.js'
import sponsorsRoutes from './routes/sponsors.js'
import herobannerRoutes from './routes/herobanner.js'
import scoresRoutes from './routes/scores.js'
import scoreboardRoutes from './routes/scoreboard.js'
import wordleRoutes from './routes/wordle.js'
import miniGamesRoutes from './routes/mini_games.js'
import { UPLOADS_BASE_PATH } from './utils/uploadsPath.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '.env') })

const app = express()

const devOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'http://127.0.0.1:5175'
]
// Railway expose automatiquement RAILWAY_PUBLIC_DOMAIN avec le domaine du service.
// On l'ajoute aux origines autorisées pour que le front hébergé same-origin passe CORS.
const railwayOrigin = process.env.RAILWAY_PUBLIC_DOMAIN
    ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
    : null
const prodOrigins = [
    ...(railwayOrigin ? [railwayOrigin] : []),
    ...(process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
        : [])
]

app.use(cors({
    origin: function(origin, callback) {
        const allowedOrigins = process.env.NODE_ENV === 'production' ? prodOrigins : devOrigins
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true)
        }
        return callback(new Error('Not allowed by CORS'))
    },
    credentials: true
}))
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ limit: '50mb', extended: true }))
app.use(fileUpload({
    limits: { fileSize: 50 * 1024 * 1024 },
    abortOnLimit: true,
    responseOnLimit: 'Le fichier dépasse la limite de 50 Mo'
}))

app.use('/uploads', express.static(UPLOADS_BASE_PATH))

const frontendBuildPath = process.env.NODE_ENV === 'production'
    ? path.join(__dirname, 'public')
    : path.join(__dirname, '../frontend/dist')
app.use(express.static(frontendBuildPath))

app.use('/api/auth', authRoutes)
app.use('/api/admin/mini-games', adminMiniGamesRoutes)
app.use('/api/admin/scores', adminScoresRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/noty', notyCampaignsRoutes)
app.use('/api/noty', notyCategoriesRoutes)
app.use('/api/noty', notyVotesRoutes)
app.use('/api/noty', notyStatsRoutes)
app.use('/api/noty', notyCardsRoutes)
app.use('/api/competitions', competitionsRoutes)
app.use('/api/line-ups', lineUpsRoutes)
app.use('/api/games', gamesRoutes)
app.use('/api/skins', skinsRoutes)
app.use('/api/nyxariens', nyxariensRoutes)
app.use('/api/resultats', resultatsRoutes)
app.use('/api/sponsors', sponsorsRoutes)
app.use('/api/herobanner', herobannerRoutes)
app.use('/api/scores', scoresRoutes)
app.use('/api/scoreboard', scoreboardRoutes)
app.use('/api/wordle', wordleRoutes)
app.use('/api/mini-games', miniGamesRoutes)

app.get('/api/health', (req, res) => {
    res.json({ status: 'OK' })
})

app.get('*', (req, res) => {
    const indexPath = path.join(frontendBuildPath, 'index.html')
    res.sendFile(indexPath, (err) => {
        if (err) {
            console.warn(`Frontend index.html not found at ${indexPath}`)
            res.status(404).json({
                message: 'Frontend not available',
                path: indexPath
            })
        }
    })
})

export default app
