import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import app from './app.js'
import { initializeDatabase } from './init.js'
import { ensureUploadDirectories } from './utils/ensureDirectories.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '.env') })

const PORT = process.env.PORT || 5176

// Vérifier l'arborescence uploads et initialiser la BD
ensureUploadDirectories()
initializeDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`\t✓ Backend prêt (port ${PORT})\n`)
    })
})
