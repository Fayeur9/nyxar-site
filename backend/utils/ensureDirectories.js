import fs from 'fs'
import path from 'path'
import { UPLOADS_BASE_PATH } from './uploadsPath.js'

// Arborescence complète des dossiers uploads
const UPLOAD_DIRS = [
    'categories',
    'competitions',
    'games',
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
        const fullPath = path.join(UPLOADS_BASE_PATH, dir)
        if (!fs.existsSync(fullPath)) {
            fs.mkdirSync(fullPath, { recursive: true })
            created++
        }
    }
    if (created > 0) {
        console.log(`✓ ${created} dossier(s) uploads créé(s)`)
    }
}
