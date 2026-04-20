/** @type {import('jest').Config} */
module.exports = {
    testEnvironment: 'node',
    // ESM natif — pas de transform, Jest gère via --experimental-vm-modules
    transform: {},
    // Charger les variables d'environnement avant tout import de module
    setupFiles: ['<rootDir>/tests/env-setup.cjs'],
    testMatch: ['<rootDir>/tests/**/*.test.js'],
    // Rapport de couverture
    coverageDirectory: '<rootDir>/coverage',
    collectCoverageFrom: [
        'routes/noty-votes.js',
        'middleware/auth.js',
    ],
    coverageReporters: ['text', 'html'],
    // Timeout élevé pour les tests d'intégration BDD
    testTimeout: 15000,
}
