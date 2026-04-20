import express from 'express'
import pool from '../db.js'
import { verifyToken, optionalVerifyToken } from '../middleware/auth.js'
import { getParisDate, getNextResetTimestamp, isValidGuess, pickWordForDate } from '../utils/wordleWords.js'
import { evaluateGuess } from '../utils/wordleEvaluate.js'

const router = express.Router()

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getOrCreateDailyWord(date, mode = 'simple') {
    // Chercher le mot configuré pour ce jour
    const [rows] = await pool.query(
        'SELECT word FROM daily_words WHERE effective_date = ? AND mode = ?',
        [date, mode]
    )
    if (rows.length > 0) return rows[0].word

    // Aucun mot configuré : tirage déterministe + insertion idempotente
    const word = pickWordForDate(date)
    await pool.query(
        'INSERT IGNORE INTO daily_words (word, mode, effective_date) VALUES (?, ?, ?)',
        [word, mode, date]
    )
    // Relire pour gérer la race condition (INSERT IGNORE peut être no-op)
    const [rows2] = await pool.query(
        'SELECT word FROM daily_words WHERE effective_date = ? AND mode = ?',
        [date, mode]
    )
    return rows2[0].word
}

function buildGuessesWithFeedback(guessesData, target) {
    return guessesData.map(g => ({
        word: g.word,
        feedback: evaluateGuess(g.word, target),
    }))
}

async function updateStats(userId, mode, won, guessCount, date) {
    // Vérifier si la veille était une victoire pour la série
    const yesterday = new Date(date)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]

    const [prevGame] = await pool.query(
        'SELECT status FROM wordle_games WHERE user_id = ? AND mode = ? AND date = ?',
        [userId, mode, yesterdayStr]
    )
    const wonYesterday = prevGame.length > 0 && prevGame[0].status === 'won'

    // Lire les stats actuelles
    const [statsRows] = await pool.query(
        'SELECT * FROM wordle_stats WHERE user_id = ? AND mode = ?',
        [userId, mode]
    )

    if (statsRows.length === 0) {
        // Première partie
        const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }
        if (won) dist[guessCount] = 1
        await pool.query(
            `INSERT INTO wordle_stats (user_id, mode, played, won, current_streak, best_streak, guess_distribution, total_guesses)
             VALUES (?, ?, 1, ?, ?, ?, ?, ?)`,
            [userId, mode, won ? 1 : 0, won ? 1 : 0, won ? 1 : 0, JSON.stringify(dist), won ? guessCount : 0]
        )
    } else {
        const s = statsRows[0]
        const dist = typeof s.guess_distribution === 'string'
            ? JSON.parse(s.guess_distribution)
            : s.guess_distribution

        let newStreak = won
            ? (wonYesterday ? s.current_streak + 1 : 1)
            : 0
        const newBest = Math.max(s.best_streak, newStreak)

        if (won) dist[guessCount] = (dist[guessCount] || 0) + 1

        await pool.query(
            `UPDATE wordle_stats SET
                played = played + 1,
                won = won + ?,
                current_streak = ?,
                best_streak = ?,
                guess_distribution = ?,
                total_guesses = total_guesses + ?
             WHERE user_id = ? AND mode = ?`,
            [won ? 1 : 0, newStreak, newBest, JSON.stringify(dist), won ? guessCount : 0, userId, mode]
        )
    }
}

// ─── Routes ──────────────────────────────────────────────────────────────────

/**
 * GET /api/wordle/today
 * Retourne la longueur du mot du jour et l'état de la partie (si connecté).
 */
router.get('/today', optionalVerifyToken, async (req, res) => {
    try {
        const date = getParisDate()
        const word = await getOrCreateDailyWord(date, 'simple')
        const wordLength = word.length
        const nextResetTimestamp = getNextResetTimestamp()

        if (!req.user) {
            return res.json({ wordLength, guesses: [], status: null, date, nextResetTimestamp })
        }

        const [gameRows] = await pool.query(
            'SELECT guesses, status FROM wordle_games WHERE user_id = ? AND mode = ? AND date = ?',
            [req.user.id, 'simple', date]
        )

        if (gameRows.length === 0) {
            return res.json({ wordLength, guesses: [], status: null, date, nextResetTimestamp })
        }

        const game = gameRows[0]
        const storedGuesses = typeof game.guesses === 'string' ? JSON.parse(game.guesses) : game.guesses
        const guesses = buildGuessesWithFeedback(storedGuesses, word)

        // Révéler le mot si la partie est terminée
        const revealedWord = game.status !== 'ongoing' ? word : null

        res.json({ wordLength, guesses, status: game.status, date, nextResetTimestamp, word: revealedWord })
    } catch (error) {
        console.error('Erreur GET /wordle/today:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

/**
 * POST /api/wordle/guess
 * Soumet un guess, retourne le feedback case par case.
 */
router.post('/guess', optionalVerifyToken, async (req, res) => {
    try {
        const date = getParisDate()
        const word = await getOrCreateDailyWord(date, 'simple')
        const wordLength = word.length

        const guess = (req.body.guess || '').toUpperCase().trim()

        if (guess.length !== wordLength) {
            return res.status(422).json({ error: 'invalid_length', message: `Le mot doit faire ${wordLength} lettres` })
        }

        if (!isValidGuess(guess, wordLength)) {
            return res.status(422).json({ error: 'not_in_dictionary', message: 'Mot non reconnu' })
        }

        const feedback = evaluateGuess(guess, word)
        const isWon = feedback.every(f => f.status === 'correct')

        // ── Utilisateur connecté : persistance en base ───────────────────────
        if (req.user) {
            const userId = req.user.id

            // Charger ou créer la partie du jour
            const [gameRows] = await pool.query(
                'SELECT id, guesses, status FROM wordle_games WHERE user_id = ? AND mode = ? AND date = ?',
                [userId, 'simple', date]
            )

            let gameId, storedGuesses, currentStatus

            if (gameRows.length === 0) {
                // Créer la partie
                const [insert] = await pool.query(
                    'INSERT INTO wordle_games (user_id, mode, date, word, guesses, status) VALUES (?, ?, ?, ?, ?, ?)',
                    [userId, 'simple', date, word, '[]', 'ongoing']
                )
                gameId = insert.insertId
                storedGuesses = []
                currentStatus = 'ongoing'
            } else {
                gameId = gameRows[0].id
                storedGuesses = typeof gameRows[0].guesses === 'string'
                    ? JSON.parse(gameRows[0].guesses)
                    : gameRows[0].guesses
                currentStatus = gameRows[0].status
            }

            if (currentStatus !== 'ongoing') {
                return res.status(409).json({ error: 'already_finished', message: 'Partie déjà terminée' })
            }

            if (storedGuesses.length >= 6) {
                return res.status(409).json({ error: 'max_attempts', message: '6 tentatives atteintes' })
            }

            storedGuesses.push({ word: guess })
            const guessCount = storedGuesses.length
            const isLost = !isWon && guessCount >= 6
            const newStatus = isWon ? 'won' : isLost ? 'lost' : 'ongoing'

            await pool.query(
                'UPDATE wordle_games SET guesses = ?, status = ? WHERE id = ?',
                [JSON.stringify(storedGuesses), newStatus, gameId]
            )

            if (newStatus !== 'ongoing') {
                await updateStats(userId, 'simple', isWon, guessCount, date)
            }

            const allGuesses = buildGuessesWithFeedback(storedGuesses, word)

            return res.json({
                feedback,
                status: newStatus,
                guesses: allGuesses,
                word: newStatus !== 'ongoing' ? word : null,
            })
        }

        // ── Guest : pas de persistance, juste le feedback ───────────────────
        const guestGuessCount = parseInt(req.body.guestGuessCount, 10) || 1
        const isLost = !isWon && guestGuessCount >= 6
        const guestStatus = isWon ? 'won' : isLost ? 'lost' : 'ongoing'

        return res.json({
            feedback,
            status: guestStatus,
            word: guestStatus !== 'ongoing' ? word : null,
        })
    } catch (error) {
        console.error('Erreur POST /wordle/guess:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

/**
 * GET /api/wordle/stats
 * Retourne les stats du joueur connecté (mode simple).
 */
router.get('/stats', verifyToken, async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT * FROM wordle_stats WHERE user_id = ? AND mode = ?',
            [req.user.id, 'simple']
        )

        const defaults = {
            played: 0, won: 0, current_streak: 0, best_streak: 0,
            guess_distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
            total_guesses: 0,
        }

        if (rows.length === 0) return res.json(defaults)

        const s = rows[0]
        res.json({
            played: s.played,
            won: s.won,
            current_streak: s.current_streak,
            best_streak: s.best_streak,
            guess_distribution: typeof s.guess_distribution === 'string'
                ? JSON.parse(s.guess_distribution)
                : s.guess_distribution,
            total_guesses: s.total_guesses,
        })
    } catch (error) {
        console.error('Erreur GET /wordle/stats:', error)
        res.status(500).json({ message: 'Erreur serveur' })
    }
})

export default router
