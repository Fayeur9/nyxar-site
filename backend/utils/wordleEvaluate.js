/**
 * Évalue un guess par rapport au mot cible.
 * Gère correctement les lettres dupliquées (standard Wordle).
 *
 * @param {string} guess  - Mot saisi (majuscules, même longueur que target)
 * @param {string} target - Mot cible (majuscules)
 * @returns {Array<{letter: string, status: 'correct'|'present'|'absent'}>}
 */
export function evaluateGuess(guess, target) {
    const result = Array.from({ length: target.length }, (_, i) => ({
        letter: guess[i],
        status: 'absent',
    }))

    // Fréquence des lettres restantes dans le target (décrémentée au fil des passes)
    const freq = {}
    for (const ch of target) {
        freq[ch] = (freq[ch] || 0) + 1
    }

    // Passe 1 : marquer les corrects (vert)
    for (let i = 0; i < target.length; i++) {
        if (guess[i] === target[i]) {
            result[i].status = 'correct'
            freq[guess[i]]--
        }
    }

    // Passe 2 : marquer les présents (jaune) dans la limite des occurrences restantes
    for (let i = 0; i < target.length; i++) {
        if (result[i].status === 'correct') continue
        if (freq[guess[i]] > 0) {
            result[i].status = 'present'
            freq[guess[i]]--
        }
    }

    return result
}
