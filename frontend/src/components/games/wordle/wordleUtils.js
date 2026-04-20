export const MAX_ATTEMPTS = 6
export const STORAGE_KEY = 'wordle-simple-state'
export const STORAGE_HELP_KEY = 'wordle-seen-help'

export const KEYBOARD_ROWS = [
    ['A', 'Z', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['Q', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'M'],
    ['ENTER', 'W', 'X', 'C', 'V', 'B', 'N', 'BACK'],
]

/**
 * Calcule le meilleur statut connu pour chaque lettre du clavier.
 * correct > present > absent > undefined
 */
export function getKeyStatuses(guesses) {
    const priority = { correct: 3, present: 2, absent: 1 }
    const statuses = {}
    for (const { word, feedback } of guesses) {
        for (let i = 0; i < word.length; i++) {
            const letter = word[i]
            const status = feedback[i].status
            if ((priority[status] || 0) > (priority[statuses[letter]] || 0)) {
                statuses[letter] = status
            }
        }
    }
    return statuses
}

/**
 * Génère le texte de partage emoji sans révéler le mot.
 */
export function generateShareText(guesses, won, date) {
    const score = won ? `${guesses.length}/${MAX_ATTEMPTS}` : `X/${MAX_ATTEMPTS}`
    const header = won
        ? `Wordle Nyxar ${date} — ${score} 🟩`
        : `Wordle Nyxar ${date} — ${score} 💀`

    const emojiGrid = guesses.map(({ feedback }) =>
        feedback.map(f => {
            if (f.status === 'correct') return '🟩'
            if (f.status === 'present') return '🟨'
            return '⬜'
        }).join('')
    ).join('\n')

    return `${header}\n\n${emojiGrid}\n\nhttps://nyxar.fr/mini-jeux/wordle`
}
