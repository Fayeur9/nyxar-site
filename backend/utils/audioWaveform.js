import { readFile } from 'fs/promises'
import decodeAudio from 'audio-decode'

/**
 * Extrait la waveform d'un fichier audio via audio-decode (pure JS).
 * Retourne un tableau de `barCount` floats normalisés (0.0 - 1.0),
 * ou null si le décodage échoue.
 */
export async function extractWaveform(filePath, barCount = 48) {
    try {
        const buffer = await readFile(filePath)
        const audioBuffer = await decodeAudio(buffer)

        const samples = audioBuffer.getChannelData(0)
        const segmentSize = Math.floor(samples.length / barCount)
        if (segmentSize === 0) return null

        const bars = []
        for (let i = 0; i < barCount; i++) {
            const start = i * segmentSize
            const end = Math.min(start + segmentSize, samples.length)
            let sum = 0
            for (let j = start; j < end; j++) {
                sum += samples[j] * samples[j]
            }
            bars.push(Math.sqrt(sum / (end - start)))
        }

        const max = Math.max(...bars, 0.001)
        const normalized = bars.map(v => Math.round((v / max) * 100) / 100)

        return normalized
    } catch (error) {
        console.error('Erreur extraction waveform:', error.message)
        return null
    }
}
