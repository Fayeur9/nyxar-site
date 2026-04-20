#!/usr/bin/env node
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { createDatabase, createAllTables, purgeAllData, dropDatabase } from './schema.js'
import { seedInitData } from './seed-init.js'
import { seedTestData } from './seed-test.js'
import pool from './db.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '.env') })

const command = process.argv[2]

async function run() {
    console.log('\n========================================')
    console.log('    NYXAR Database CLI')
    console.log('========================================\n')

    try {
        switch (command) {
            case 'init':
                console.log('Commande: db:init - Création des tables\n')
                await createDatabase()
                await createAllTables()
                console.log('\n✅ Tables créées avec succès!')
                break

            case 'purge':
                console.log('Commande: db:purge - Suppression des données\n')
                await purgeAllData()
                console.log('\n✅ Données supprimées avec succès!')
                break

            case 'setup':
                console.log('Commande: db:setup - Initialisation du site\n')
                await seedInitData()
                console.log('\n✅ Données d\'initialisation insérées avec succès!')
                break

            case 'setup:test':
                console.log('Commande: db:setup:test - Insertion des données de test\n')
                await seedTestData()
                console.log('\n✅ Données de test insérées avec succès!')
                break

            case 'reset':
                console.log('Commande: db:reset - Drop + Init + Seed init\n')
                await dropDatabase()
                await createDatabase()
                await createAllTables()
                await seedInitData()
                console.log('\n✅ Base de données réinitialisée avec succès!')
                break

            case 'reset:full':
                console.log('Commande: db:reset:full - Drop + Init + Seed init + Seed test\n')
                await dropDatabase()
                await createDatabase()
                await createAllTables()
                await seedInitData()
                await seedTestData()
                console.log('\n✅ Base de données réinitialisée avec données de test!')
                break

            case 'drop':
                console.log('Commande: db:drop - Suppression de la base de données\n')
                await dropDatabase()
                console.log('\n✅ Base de données supprimée avec succès!')
                break

            default:
                console.log('Usage: node db-cli.js <command>\n')
                console.log('Commandes disponibles:')
                console.log('  init        - Créer les tables (si elles n\'existent pas)')
                console.log('  purge       - Vider toutes les données')
                console.log('  setup       - Insérer les données d\'initialisation du site')
                console.log('  setup:test  - Insérer les données de test (nécessite setup)')
                console.log('  reset       - Drop + Init + Seed init')
                console.log('  reset:full  - Drop + Init + Seed init + Seed test')
                console.log('  drop        - Supprimer la base de données entièrement')
                console.log('')
                process.exit(1)
        }
    } catch (error) {
        console.error('\n❌ Erreur:', error.message)
        process.exit(1)
    } finally {
        await pool.end()
        process.exit(0)
    }
}

run()
