import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Chemin de base pour les uploads
const UPLOADS_BASE_PATH = path.join(__dirname, '../../frontend/public/uploads')

/**
 * S'assure que le dossier d'upload existe
 * @param {string} folder - Nom du dossier (ex: 'games', 'sponsors')
 * @returns {string} - Chemin complet du dossier
 */
export const ensureUploadDir = (folder) => {
    const uploadsDir = path.join(UPLOADS_BASE_PATH, folder)
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true })
    }
    return uploadsDir
}

/**
 * Nettoie le nom de fichier
 * @param {string} filename - Nom de fichier original
 * @returns {string} - Nom de fichier nettoyé
 */
export const sanitizeFilename = (filename) => {
    return filename.replace(/[^a-zA-Z0-9._-]/g, '_')
}

/**
 * Gère l'upload d'une image
 * @param {Object} req - Request Express avec req.files
 * @param {string} folder - Dossier de destination (ex: 'games', 'sponsors')
 * @param {string} prefix - Préfixe du nom de fichier (ex: 'game', 'sponsor')
 * @param {string} [fieldName='image'] - Nom du champ de fichier
 * @returns {Promise<{filename: string, url: string}>}
 */
export const handleImageUpload = (req, folder, prefix, fieldName = 'image') => {
    return new Promise((resolve, reject) => {
        if (!req.files || !req.files[fieldName]) {
            return reject(new Error('Aucune image fournie'))
        }

        const image = req.files[fieldName]
        const ext = path.extname(image.name)
        const filename = `${prefix}_${Date.now()}${ext}`

        const uploadsDir = ensureUploadDir(folder)
        const uploadPath = path.join(uploadsDir, filename)

        image.mv(uploadPath, (err) => {
            if (err) {
                return reject(new Error('Erreur lors de l\'upload'))
            }
            resolve({
                filename,
                url: `/uploads/${folder}/${filename}`
            })
        })
    })
}

/**
 * Supprime un fichier image
 * @param {string} imageUrl - URL de l'image (ex: '/uploads/games/image.png')
 * @param {string} [expectedFolder] - Dossier attendu pour validation (optionnel)
 * @returns {boolean} - true si supprimé, false sinon
 */
export const deleteImageFile = (imageUrl, expectedFolder = null) => {
    if (!imageUrl) return false

    // Validation: l'URL doit commencer par /uploads/
    if (!imageUrl.startsWith('/uploads/')) return false

    // Si un dossier attendu est spécifié, vérifier que l'URL correspond
    if (expectedFolder && !imageUrl.startsWith(`/uploads/${expectedFolder}/`)) {
        return false
    }

    const imagePath = path.join(__dirname, '../../frontend/public', imageUrl)

    if (fs.existsSync(imagePath)) {
        try {
            fs.unlinkSync(imagePath)
            return true
        } catch (error) {
            console.error('Erreur suppression image:', error)
            return false
        }
    }

    return false
}
