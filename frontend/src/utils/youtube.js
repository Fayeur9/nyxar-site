/**
 * Extrait l'ID d'une vidéo YouTube à partir d'une URL.
 * Supporte youtube.com/watch, youtu.be, youtube.com/embed, youtube.com/shorts
 */
export function extractYouTubeId(url) {
    if (!url) return null
    const patterns = [
        /(?:youtube\.com\/watch\?.*v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    ]
    for (const pattern of patterns) {
        const match = url.match(pattern)
        if (match) return match[1]
    }
    return null
}

/**
 * Retourne l'URL de la thumbnail HQ d'une vidéo YouTube.
 */
export function getYouTubeThumbnail(url) {
    const id = extractYouTubeId(url)
    if (!id) return null
    return `https://img.youtube.com/vi/${id}/hqdefault.jpg`
}
