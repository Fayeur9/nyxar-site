import sharp from 'sharp'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { ensureUploadDir } from './imageUpload.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Mutex simple pour éviter les générations simultanées (saturation mémoire sharp)
let generatingCards = false

const CARD_WIDTH = 1200
const CARD_HEIGHT = 750

/**
 * Lit un fichier image local ou distant et retourne son buffer brut.
 */
async function loadImageBuffer(imageUrl) {
    if (!imageUrl) return null

    try {
        if (imageUrl.startsWith('/uploads/')) {
            const imagePath = path.join(__dirname, '../../frontend/public', imageUrl)
            if (!fs.existsSync(imagePath)) return null
            return fs.readFileSync(imagePath)
        } else if (imageUrl.startsWith('http')) {
            const response = await fetch(imageUrl)
            if (!response.ok) return null
            return Buffer.from(await response.arrayBuffer())
        }
        return null
    } catch (err) {
        console.error('Erreur chargement image:', err.message)
        return null
    }
}

/**
 * Lit une image locale ou distante et retourne un data URI base64 pour l'embarquer dans le SVG.
 */
async function imageToBase64DataUri(imageUrl) {
    const buffer = await loadImageBuffer(imageUrl)
    if (!buffer) return null

    try {
        const resized = await sharp(buffer).resize(120, 120).png().toBuffer()
        return `data:image/png;base64,${resized.toString('base64')}`
    } catch (err) {
        console.error('Erreur conversion image base64:', err.message)
        return null
    }
}

/**
 * Charge une image de fond et la retourne en data URI base64 à la taille de la carte.
 */
async function backgroundToBase64DataUri(imageUrl) {
    const buffer = await loadImageBuffer(imageUrl)
    if (!buffer) return null

    try {
        const resized = await sharp(buffer)
            .resize(CARD_WIDTH, CARD_HEIGHT, { fit: 'cover' })
            .jpeg({ quality: 85 })
            .toBuffer()
        return `data:image/jpeg;base64,${resized.toString('base64')}`
    } catch (err) {
        console.error('Erreur conversion fond de carte base64:', err.message)
        return null
    }
}

/**
 * Charge le logo Nyxar en base64.
 */
async function getLogoBase64() {
    try {
        const logoPath = path.join(__dirname, '../../frontend/public/logo_main.png')
        if (!fs.existsSync(logoPath)) return null
        const buffer = fs.readFileSync(logoPath)
        const resized = await sharp(buffer)
            .resize(50, 50, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .png()
            .toBuffer()
        return `data:image/png;base64,${resized.toString('base64')}`
    } catch {
        return null
    }
}

function escapeXml(str) {
    if (!str) return ''
    return str.replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&apos;')
}

function truncate(str, maxLen) {
    if (!str) return ''
    return str.length > maxLen ? str.substring(0, maxLen - 1) + '…' : str
}

/**
 * Génère le SVG pour une carte de résultat de catégorie.
 */
async function generateCategorySvg(categoryTitle, podium, campaignTitle, backgroundBase64) {
    const logoBase64 = await getLogoBase64()

    const nomineeImages = await Promise.all(
        podium.slice(0, 6).map(n => imageToBase64DataUri(n.image_url))
    )

    // Positions du podium : [2e à gauche, 1er au centre, 3e à droite]
    const positions = [
        { x: 300, y: 300, barHeight: 120, barY: 420, imgSize: 80, rank: '2', color: '#94a3b8', barWidth: 130 },
        { x: 600, y: 245, barHeight: 170, barY: 365, imgSize: 100, rank: '1', color: '#fbbf24', barWidth: 130 },
        { x: 900, y: 330, barHeight: 90,  barY: 455, imgSize: 70,  rank: '3', color: '#d97706', barWidth: 130 },
    ]

    // Mapping: podium[0]=1er, podium[1]=2e, podium[2]=3e → positions[1]=1er, positions[0]=2e, positions[2]=3e
    const podiumMapping = [
        { posIndex: 1, nominee: podium[0], image: nomineeImages[0] },
        { posIndex: 0, nominee: podium[1], image: nomineeImages[1] },
        { posIndex: 2, nominee: podium[2], image: nomineeImages[2] },
    ]

    let nomineeSvg = ''
    for (const { posIndex, nominee, image } of podiumMapping) {
        if (!nominee) continue
        const pos = positions[posIndex]
        const centerX = pos.x
        const imgY = pos.y - pos.imgSize / 2

        // Couronne pour le 1er
        if (pos.rank === '1') {
            const crownY = imgY - pos.imgSize / 2 - 38
            nomineeSvg += `
                <g transform="translate(${centerX - 20}, ${crownY}) scale(0.8)">
                    <path d="M25 50 L5 20 L15 30 L25 5 L35 30 L45 20 L25 50Z"
                          fill="#fbbf24" stroke="#d97706" stroke-width="1.5" />
                </g>
            `
        }

        // Avatar
        if (image) {
            nomineeSvg += `
                <clipPath id="clip-${posIndex}">
                    <circle cx="${centerX}" cy="${imgY}" r="${pos.imgSize / 2}" />
                </clipPath>
                <circle cx="${centerX}" cy="${imgY}" r="${pos.imgSize / 2 + 3}" fill="${pos.color}" />
                <image href="${image}" x="${centerX - pos.imgSize / 2}" y="${imgY - pos.imgSize / 2}"
                       width="${pos.imgSize}" height="${pos.imgSize}" clip-path="url(#clip-${posIndex})" />
            `
        } else {
            nomineeSvg += `
                <circle cx="${centerX}" cy="${imgY}" r="${pos.imgSize / 2}" fill="#1e2639" stroke="${pos.color}" stroke-width="3" />
                <text x="${centerX}" y="${imgY + 8}" text-anchor="middle" fill="#94a3b8" font-size="24" font-weight="700" font-family="system-ui, sans-serif">
                    ${escapeXml(nominee.name?.charAt(0)?.toUpperCase() || '?')}
                </text>
            `
        }

        // Nom
        nomineeSvg += `
            <text x="${centerX}" y="${pos.y + pos.imgSize / 2 + 20}" text-anchor="middle" fill="#f1f5f9" font-size="16" font-weight="600" font-family="system-ui, sans-serif">
                ${escapeXml(truncate(nominee.name, 18))}
            </text>
        `

        // Points
        nomineeSvg += `
            <text x="${centerX}" y="${pos.y + pos.imgSize / 2 + 40}" text-anchor="middle" fill="${pos.color}" font-size="14" font-weight="700" font-family="system-ui, sans-serif">
                ${nominee.total_points} pts
            </text>
        `

        // Barre podium (plus large)
        nomineeSvg += `
            <rect x="${centerX - pos.barWidth / 2}" y="${pos.barY}" width="${pos.barWidth}" height="${pos.barHeight}" rx="6" fill="${pos.color}" opacity="0.8" />
            <text x="${centerX}" y="${pos.barY + 30}" text-anchor="middle" fill="white" font-size="24" font-weight="800" font-family="system-ui, sans-serif">
                ${pos.rank}
            </text>
        `
    }

    // 4e, 5e, 6e place (section compacte sous le podium)
    const extraNominees = podium.slice(3, 6)
    if (extraNominees.length > 0) {
        const extraColors = ['#60a5fa', '#a78bfa', '#f472b6']
        const extraXPositions = extraNominees.length === 1
            ? [600]
            : extraNominees.length === 2
            ? [350, 850]
            : [200, 600, 1000]
        const extraBaseY = 580
        const extraAvatarR = 24

        // Ligne de séparation
        nomineeSvg += `<rect x="80" y="${extraBaseY - 18}" width="${CARD_WIDTH - 160}" height="1" fill="#334155" opacity="0.8" />`

        for (let i = 0; i < extraNominees.length; i++) {
            const nominee = extraNominees[i]
            if (!nominee) continue
            const cx = extraXPositions[i]
            const cy = extraBaseY + extraAvatarR + 10
            const color = extraColors[i]
            const rank = i + 4
            const img = nomineeImages[3 + i]

            // Badge rang
            nomineeSvg += `
                <rect x="${cx - 14}" y="${extraBaseY}" width="28" height="18" rx="4" fill="${color}" opacity="0.9" />
                <text x="${cx}" y="${extraBaseY + 13}" text-anchor="middle" fill="white" font-size="11" font-weight="800" font-family="system-ui, sans-serif">${rank}e</text>
            `

            // Avatar
            if (img) {
                nomineeSvg += `
                    <clipPath id="clip-extra-${i}">
                        <circle cx="${cx}" cy="${cy}" r="${extraAvatarR}" />
                    </clipPath>
                    <circle cx="${cx}" cy="${cy}" r="${extraAvatarR + 2}" fill="${color}" opacity="0.6" />
                    <image href="${img}" x="${cx - extraAvatarR}" y="${cy - extraAvatarR}"
                           width="${extraAvatarR * 2}" height="${extraAvatarR * 2}" clip-path="url(#clip-extra-${i})" />
                `
            } else {
                nomineeSvg += `
                    <circle cx="${cx}" cy="${cy}" r="${extraAvatarR}" fill="#1e2639" stroke="${color}" stroke-width="2" />
                    <text x="${cx}" y="${cy + 5}" text-anchor="middle" fill="#94a3b8" font-size="16" font-weight="700" font-family="system-ui, sans-serif">
                        ${escapeXml(nominee.name?.charAt(0)?.toUpperCase() || '?')}
                    </text>
                `
            }

            // Nom
            nomineeSvg += `
                <text x="${cx}" y="${cy + extraAvatarR + 18}" text-anchor="middle" fill="#f1f5f9" font-size="13" font-weight="600" font-family="system-ui, sans-serif">
                    ${escapeXml(truncate(nominee.name, 16))}
                </text>
            `

            // Points
            nomineeSvg += `
                <text x="${cx}" y="${cy + extraAvatarR + 34}" text-anchor="middle" fill="${color}" font-size="11" font-weight="700" font-family="system-ui, sans-serif">
                    ${nominee.total_points} pts
                </text>
            `
        }
    }

    return `
        <svg xmlns="http://www.w3.org/2000/svg" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}">
            <defs>
                <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stop-color="#0a0e1a" />
                    <stop offset="100%" stop-color="#1e2639" />
                </linearGradient>
                <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stop-color="#6366f1" />
                    <stop offset="100%" stop-color="#8b5cf6" />
                </linearGradient>
            </defs>

            <!-- Fond -->
            ${backgroundBase64
                ? `<image href="${backgroundBase64}" x="0" y="0" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" preserveAspectRatio="xMidYMid slice" />
                   <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="rgba(0,0,0,0.45)" />`
                : `<rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="url(#bg)" />`
            }

            <!-- Barre accent en haut -->
            <rect x="0" y="0" width="${CARD_WIDTH}" height="4" fill="url(#accent)" />

            <!-- Logo -->
            ${logoBase64 ? `<image href="${logoBase64}" x="40" y="20" width="50" height="50" />` : ''}
            <text x="100" y="52" fill="#f1f5f9" font-size="22" font-weight="700" font-family="system-ui, sans-serif">NYXAR</text>

            <!-- Titre catégorie -->
            <text x="${CARD_WIDTH / 2}" y="120" text-anchor="middle" fill="#f1f5f9" font-size="28" font-weight="700" font-family="system-ui, sans-serif">
                ${escapeXml(truncate(categoryTitle, 50))}
            </text>

            <!-- Ligne décorative -->
            <rect x="${CARD_WIDTH / 2 - 40}" y="135" width="80" height="3" rx="2" fill="url(#accent)" />

            <!-- Podium -->
            ${nomineeSvg}

            <!-- Footer -->
            <text x="${CARD_WIDTH / 2}" y="${CARD_HEIGHT - 20}" text-anchor="middle" fill="#64748b" font-size="14" font-family="system-ui, sans-serif">
                ${escapeXml(campaignTitle)}
            </text>
        </svg>
    `
}

/**
 * Convertit un titre de catégorie en nom de fichier safe (underscores, pas d'accents).
 */
function titleToFilename(title) {
    return title
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
        .toLowerCase()
}

/**
 * Génère une carte PNG pour une catégorie.
 */
export async function generateCategoryCard(category, campaignId, campaignTitle, backgroundBase64) {
    const podium = category.podium || []

    if (podium.length === 0) return null

    const svg = await generateCategorySvg(category.title, podium, campaignTitle, backgroundBase64)
    const outputDir = ensureUploadDir(`noty/cards/${campaignId}`)
    const filename = titleToFilename(category.title)
    const outputPath = path.join(outputDir, `${filename}.png`)

    await sharp(Buffer.from(svg))
        .png({ quality: 90 })
        .toFile(outputPath)

    return outputPath
}

/**
 * Génère toutes les cartes pour une campagne.
 * Retourne un tableau de { categoryId, filePath }.
 */
export async function generateAllCards(categories, campaignId, campaignTitle, cardBackgroundUrl) {
    if (generatingCards) {
        throw new Error('Une génération de cartes est déjà en cours. Veuillez patienter.')
    }

    generatingCards = true
    try {
        const results = []

        // Charger le fond custom une seule fois pour toutes les cartes
        const backgroundBase64 = await backgroundToBase64DataUri(cardBackgroundUrl)

        // Séquentiel pour limiter la consommation mémoire de sharp
        for (const category of categories) {
            try {
                const filePath = await generateCategoryCard(category, campaignId, campaignTitle, backgroundBase64)
                if (filePath) {
                    results.push({ categoryId: category.id, filePath })
                }
            } catch (err) {
                console.error(`Erreur génération carte catégorie ${category.id}:`, err.message)
            }
        }

        return results
    } finally {
        generatingCards = false
    }
}
