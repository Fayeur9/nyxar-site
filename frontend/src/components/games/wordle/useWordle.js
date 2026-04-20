import { useState, useEffect, useCallback, useRef } from 'react'
import { API_URL } from '../../../services/api.js'
import { MAX_ATTEMPTS, STORAGE_KEY, getKeyStatuses } from './wordleUtils.js'

const DEFAULT_STATE = {
    wordLength: null,
    guesses: [],       // [{ word, feedback: [{letter, status}] }]
    currentInput: '',
    status: null,      // 'ongoing' | 'won' | 'lost' | null
    revealedWord: null,
    date: null,
    nextResetTimestamp: null,
    loading: true,
    error: null,
    invalidWord: false, // déclenche le shake
    stats: null,
    revealingRow: -1,   // index de la ligne en cours d'animation flip
}

export function useWordle(user, token) {
    const [state, setState] = useState(DEFAULT_STATE)
    const stateRef = useRef(state)
    stateRef.current = state

    // ── Chargement initial ────────────────────────────────────────────────────
    useEffect(() => {
        let cancelled = false

        async function loadGame() {
            try {
                const res = await fetch(`${API_URL}/api/wordle/today`, {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                })
                if (!res.ok) throw new Error('Erreur serveur')
                const data = await res.json()

                if (cancelled) return

                // Guest : tenter de restaurer depuis localStorage
                if (!user) {
                    const saved = loadGuestState(data.date)
                    if (saved) {
                        setState(s => ({
                            ...s,
                            wordLength: data.wordLength,
                            date: data.date,
                            nextResetTimestamp: data.nextResetTimestamp,
                            guesses: saved.guesses,
                            status: saved.status,
                            revealedWord: saved.revealedWord || null,
                            loading: false,
                        }))
                        return
                    }
                }

                setState(s => ({
                    ...s,
                    wordLength: data.wordLength,
                    date: data.date,
                    nextResetTimestamp: data.nextResetTimestamp,
                    guesses: data.guesses || [],
                    status: data.status,
                    revealedWord: data.word || null,
                    loading: false,
                }))
            } catch {
                if (!cancelled) {
                    setState(s => ({ ...s, loading: false, error: 'Impossible de charger le jeu.' }))
                }
            }
        }

        loadGame()
        return () => { cancelled = true }
    }, [user, token])

    // ── Chargement des stats ──────────────────────────────────────────────────
    useEffect(() => {
        if (!user || !token) return
        if (state.status !== 'won' && state.status !== 'lost') return

        fetch(`${API_URL}/api/wordle/stats`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(r => r.json())
            .then(data => setState(s => ({ ...s, stats: data })))
            .catch(() => {})
    }, [user, token, state.status])

    // ── Clavier physique ─────────────────────────────────────────────────────
    useEffect(() => {
        function onKeyDown(e) {
            if (e.ctrlKey || e.altKey || e.metaKey) return
            const tag = document.activeElement?.tagName
            if (tag === 'INPUT' || tag === 'TEXTAREA') return
            handleKeyPress(e.key)
        }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    })

    // ── Actions ───────────────────────────────────────────────────────────────
    const handleKeyPress = useCallback((key) => {
        const s = stateRef.current
        if (s.status !== 'ongoing' && s.status !== null) return
        if (s.loading || !s.wordLength) return

        if (key === 'Backspace' || key === 'BACK') {
            setState(prev => ({ ...prev, currentInput: prev.currentInput.slice(0, -1), invalidWord: false }))
            return
        }
        if (key === 'Enter' || key === 'ENTER') {
            submitGuess()
            return
        }
        if (/^[a-zA-Z]$/.test(key)) {
            setState(prev => {
                if (prev.currentInput.length >= prev.wordLength) return prev
                return { ...prev, currentInput: prev.currentInput + key.toUpperCase(), invalidWord: false }
            })
        }
    }, [])

    async function submitGuess() {
        const s = stateRef.current
        if (!s.wordLength || s.currentInput.length !== s.wordLength) return
        if (s.status !== 'ongoing' && s.status !== null) return

        const guess = s.currentInput

        try {
            const body = { guess }
            if (!user) body.guestGuessCount = s.guesses.length + 1

            const res = await fetch(`${API_URL}/api/wordle/guess`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify(body),
            })

            if (res.status === 422) {
                const data = await res.json()
                setState(prev => ({
                    ...prev,
                    invalidWord: true,
                    error: data.error === 'not_in_dictionary' ? 'Mot non reconnu' : 'Longueur incorrecte',
                }))
                setTimeout(() => setState(prev => ({ ...prev, invalidWord: false, error: null })), 600)
                return
            }

            if (!res.ok) {
                const data = await res.json()
                if (data.error === 'already_finished') return
                return
            }

            const data = await res.json()

            const newGuess = { word: guess, feedback: data.feedback }
            const newGuesses = [...s.guesses, newGuess]
            const newStatus = data.status || (
                data.feedback.every(f => f.status === 'correct') ? 'won'
                    : newGuesses.length >= MAX_ATTEMPTS ? 'lost'
                    : 'ongoing'
            )
            const revealingRow = newGuesses.length - 1

            setState(prev => ({
                ...prev,
                guesses: newGuesses,
                currentInput: '',
                status: newStatus,
                revealedWord: data.word || null,
                revealingRow,
                error: null,
            }))

            // Retirer l'animation flip après qu'elle soit terminée
            const flipDuration = (s.wordLength - 1) * 150 + 500
            setTimeout(() => setState(prev => ({ ...prev, revealingRow: -1 })), flipDuration)

            // Guest : sauvegarder en localStorage
            if (!user) {
                saveGuestState(s.date, {
                    guesses: newGuesses,
                    status: newStatus,
                    revealedWord: data.word || null,
                })
            }
        } catch {
            setState(prev => ({ ...prev, error: 'Erreur réseau' }))
        }
    }

    const keyStatuses = getKeyStatuses(state.guesses)

    return {
        ...state,
        keyStatuses,
        handleKeyPress,
    }
}

// ── localStorage (guests) ─────────────────────────────────────────────────────

function saveGuestState(date, data) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ date, ...data }))
    } catch {}
}

function loadGuestState(todayDate) {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return null
        const saved = JSON.parse(raw)
        if (saved.date !== todayDate) return null // autre jour → ignorer
        return saved
    } catch {
        return null
    }
}
