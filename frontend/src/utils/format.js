/**
 * Formate une date en français (ex: "10 mars 2026")
 */
export function formatDateFr(dateStr) {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    if (d.toString() === 'Invalid Date') return dateStr
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

/**
 * Formate une date en YYYY-MM-DD pour les champs <input type="date">
 */
export function formatDateForInput(dateStr) {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return ''
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}
