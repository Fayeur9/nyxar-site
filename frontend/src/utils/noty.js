/**
 * Convertit un titre de catégorie en nom de fichier safe (underscores, pas d'accents).
 */
export function titleToFilename(title) {
    return title
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
        .toLowerCase()
}
