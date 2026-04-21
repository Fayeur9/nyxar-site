import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, '../data')

// Chargement en mémoire au démarrage du serveur
let solutions = []
let validGuessesSet = new Set()

try {
    solutions = JSON.parse(readFileSync(join(DATA_DIR, 'wordle-solutions.json'), 'utf-8'))
    const validGuesses = JSON.parse(readFileSync(join(DATA_DIR, 'wordle-valid-guesses.json'), 'utf-8'))
    validGuessesSet = new Set(validGuesses)
} catch {
    console.error('⚠ Impossible de charger les listes Wordle. Lancer : node scripts/generate-wordle-words.js')
}

/**
 * Retourne la date du jour au format YYYY-MM-DD en heure de Paris.
 */
export function getParisDate() {
    return new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' })
}

/**
 * Retourne le timestamp (ms) de la prochaine minuit heure de Paris.
 */
export function getNextResetTimestamp() {
    const now = new Date()
    // Date de demain à Paris au format YYYY-MM-DD
    const tomorrow = new Date(now.getTime() + 86400000)
        .toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' })
    // Minuit Paris = "YYYY-MM-DD 00:00:00" en heure de Paris → convertir en UTC
    const midnightParis = new Date(`${tomorrow}T00:00:00`)
    // Appliquer l'offset Paris
    const parisOffset = new Date().toLocaleString('en-US', { timeZone: 'Europe/Paris', timeZoneName: 'shortOffset' })
        .match(/GMT([+-]\d+)/)?.[1]
    const offsetHours = parisOffset ? parseInt(parisOffset, 10) : 1
    return midnightParis.getTime() - offsetHours * 3600000
}

/**
 * Vérifie qu'un mot est dans la liste des guesses valides pour une longueur donnée.
 */
export function isValidGuess(word, length) {
    const upper = word.toUpperCase()
    return upper.length === length && validGuessesSet.has(upper)
}

/**
 * Choisit un mot de manière déterministe pour une date et une longueur données.
 * La longueur est dérivée de la date pour varier entre 5 et 8 lettres.
 */
export function pickWordForDate(dateStr) {
    if (solutions.length === 0) throw new Error('Liste de solutions vide')

    // Hash simple de la date
    let hash = 0
    for (const ch of dateStr) {
        hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
    }

    // Longueur cible : rotation 5→6→7→8 selon le hash
    const lengths = [5, 6, 7, 8]
    const targetLength = lengths[hash % lengths.length]

    // Filtrer les solutions de la bonne longueur
    const pool = solutions.filter(w => w.length === targetLength)
    if (pool.length === 0) return solutions[hash % solutions.length]

    return pool[hash % pool.length]
}

export function getSolutions() {
    return solutions
}
