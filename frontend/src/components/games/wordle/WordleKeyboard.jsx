import { KEYBOARD_ROWS } from './wordleUtils.js'

export default function WordleKeyboard({ onKeyPress, keyStatuses, disabled }) {
    return (
        <div className="wordle-keyboard" aria-label="Clavier virtuel">
            {KEYBOARD_ROWS.map((row, rowIndex) => (
                <div key={rowIndex} className="wordle-keyboard__row">
                    {row.map(key => {
                        const status = keyStatuses[key]
                        let className = 'wordle-key'
                        if (key === 'ENTER' || key === 'BACK') className += ' wordle-key--wide'
                        if (status) className += ` wordle-key--${status}`

                        return (
                            <button
                                key={key}
                                className={className}
                                onClick={() => onKeyPress(key)}
                                disabled={disabled}
                                aria-label={key === 'BACK' ? 'Supprimer' : key === 'ENTER' ? 'Valider' : key}
                            >
                                {key === 'BACK' ? '⌫' : key === 'ENTER' ? 'OK' : key}
                            </button>
                        )
                    })}
                </div>
            ))}
        </div>
    )
}
