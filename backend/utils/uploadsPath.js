import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Chemin de base des uploads (images utilisateurs : hero banners, sponsors, joueurs, etc).
 *
 * Priorité :
 * 1. Variable d'environnement `UPLOADS_PATH` — utilisée en prod Railway pour pointer vers un
 *    volume persistant (ex: `/app/uploads`). Survit aux redéploiements.
 * 2. En production (sans UPLOADS_PATH) : `backend/public/uploads/` — sert aussi les fichiers
 *    via `express.static` depuis le même chemin. Non persistant sur Railway sans volume.
 * 3. En développement : `frontend/public/uploads/` — servi par Vite dev server.
 */
export const UPLOADS_BASE_PATH = process.env.UPLOADS_PATH
    || (process.env.NODE_ENV === 'production'
        ? path.resolve(__dirname, '..', 'public', 'uploads')
        : path.resolve(__dirname, '..', '..', 'frontend', 'public', 'uploads'))
