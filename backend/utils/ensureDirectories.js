import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const UPLOADS_BASE = path.join(__dirname, '../../frontend/public/uploads')

// Arborescence complète des dossiers uploads
const UPLOAD_DIRS = [
    'categories',
    'competitions',
    'games',
    'guess-map',
    'herobanner',
    'line_ups',
    'noty/campaign',
    'noty/cards',
    'noty/categories',
    'players',
    'resultats',
    'roles',
    'skins',
    'sponsors',
    'users',
]

/**
 * Vérifie et crée toute l'arborescence uploads au démarrage du serveur
 */
export function ensureUploadDirectories() {
    let created = 0
    for (const dir of UPLOAD_DIRS) {
        const fullPath = path.join(UPLOADS_BASE, dir)
        if (!fs.existsSync(fullPath)) {
            fs.mkdirSync(fullPath, { recursive: true })
            created++
        }
    }
    if (created > 0) {
        console.log(`✓ ${created} dossier(s) uploads créé(s)`)
    }
}
