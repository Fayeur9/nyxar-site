export const miniGames = [
    {
        id: 1,
        slug: 'memory',
        name: 'Memory Trackmania',
        description: 'Retrouvez les paires de cartes Trackmania !',
        icon: '🧠',
        color: '#9b59b6',
        scoreUnit: 'pts',
        component: 'memory'
    },
    {
        id: 2,
        slug: 'snake',
        name: 'Snake Racing',
        description: 'Collectez les checkpoints sans vous crasher !',
        icon: '🏎️',
        color: '#2ecc71',
        scoreUnit: 'points',
        component: 'snake'
    },
    {
        id: 3,
        slug: 'basketball',
        name: 'Basketball Challenge',
        description: 'Marquez un maximum de paniers en 60 secondes !',
        icon: '🏀',
        color: '#e67e22',
        scoreUnit: 'points',
        component: 'basketball'
    }
    ,{
        id: 4,
        slug: 'wordle',
        name: 'Wordle Nyxar',
        description: 'Devinez le mot du jour en 6 essais !',
        icon: '🟩',
        color: '#3498db',
        component: 'wordle'
    },
    {
        id: 5,
        slug: 'guess_map',
        name: 'Guess the Map',
        description: 'Analysez le screenshot et retrouvez la map Trackmania.',
        icon: '🗺️',
        color: '#f97316',
        scoreUnit: 'pts',
        component: 'guessMap'
    }
]

export function getDefaultGameStatus() {
    const status = {}
    miniGames.forEach(game => {
        status[game.slug] = true
    })
    return status
}
