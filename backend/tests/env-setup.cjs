/**
 * Chargé par Jest AVANT l'import des modules de test (setupFiles).
 * Doit être CommonJS car Jest l'exécute hors contexte ESM.
 *
 * Charge .env.test en priorité — dotenv ne remplace pas les variables déjà définies,
 * donc les vars de .env.test écrasent celles de .env pour cette session.
 */
const path = require('path')
const dotenv = require('dotenv')

dotenv.config({ path: path.join(__dirname, '..', '.env.test'), override: true })

// Forcer NODE_ENV=test pour désactiver l'initialisation de la BDD en démarrage
process.env.NODE_ENV = 'test'
