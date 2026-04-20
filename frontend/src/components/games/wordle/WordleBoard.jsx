import { MAX_ATTEMPTS } from './wordleUtils.js'

function WordleTile({ letter, status, reveal, revealDelay }) {
    let className = 'wordle-tile'
    if (letter) className += ' wordle-tile--filled'
    if (status) className += ` wordle-tile--${status}`
    if (reveal) className += ' wordle-tile--reveal'

    return (
        <div
            className={className}
            style={reveal ? { animationDelay: `${revealDelay}ms` } : undefined}
        >
            {letter}
        </div>
    )
}

function WordleRow({ tiles, wordLength, shake, revealingRow, rowIndex }) {
    const isRevealing = revealingRow === rowIndex

    let rowClass = 'wordle-row'
    if (shake) rowClass += ' wordle-row--shake'

    return (
        <div className={rowClass} style={{ '--word-length': wordLength }}>
            {Array.from({ length: wordLength }, (_, i) => (
                <WordleTile
                    key={i}
                    letter={tiles[i]?.letter || ''}
                    status={tiles[i]?.status || null}
                    reveal={isRevealing && !!tiles[i]?.status}
                    revealDelay={i * 150}
                />
            ))}
        </div>
    )
}

export default function WordleBoard({ guesses, currentInput, wordLength, shakeLastRow, revealingRow }) {
    if (!wordLength) return <div className="wordle-board wordle-board--loading" />

    const rows = Array.from({ length: MAX_ATTEMPTS }, (_, rowIndex) => {
        if (rowIndex < guesses.length) {
            // Ligne soumise
            const { word, feedback } = guesses[rowIndex]
            const tiles = Array.from({ length: wordLength }, (_, i) => ({
                letter: word[i] || '',
                status: feedback[i]?.status || null,
            }))
            return { tiles, isActive: false }
        }
        if (rowIndex === guesses.length) {
            // Ligne active (saisie en cours)
            const tiles = Array.from({ length: wordLength }, (_, i) => ({
                letter: currentInput[i] || '',
                status: null,
            }))
            return { tiles, isActive: true }
        }
        // Ligne vide
        return { tiles: Array.from({ length: wordLength }, () => ({ letter: '', status: null })), isActive: false }
    })

    return (
        <div className="wordle-board">
            {rows.map((row, i) => (
                <WordleRow
                    key={i}
                    tiles={row.tiles}
                    wordLength={wordLength}
                    shake={shakeLastRow && i === guesses.length}
                    revealingRow={revealingRow}
                    rowIndex={i}
                />
            ))}
        </div>
    )
}
