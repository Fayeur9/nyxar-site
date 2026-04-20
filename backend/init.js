import pool from './db.js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { databaseExists, createDatabase, createAllTables } from './schema.js'
import { ensureMiniGamesSettingsDefaults } from './utils/miniGames.js'
import { seedInitData } from './seed-init.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '.env') })

// Initialiser la BD (vérifie et crée seulement ce qui manque)
export async function initializeDatabase() {
    try {
        const dbName = process.env.DB_NAME || 'nyxar_db'
        let somethingCreated = false

        // Vérifier si la base existe
        const dbExists = await databaseExists()

        if (!dbExists) {
            await createDatabase()
            somethingCreated = true
        }

        // Vérifier la connexion
        await pool.query('SELECT 1')

        // Créer les tables manquantes (intelligent)
        const tablesCreated = await createAllTables()
        if (tablesCreated > 0) {
            somethingCreated = true
        }

        // Garantir la présence des configurations par défaut pour les mini-jeux
        await ensureMiniGamesSettingsDefaults()

        // Seed initial si aucun utilisateur (première exécution après création des tables).
        // Évite de reseeder à chaque redémarrage tout en garantissant un site fonctionnel à froid.
        const [[{ count }]] = await pool.query('SELECT COUNT(*) AS count FROM users')
        if (count === 0) {
            console.log('\n\t⏳ Base vide détectée, insertion des données initiales...\n')
            await seedInitData()
            somethingCreated = true
        }

        // Affichage minimal si tout existe
        if (!somethingCreated) {
            console.log(`\n\t✓ Base de données '${dbName}' prête\n`)
        } else {
            console.log('\n\t✅ Initialisation terminée!\n')
        }
    } catch (error) {
        console.error('❌ Erreur initialisation BD:', error)
        throw error
    }
}
