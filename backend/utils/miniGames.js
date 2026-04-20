import pool from '../db.js'

export const MINI_GAMES_DEFAULTS = [
    { game_id: 1, slug: 'memory', is_active: 1, display_order: 1 },
    { game_id: 2, slug: 'snake', is_active: 1, display_order: 2 },
    { game_id: 3, slug: 'basketball', is_active: 1, display_order: 3 },
    { game_id: 4, slug: 'wordle', is_active: 1, display_order: 4 },
    { game_id: 5, slug: 'guess_map', is_active: 1, display_order: 5 }
]

export async function ensureMiniGamesSettingsDefaults() {
    for (const game of MINI_GAMES_DEFAULTS) {
        await pool.query(
            `INSERT INTO mini_game_settings (game_id, slug, is_active, display_order)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                slug = VALUES(slug),
                display_order = VALUES(display_order)` ,
            [game.game_id, game.slug, game.is_active, game.display_order]
        )
    }
}
