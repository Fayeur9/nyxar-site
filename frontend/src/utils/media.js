export { extractYouTubeId, getYouTubeThumbnail } from './youtube'
import { getYouTubeThumbnail } from './youtube'

/**
 * Extrait le slug d'un clip Twitch à partir d'une URL.
 * Supporte clips.twitch.tv/xxx et twitch.tv/xxx/clip/xxx
 */
export function extractTwitchClipSlug(url) {
    if (!url) return null
    const patterns = [
        /clips\.twitch\.tv\/([a-zA-Z0-9_-]+)/,
        /twitch\.tv\/[^/]+\/clip\/([a-zA-Z0-9_-]+)/,
    ]
    for (const pattern of patterns) {
        const match = url.match(pattern)
        if (match) return match[1]
    }
    return null
}

/**
 * Retourne une thumbnail placeholder pour un clip Twitch.
 */
export function getTwitchThumbnail(url) {
    const slug = extractTwitchClipSlug(url)
    if (!slug) return null
    return `https://static-cdn.jtvnw.net/twitch-clips-thumbnails/${slug}-preview-480x272.jpg`
}

/**
 * Détecte la plateforme d'une URL média.
 * Retourne 'youtube', 'twitch', ou 'other'.
 */
export function detectPlatform(url) {
    if (!url) return 'other'
    if (/(?:youtube\.com|youtu\.be)/.test(url)) return 'youtube'
    if (/(?:twitch\.tv|clips\.twitch\.tv)/.test(url)) return 'twitch'
    return 'other'
}

/**
 * Retourne la thumbnail appropriée pour une URL,
 * en détectant automatiquement la plateforme.
 */
export function getUrlThumbnail(url) {
    const platform = detectPlatform(url)
    if (platform === 'youtube') return getYouTubeThumbnail(url)
    if (platform === 'twitch') return getTwitchThumbnail(url)
    return null
}
