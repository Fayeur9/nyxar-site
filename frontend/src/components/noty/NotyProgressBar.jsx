/**
 * Barre de progression pour les votes NOTY.
 *
 * @param {number} voted    - Nombre de catégories votées
 * @param {number} total    - Nombre total de catégories
 * @param {string} [label]  - Texte affiché sous la barre (par défaut : "X / Y catégories votées" ou "Toutes les catégories votées !")
 * @param {string} [className] - Classes CSS supplémentaires
 */
export default function NotyProgressBar({ voted, total, label, className = '' }) {
    if (!total) return null

    const percent = Math.round((voted / total) * 100)
    const isComplete = voted === total
    const defaultLabel = isComplete
        ? 'Toutes les catégories votées !'
        : `${voted} / ${total} catégories votées`

    return (
        <div className={`noty-progress${isComplete ? ' noty-progress--complete' : ''}${className ? ` ${className}` : ''}`}>
            <div className="noty-progress__track">
                <div className="noty-progress__bar" style={{ width: `${percent}%` }} />
            </div>
            <span className="noty-progress__text">{label ?? defaultLabel}</span>
        </div>
    )
}
