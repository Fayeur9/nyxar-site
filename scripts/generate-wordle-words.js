#!/usr/bin/env node
/**
 * Génère les deux listes de mots pour le Wordle depuis liste_mots.tsv
 * Usage : node scripts/generate-wordle-words.js
 */

import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

function normalize(word) {
    return word
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase()
}

const tsv = readFileSync(join(ROOT, 'liste_mots.tsv'), 'utf-8')
const lines = tsv.split('\n')

const solutions = new Set()
const validGuesses = new Set()

for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const cols = line.split('\t')
    if (cols.length < 6) continue

    const mot    = cols[0]
    const cgram  = cols[2]   // 5_Cgram
    const isLem  = cols[4]   // 14_IsLem
    const nbLet  = parseInt(cols[5], 10)  // 15_NbLettres

    if (nbLet < 5 || nbLet > 8) continue

    const normalized = normalize(mot)

    // Garde uniquement les mots en lettres pures (pas de tiret, apostrophe, etc.)
    if (!/^[A-Z]+$/.test(normalized)) continue

    validGuesses.add(normalized)

    // Mots à deviner : NOM, ADJ, VER à l'infinitif uniquement
    if ((cgram === 'NOM' || cgram === 'ADJ' || cgram === 'VER') && isLem === '1') {
        solutions.add(normalized)
    }
}

const solutionsArr = Array.from(solutions).sort()
const validGuessesArr = Array.from(validGuesses).sort()

writeFileSync(
    join(ROOT, 'backend/data/wordle-solutions.json'),
    JSON.stringify(solutionsArr)
)
writeFileSync(
    join(ROOT, 'backend/data/wordle-valid-guesses.json'),
    JSON.stringify(validGuessesArr)
)

console.log(`Solutions (mots à deviner)  : ${solutionsArr.length}`)
console.log(`Guesses valides             : ${validGuessesArr.length}`)
console.log('Fichiers générés dans backend/data/')

// Répartition par longueur
const byLen = {}
for (const w of solutionsArr) {
    byLen[w.length] = (byLen[w.length] || 0) + 1
}
console.log('Répartition solutions :')
for (const [len, count] of Object.entries(byLen).sort()) {
    console.log(`  ${len} lettres : ${count} mots`)
}
