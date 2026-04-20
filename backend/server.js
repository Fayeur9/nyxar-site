import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import app from './app.js'
import { initializeDatabase } from './init.js'
import { ensureUploadDirectories } from './utils/ensureDirectories.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '.env') })

// Debug — dump du contenu de backend/public au démarrage
const publicPath = path.join(__dirname, 'public')
console.log(`[PUBLIC DEBUG] path: ${publicPath}`)
try {
    console.log('[PUBLIC DEBUG] contents:', fs.readdirSync(publicPath))
    const assetsPath = path.join(publicPath, 'assets')
    if (fs.existsSync(assetsPath)) {
        console.log('[PUBLIC DEBUG] assets:', fs.readdirSync(assetsPath))
    } else {
        console.log('[PUBLIC DEBUG] assets dir missing')
    }
} catch (err) {
    console.log('[PUBLIC DEBUG] error:', err.message)
}

const PORT = process.env.PORT || 5176

// Vérifier l'arborescence uploads et initialiser la BD
ensureUploadDirectories()
initializeDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`\t✓ Backend prêt (port ${PORT})\n`)
    })
})
