import express from 'express'
import pool from '../db.js'
import { verifyToken } from '../middleware/auth.js'

const router = express.Router()

const normalizeCode = (value = '') => value.trim().toUpperCase()

const ATTEMPT_REWARDS = [600, 400, 200]

router.get('/current', async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT id, challenge_date, difficulty, tmx_id, tmx_url, image_mime, image_data, created_at
             FROM guess_map_challenges
             WHERE challenge_date <= CURDATE()
             ORDER BY challenge_date DESC, created_at DESC
             LIMIT 1`
        )

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Aucun défi disponible pour le moment.' })
        }

        const challenge = rows[0]
        const [previousRows] = await pool.query(
            `SELECT challenge_date, tmx_id, tmx_url
             FROM guess_map_challenges
             WHERE challenge_date < ?
             ORDER BY challenge_date DESC, created_at DESC
             LIMIT 1`,
            [challenge.challenge_date]
        )
        const imageUrl = challenge.image_data
            ? `data:${challenge.image_mime};base64,${challenge.image_data.toString('base64')}`
            : null

        const previousAnswer = previousRows.length > 0
            ? {
                challenge_date: previousRows[0].challenge_date,
                tmx_id: previousRows[0].tmx_id,
                tmx_url: previousRows[0].tmx_url
            }
            : null

        res.json({
            id: challenge.id,
            challenge_date: challenge.challenge_date,
            difficulty: challenge.difficulty,
            tmx_id: challenge.tmx_id,
            tmx_url: challenge.tmx_url,
            image_url: imageUrl,
            created_at: challenge.created_at,
            previous_answer: previousAnswer,
            rewards: ATTEMPT_REWARDS
        })
    } catch (error) {
        console.error('Erreur récupération défi Guess the map:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

router.post('/submit', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id
        const { challengeId, answer } = req.body

        if (!challengeId || !answer) {
            return res.status(400).json({ message: 'Challenge ou réponse manquant.' })
        }

        const [challengeRows] = await pool.query(
            `SELECT id, tmx_id FROM guess_map_challenges WHERE id = ?`
            , [challengeId]
        )

        if (challengeRows.length === 0) {
            return res.status(404).json({ message: 'Défi introuvable ou expiré.' })
        }

        const challenge = challengeRows[0]
        const normalizedAnswer = normalizeCode(answer)
        const expectedCode = normalizeCode(challenge.tmx_id)

        const [alreadyWon] = await pool.query(
            `SELECT id FROM guess_map_attempts WHERE challenge_id = ? AND user_id = ? AND is_correct = 1`
            , [challengeId, userId]
        )

        if (alreadyWon.length > 0) {
            return res.status(409).json({ message: 'Tu as déjà trouvé cette map !' })
        }

        const [attemptCountRows] = await pool.query(
            `SELECT COUNT(*) AS attemptCount FROM guess_map_attempts WHERE challenge_id = ? AND user_id = ?`
            , [challengeId, userId]
        )

        const attemptCount = Number(attemptCountRows[0]?.attemptCount || 0)
        if (attemptCount >= 3) {
            return res.status(429).json({ message: 'Tu as déjà utilisé tes 3 essais pour ce défi.' })
        }

        if (normalizedAnswer !== expectedCode) {
            await pool.query(
                'INSERT INTO guess_map_attempts (challenge_id, user_id, guess, is_correct) VALUES (?, ?, ?, 0)',
                [challengeId, userId, normalizedAnswer]
            )
            const remaining = Math.max(0, 2 - attemptCount)
            const remainingMessage = remaining > 0
                ? `Mauvaise réponse, il te reste ${remaining} essai${remaining > 1 ? 's' : ''} !`
                : 'Mauvaise réponse, tu as utilisé tes 3 essais.'
            return res.status(400).json({
                message: remainingMessage,
                attemptsUsed: attemptCount + 1,
                attemptsRemaining: remaining
            })
        }

        await pool.query(
            'INSERT INTO guess_map_attempts (challenge_id, user_id, guess, is_correct) VALUES (?, ?, ?, 1)',
            [challengeId, userId, normalizedAnswer]
        )

        const [existingScore] = await pool.query(
            'SELECT id, score FROM scores WHERE user_id = ? AND game = ? LIMIT 1',
            [userId, 'guess_map']
        )

        const attemptNumber = attemptCount + 1
        const rewardIndex = Math.max(0, Math.min(attemptNumber - 1, ATTEMPT_REWARDS.length - 1))
        const pointsEarned = ATTEMPT_REWARDS[rewardIndex] ?? 0
        let totalScore = pointsEarned

        if (existingScore.length === 0) {
            await pool.query(
                'INSERT INTO scores (user_id, game, score) VALUES (?, ?, ?)',
                [userId, 'guess_map', totalScore]
            )
        } else {
            totalScore = Number(existingScore[0].score) + pointsEarned
            await pool.query(
                'UPDATE scores SET score = ?, created_at = CURRENT_TIMESTAMP WHERE id = ?',
                [totalScore, existingScore[0].id]
            )
        }

        res.json({
            success: true,
            pointsEarned,
            totalScore,
            attemptNumber
        })
    } catch (error) {
        console.error('Erreur soumission Guess the map:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

export default router
