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
        id: 4,
        slug: 'wordle',
        name: 'Wordle Nyxar',
        description: 'Devinez le mot du jour en 6 essais !',
        icon: '🟩',
        color: '#3498db',
        component: 'wordle'
    }
]

export function getDefaultGameStatus() {
    const status = {}
    miniGames.forEach(game => {
        status[game.slug] = true
    })
    return status
}
