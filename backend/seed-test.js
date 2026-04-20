import pool from './db.js'

// ==================== CAMPAGNES 2024 + 2026 ====================

export async function seedTestCampaigns() {
    try {
        const campaigns = [
            { title: 'Noty Awards 2024', image_filename: 'noty_2024.png', start_date: '2024-01-15', end_date: '2024-06-30', results_end_date: '2024-07-31' },
            { title: 'Noty Awards 2026', image_filename: 'noty_2026.png', start_date: '2026-01-01', end_date: '2026-12-31', results_end_date: null },
        ]

        for (const c of campaigns) {
            const [result] = await pool.query(
                'INSERT INTO noty_campaign (title, start_date, end_date, results_end_date) VALUES (?, ?, ?, ?)',
                [c.title, c.start_date, c.end_date, c.results_end_date]
            )
            const imageUrl = `/uploads/noty/campaign/${result.insertId}/${c.image_filename}`
            await pool.query('UPDATE noty_campaign SET image_url = ? WHERE id = ?', [imageUrl, result.insertId])
            console.log(`✓ Campagne '${c.title}' créée (id=${result.insertId})`)
        }
    } catch (error) {
        console.error('Erreur insertion campagnes de test:', error)
    }
}

// ==================== CATÉGORIES 2024 + 2026 ====================

export async function seedTestVotingCategories() {
    try {
        // === 2024 ===
        const [rows2024] = await pool.query('SELECT id FROM noty_campaign WHERE title = ? LIMIT 1', ['Noty Awards 2024'])
        const id2024 = rows2024.length > 0 ? rows2024[0].id : null

        if (id2024) {
            const img24 = `/uploads/noty/categories/${id2024}/thumbnails/category1.png`
            const cats2024 = [
                { title: 'Dirt Player of the Year', description: 'Meilleur joueur Dirt 2024', image_url: img24, game_id: 1, display_order: 1 },
                { title: 'Tech Player of the Year', description: 'Meilleur joueur Tech 2024', image_url: img24, game_id: 1, display_order: 2 },
                { title: 'Rookie of the Year', description: 'Meilleur nouveau joueur 2024', image_url: img24, game_id: null, display_order: 3 },
                { title: 'Nyxar Spirit of the Year', description: 'Esprit Nyxar 2024', image_url: img24, game_id: null, display_order: 4 },
                { title: 'Nyxar of the Year', description: 'Le Nyxar de l\'année 2024', image_url: img24, game_id: null, visible_by_nyxar: 0, display_order: 5 },
            ]
            for (const cat of cats2024) {
                await pool.query(
                    'INSERT INTO voting_categories (title, description, image_url, game_id, noty_campaign_id, visible_by_nyxar, votes_count, display_order, nominee_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [cat.title, cat.description, cat.image_url, cat.game_id ?? null, id2024, cat.visible_by_nyxar ?? 1, 0, cat.display_order, 'player']
                )
            }
            console.log(`✓ ${cats2024.length} catégories créées pour Noty Awards 2024`)
        }

        // === 2026 ===
        const [rows2026] = await pool.query('SELECT id FROM noty_campaign WHERE title = ? LIMIT 1', ['Noty Awards 2026'])
        const id2026 = rows2026.length > 0 ? rows2026[0].id : null

        if (id2026) {
            const img26 = `/uploads/noty/categories/${id2026}/thumbnails/category1.png`
            const img26_2 = `/uploads/noty/categories/${id2026}/thumbnails/category2.png`
            const cats2026 = [
                // --- Trackmania surfaces ---
                { title: 'Dirt Player of the Year', description: 'Meilleur joueur sur les surfaces Dirt', image_url: img26, game_id: 1, display_order: 1 },
                { title: 'Tech Player of the Year', description: 'Meilleur joueur sur les surfaces Tech', image_url: img26, game_id: 1, display_order: 2 },
                { title: 'Plastic Player of the Year', description: 'Meilleur joueur sur les surfaces Plastic', image_url: img26, game_id: 1, display_order: 3 },
                { title: 'RPG Player of the Year', description: 'Meilleur joueur en RPG', image_url: img26, game_id: 1, display_order: 4 },
                { title: 'FS Player of the Year', description: 'Meilleur joueur en Fullspeed', image_url: img26, game_id: 1, display_order: 5 },
                { title: 'Ice Player of the Year', description: 'Meilleur joueur sur les surfaces Ice', image_url: img26, game_id: 1, display_order: 6 },
                { title: 'Bob Player of the Year', description: 'Meilleur joueur en Bobsleigh', image_url: img26, game_id: 1, display_order: 7 },
                { title: 'Short Player of the Year', description: 'Meilleur joueur sur les maps courtes', image_url: img26, game_id: 1, display_order: 8 },
                { title: 'LOL Player of the Year', description: 'Meilleur joueur en LOL', image_url: img26, game_id: 1, display_order: 9 },
                { title: 'Pathfinding Player of the Year', description: 'Meilleur joueur en Pathfinding', image_url: img26, game_id: 1, display_order: 10 },
                { title: 'Grass Player of the Year', description: 'Meilleur joueur sur les surfaces Grass', image_url: img26, game_id: 1, display_order: 11 },
                { title: 'Mixed Player of the Year', description: 'Meilleur joueur sur les maps Mixed', image_url: img26, game_id: 1, display_order: 12 },
                { title: 'Snowcar Player of the Year', description: 'Meilleur joueur en Snowcar', image_url: img26, game_id: 1, display_order: 13 },
                { title: 'Desertcar Player of the Year', description: 'Meilleur joueur en Desertcar', image_url: img26, game_id: 1, display_order: 14 },
                { title: 'Rally Player of the Year', description: 'Meilleur joueur en Rally', image_url: img26, game_id: 1, display_order: 15 },
                // --- Rematch ---
                { title: 'Rematch: Chocker of the Year', description: 'Le joueur qui choke le plus en Rematch', image_url: img26_2, game_id: 2, display_order: 16 },
                { title: 'Rematch: Scorer of the Year', description: 'Meilleur buteur en Rematch', image_url: img26_2, game_id: 2, display_order: 17 },
                { title: 'Rematch: Goal of the Year', description: 'Plus beau but de l\'année en Rematch', image_url: img26_2, game_id: 2, display_order: 18, nominee_type: 'video' },
                { title: 'Rematch: Goal Assist of the Year', description: 'Meilleur passeur en Rematch', image_url: img26_2, game_id: 2, display_order: 19 },
                // --- Compétences générales ---
                { title: 'Rookie of the Year', description: 'Meilleur nouveau joueur de l\'année', image_url: img26, game_id: null, display_order: 20 },
                { title: 'Most Improved of the Year', description: 'Joueur ayant le plus progressé cette année', image_url: img26, game_id: null, display_order: 21 },
                { title: 'Hunter of the Year', description: 'Meilleur joueur en mode Hunter', image_url: img26, game_id: 1, display_order: 22 },
                { title: 'Régu of the Year', description: 'Joueur le plus régulier de l\'année', image_url: img26, game_id: null, display_order: 23 },
                { title: 'Fast Learner of the Year', description: 'Joueur qui apprend le plus vite', image_url: img26, game_id: null, display_order: 24 },
                { title: 'Clutcher of the Year', description: 'Joueur qui clutch le plus dans les moments critiques', image_url: img26, game_id: null, display_order: 25 },
                { title: 'Clip of the Year', description: 'Meilleur clip de l\'année', image_url: img26, game_id: null, display_order: 26, nominee_type: 'video' },
                // --- Personnalité & communauté ---
                { title: 'Soundboard of the Year', description: 'La personne au meilleur soundboard', image_url: img26, game_id: null, display_order: 27, nominee_type: 'sound' },
                { title: 'Tilter of the Year', description: 'Le joueur qui tilt le plus', image_url: img26, game_id: null, display_order: 28 },
                { title: 'Puant of the Year', description: 'Le joueur le plus puant', image_url: img26, game_id: null, display_order: 29 },
                { title: 'Nyxar Spirit of the Year', description: 'La personne qui incarne le mieux l\'esprit Nyxar', image_url: img26, game_id: null, display_order: 30 },
                { title: 'Mate of the Year', description: 'Le meilleur coéquipier de l\'année', image_url: img26, game_id: null, display_order: 31 },
                { title: 'Hardworker of the Year', description: 'Le joueur le plus travailleur', image_url: img26, game_id: null, display_order: 32 },
                { title: 'Clown of the Year', description: 'La personne la plus drôle de l\'équipe', image_url: img26, game_id: null, display_order: 33 },
                { title: 'Zen of the Year', description: 'La personne la plus zen et posée', image_url: img26, game_id: null, display_order: 34 },
                { title: 'Piplette of the Year', description: 'La personne qui parle le plus', image_url: img26, game_id: null, display_order: 35 },
                { title: 'Cutter of the Year', description: 'Le joueur qui coupe le plus la parole', image_url: img26, game_id: null, display_order: 36 },
                { title: 'Most Positive Player of the Year', description: 'Le joueur le plus positif', image_url: img26, game_id: null, display_order: 37 },
                { title: 'Most Tired People of the Year', description: 'La personne la plus fatiguée de l\'année', image_url: img26, game_id: null, display_order: 38 },
                { title: 'Shy of the Year', description: 'La personne la plus timide', image_url: img26, game_id: null, display_order: 39 },
                { title: 'Greeder of the Year', description: 'Le joueur le plus avare en jeu', image_url: img26, game_id: null, display_order: 40 },
                { title: 'Suceur de Staff of the Year', description: 'La personne qui lèche le plus le staff', image_url: img26, game_id: null, display_order: 41 },
                // --- Staff & contributions ---
                { title: 'Captain of the Year', description: 'Meilleur capitaine de l\'année', image_url: img26, game_id: null, display_order: 42 },
                { title: 'Staff of the Year', description: 'Meilleur membre du staff', image_url: img26, game_id: null, display_order: 43 },
                { title: 'Mapper of the Year', description: 'Meilleur créateur de maps', image_url: img26, game_id: null, display_order: 44, nominee_type: 'image' },
                { title: 'Caster of the Year', description: 'Meilleur caster / commentateur', image_url: img26, game_id: null, display_order: 45 },
                { title: 'Skin Maker of the Year', description: 'Meilleur créateur de skins', image_url: img26, game_id: null, display_order: 46, nominee_type: 'image' },
                // --- Événements ---
                { title: 'Nyxar Moment of the Year', description: 'Le meilleur moment Nyxar de l\'année', image_url: img26, game_id: null, display_order: 47, nominee_type: 'url' },
                { title: 'Nyxar\'s Cup of the Year', description: 'La meilleure Nyxar Cup de l\'année', image_url: img26, game_id: null, display_order: 48, nominee_type: 'url' },
                // --- Grand prix ---
                { title: 'Nyxar of the Year', description: 'Le Nyxar de l\'année, toutes catégories confondues', image_url: img26, game_id: null, visible_by_nyxar: 0, display_order: 49 },
            ]
            for (const cat of cats2026) {
                await pool.query(
                    'INSERT INTO voting_categories (title, description, image_url, game_id, noty_campaign_id, visible_by_nyxar, votes_count, display_order, nominee_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [cat.title, cat.description, cat.image_url, cat.game_id ?? null, id2026, cat.visible_by_nyxar ?? 1, 0, cat.display_order, cat.nominee_type || 'player']
                )
            }
            console.log(`✓ ${cats2026.length} catégories créées pour Noty Awards 2026`)
        }
    } catch (error) {
        console.error('Erreur insertion catégories de test:', error)
    }
}

// ==================== CUSTOM NOMINEES 2026 ====================

export async function seedTestCustomNominees() {
    try {
        const [rows] = await pool.query('SELECT id FROM noty_campaign WHERE title = ? LIMIT 1', ['Noty Awards 2026'])
        if (rows.length === 0) return
        const campaignId = rows[0].id

        const [categories] = await pool.query(
            'SELECT id, title, nominee_type FROM voting_categories WHERE noty_campaign_id = ? AND nominee_type != ?',
            [campaignId, 'player']
        )

        const nom = `/uploads/noty/categories/${campaignId}/nominees`
        const nomineesData = {
            'Clip of the Year': [
                { title: 'Kuumba triple wallbang', media_url: `${nom}/clip_kuumba_01.mp4` },
                { title: 'Yeager clutch insane', media_url: 'https://www.twitch.tv/yeager_t4/clip/TenuousBloodyYakinikuTwitchRPG-CjPLE8s9G3yR6Oe8' },
                { title: 'Yeager rage quit fail', media_url: 'https://www.twitch.tv/yeager_t4/clip/ApatheticPoorNigiriFloof-5aOHbyKOLnVy_k8g' },
            ],
            'Rematch: Goal of the Year': [
                { title: 'Tommy air dribble goal', media_url: 'https://www.youtube.com/watch?v=goal_tommy_01' },
                { title: 'Kuumba ceiling shot', media_url: 'https://www.youtube.com/watch?v=goal_kuumba_01' },
                { title: 'Lukario double tap', media_url: 'https://www.youtube.com/watch?v=goal_lukario_01' },
            ],
            'Soundboard of the Year': [
                { title: 'ZerdaFox rage compilation', media_url: `${nom}/zerda_rage.mp3` },
                { title: 'Tommy micro-coupé moment', media_url: `${nom}/tommy_micro.mp3` },
                { title: 'Bvddy zen ASMR', media_url: `${nom}/bvddy_asmr.mp3` },
                { title: 'Dahsirio fou rire', media_url: `${nom}/dahsirio_rire.mp3` },
                { title: 'Kuumba soundboard spam', media_url: `${nom}/kuumba_soundboard.mp3` },
            ],
            'Mapper of the Year': [
                { title: 'Trilisk - Canyon Odyssey', media_url: `${nom}/trilisk_canyon_odyssey.png` },
                { title: 'X-Strab - Winter Madness', media_url: `${nom}/xstrab_winter_madness.png` },
                { title: 'Kuumba - Desert Storm', media_url: `${nom}/kuumba_desert_storm.png` },
            ],
            'Skin Maker of the Year': [
                { title: 'Coz - Nyxar Racing Livery', media_url: `${nom}/coz_nyxar_livery.png` },
                { title: 'Trilisk - Carbon Fiber', media_url: `${nom}/trilisk_carbon.png` },
                { title: 'ZerdaFox - Fox Edition', media_url: `${nom}/zerda_fox_edition.png` },
                { title: 'Bvddy - Minimalist White', media_url: `${nom}/bvddy_minimalist.png` },
            ],
            'Nyxar Moment of the Year': [
                { title: 'La remontada en TMGL', media_url: 'https://nyxar.gg/moments/remontada-tmgl' },
                { title: 'Le clutch de Kuumba en finale', media_url: 'https://nyxar.gg/moments/clutch-kuumba-finale' },
                { title: 'Premier top 10 de Tommy', media_url: 'https://nyxar.gg/moments/tommy-top10' },
                { title: 'La rage de ZerdaFox en stream', media_url: 'https://clips.twitch.tv/zerda_rage_moment' },
            ],
            'Nyxar\'s Cup of the Year': [
                { title: 'Nyxar Cup #12 - Ice Edition', media_url: 'https://nyxar.gg/cups/12-ice-edition' },
                { title: 'Nyxar Cup #15 - Dirt Showdown', media_url: 'https://nyxar.gg/cups/15-dirt-showdown' },
                { title: 'Nyxar Cup #18 - Tech Masters', media_url: 'https://nyxar.gg/cups/18-tech-masters' },
                { title: 'Nyxar Cup #20 - Anniversary Special', media_url: 'https://nyxar.gg/cups/20-anniversary' },
                { title: 'Nyxar Cup #22 - Mixed Chaos', media_url: 'https://nyxar.gg/cups/22-mixed-chaos' },
            ],
        }

        let total = 0
        for (const cat of categories) {
            const nominees = nomineesData[cat.title]
            if (!nominees) continue
            for (let i = 0; i < nominees.length; i++) {
                await pool.query(
                    'INSERT INTO custom_nominees (category_id, title, media_url, display_order) VALUES (?, ?, ?, ?)',
                    [cat.id, nominees[i].title, nominees[i].media_url, i + 1]
                )
                total++
            }
            console.log(`✓ ${nominees.length} nominés custom pour '${cat.title}' (${cat.nominee_type})`)
        }
        console.log(`✓ ${total} custom nominees créés au total`)
    } catch (error) {
        console.error('Erreur insertion custom nominees:', error)
    }
}

// ==================== VOTES 2024 + 2026 ====================

export async function seedTestVotes() {
    try {
        const [users] = await pool.query('SELECT id, username FROM users')
        const [nyxariens] = await pool.query('SELECT id, pseudo FROM nyxariens')

        const getUserId = (username) => users.find(u => u.username === username)?.id ?? null
        const getNyxarienId = (pseudo) => nyxariens.find(n => n.pseudo === pseudo)?.id ?? null

        const insertVotes = async (campaignTitle, votes) => {
            const [campRows] = await pool.query('SELECT id FROM noty_campaign WHERE title = ? LIMIT 1', [campaignTitle])
            if (campRows.length === 0) return

            const campId = campRows[0].id
            const [categories] = await pool.query('SELECT id, title FROM voting_categories WHERE noty_campaign_id = ?', [campId])

            let count = 0
            for (const vote of votes) {
                const userId = getUserId(vote.username)
                const cat = categories.find(c => c.title === vote.categoryTitle)
                if (userId && cat) {
                    await pool.query(
                        'INSERT INTO votes (user_id, category_id, noty_campaign_id, first_choice, second_choice, third_choice) VALUES (?, ?, ?, ?, ?, ?)',
                        [userId, cat.id, campId, getNyxarienId(vote.first), getNyxarienId(vote.second), getNyxarienId(vote.third)]
                    )
                    count++
                }
            }
            console.log(`✓ ${count} votes créés pour '${campaignTitle}'`)
        }

        // ==================== VOTES 2024 ====================
        await insertVotes('Noty Awards 2024', [
            { username: 'nyxar', categoryTitle: 'Dirt Player of the Year', first: 'Kuumba', second: 'Bvddy', third: 'Trilisk' },
            { username: 'Kuumba', categoryTitle: 'Dirt Player of the Year', first: 'Bvddy', second: 'Trilisk', third: 'X-Strab' },
            { username: 'ZerdaFox', categoryTitle: 'Dirt Player of the Year', first: 'Kuumba', second: 'Bvddy', third: 'Tommy' },
            { username: 'admin25', categoryTitle: 'Tech Player of the Year', first: 'Trilisk', second: 'X-Strab', third: 'Bvddy' },
            { username: 'nyxar', categoryTitle: 'Tech Player of the Year', first: 'Trilisk', second: 'X-Strab', third: 'Kuumba' },
            { username: 'user25', categoryTitle: 'Tech Player of the Year', first: 'X-Strab', second: 'Trilisk', third: 'Bvddy' },
            { username: 'Kuumba', categoryTitle: 'Tech Player of the Year', first: 'X-Strab', second: 'Trilisk', third: 'Bvddy' },
            { username: 'admin25', categoryTitle: 'Rookie of the Year', first: 'Tommy', second: 'Lukario', third: 'Roquett' },
            { username: 'nyxar', categoryTitle: 'Rookie of the Year', first: 'Lukario', second: 'Tommy', third: 'Mentoz' },
            { username: 'Kuumba', categoryTitle: 'Rookie of the Year', first: 'Lukario', second: 'Tommy', third: 'Roquett' },
            { username: 'admin25', categoryTitle: 'Nyxar Spirit of the Year', first: 'Bvddy', second: 'Kuumba', third: 'ZerdaFox' },
            { username: 'nyxar', categoryTitle: 'Nyxar Spirit of the Year', first: 'Kuumba', second: 'Bvddy', third: 'X-Strab' },
            { username: 'user25', categoryTitle: 'Nyxar Spirit of the Year', first: 'Bvddy', second: 'Kuumba', third: 'ZerdaFox' },
            { username: 'ZerdaFox', categoryTitle: 'Nyxar Spirit of the Year', first: 'Bvddy', second: 'Kuumba', third: 'X-Strab' },
            { username: 'nyxar', categoryTitle: 'Nyxar of the Year', first: 'Kuumba', second: 'Bvddy', third: 'Trilisk' },
            { username: 'Kuumba', categoryTitle: 'Nyxar of the Year', first: 'Bvddy', second: 'Trilisk', third: 'X-Strab' },
            { username: 'ZerdaFox', categoryTitle: 'Nyxar of the Year', first: 'Kuumba', second: 'Bvddy', third: 'Trilisk' },
        ])

        // ==================== VOTES 2026 ====================
        await insertVotes('Noty Awards 2026', [
            // admin25 — vote sur 48/49 catégories ("Nyxar of the Year" volontairement omis pour tester la progress bar)
            { username: 'admin25', categoryTitle: 'Dirt Player of the Year', first: 'Kuumba', second: 'Bvddy', third: 'Trilisk' },
            { username: 'admin25', categoryTitle: 'Tech Player of the Year', first: 'Trilisk', second: 'X-Strab', third: 'Bvddy' },
            { username: 'admin25', categoryTitle: 'Plastic Player of the Year', first: 'Kuumba', second: 'Coz', third: 'Bvddy' },
            { username: 'admin25', categoryTitle: 'RPG Player of the Year', first: 'Bvddy', second: 'Kuumba', third: 'Tommy' },
            { username: 'admin25', categoryTitle: 'FS Player of the Year', first: 'X-Strab', second: 'Trilisk', third: 'Bvddy' },
            { username: 'admin25', categoryTitle: 'Ice Player of the Year', first: 'Bvddy', second: 'Kuumba', third: 'Tommy' },
            { username: 'admin25', categoryTitle: 'Bob Player of the Year', first: 'Kuumba', second: 'Tommy', third: 'Bvddy' },
            { username: 'admin25', categoryTitle: 'Short Player of the Year', first: 'Trilisk', second: 'X-Strab', third: 'Bvddy' },
            { username: 'admin25', categoryTitle: 'LOL Player of the Year', first: 'Bvddy', second: 'Kuumba', third: 'Tommy' },
            { username: 'admin25', categoryTitle: 'Pathfinding Player of the Year', first: 'Kuumba', second: 'Trilisk', third: 'Bvddy' },
            { username: 'admin25', categoryTitle: 'Grass Player of the Year', first: 'Kuumba', second: 'Coz', third: 'Bvddy' },
            { username: 'admin25', categoryTitle: 'Mixed Player of the Year', first: 'Trilisk', second: 'Kuumba', third: 'X-Strab' },
            { username: 'admin25', categoryTitle: 'Snowcar Player of the Year', first: 'Bvddy', second: 'Tommy', third: 'Kuumba' },
            { username: 'admin25', categoryTitle: 'Desertcar Player of the Year', first: 'X-Strab', second: 'Kuumba', third: 'Bvddy' },
            { username: 'admin25', categoryTitle: 'Rally Player of the Year', first: 'Trilisk', second: 'Coz', third: 'Bvddy' },
            { username: 'admin25', categoryTitle: 'Rematch: Chocker of the Year', first: 'Tommy', second: 'Bvddy', third: 'Kuumba' },
            { username: 'admin25', categoryTitle: 'Rematch: Scorer of the Year', first: 'Kuumba', second: 'Tommy', third: 'Bvddy' },
            { username: 'admin25', categoryTitle: 'Rematch: Goal Assist of the Year', first: 'Kuumba', second: 'Bvddy', third: 'Tommy' },
            { username: 'admin25', categoryTitle: 'Rookie of the Year', first: 'Tommy', second: 'Lukario', third: 'Mentoz' },
            { username: 'admin25', categoryTitle: 'Most Improved of the Year', first: 'Lukario', second: 'Coz', third: 'Tommy' },
            { username: 'admin25', categoryTitle: 'Hunter of the Year', first: 'Kuumba', second: 'Bvddy', third: 'Trilisk' },
            { username: 'admin25', categoryTitle: 'Régu of the Year', first: 'Kuumba', second: 'X-Strab', third: 'Trilisk' },
            { username: 'admin25', categoryTitle: 'Fast Learner of the Year', first: 'Coz', second: 'Lukario', third: 'Tommy' },
            { username: 'admin25', categoryTitle: 'Clutcher of the Year', first: 'Lukario', second: 'Kuumba', third: 'Bvddy' },
            { username: 'admin25', categoryTitle: 'Tilter of the Year', first: 'Kuumba', second: 'Tommy', third: 'Trilisk' },
            { username: 'admin25', categoryTitle: 'Puant of the Year', first: 'Trilisk', second: 'Tommy', third: 'Bvddy' },
            { username: 'admin25', categoryTitle: 'Nyxar Spirit of the Year', first: 'Kuumba', second: 'Bvddy', third: 'ZerdaFox' },
            { username: 'admin25', categoryTitle: 'Mate of the Year', first: 'Bvddy', second: 'Kuumba', third: 'ZerdaFox' },
            { username: 'admin25', categoryTitle: 'Hardworker of the Year', first: 'Kuumba', second: 'Trilisk', third: 'Bvddy' },
            { username: 'admin25', categoryTitle: 'Clown of the Year', first: 'ZerdaFox', second: 'Dahsirio', third: 'Bvddy' },
            { username: 'admin25', categoryTitle: 'Zen of the Year', first: 'Bvddy', second: 'X-Strab', third: 'Coz' },
            { username: 'admin25', categoryTitle: 'Piplette of the Year', first: 'ZerdaFox', second: 'Tommy', third: 'Dahsirio' },
            { username: 'admin25', categoryTitle: 'Cutter of the Year', first: 'Tommy', second: 'ZerdaFox', third: 'Kuumba' },
            { username: 'admin25', categoryTitle: 'Most Positive Player of the Year', first: 'Bvddy', second: 'Kuumba', third: 'ZerdaFox' },
            { username: 'admin25', categoryTitle: 'Most Tired People of the Year', first: 'X-Strab', second: 'Trilisk', third: 'Bvddy' },
            { username: 'admin25', categoryTitle: 'Shy of the Year', first: 'Coz', second: 'Mentoz', third: 'Lukario' },
            { username: 'admin25', categoryTitle: 'Greeder of the Year', first: 'Trilisk', second: 'X-Strab', third: 'Tommy' },
            { username: 'admin25', categoryTitle: 'Suceur de Staff of the Year', first: 'Tommy', second: 'Lukario', third: 'Coz' },
            { username: 'admin25', categoryTitle: 'Captain of the Year', first: 'Kuumba', second: 'X-Strab', third: 'Bvddy' },
            { username: 'admin25', categoryTitle: 'Staff of the Year', first: 'Kuumba', second: 'ZerdaFox', third: 'Bvddy' },
            { username: 'admin25', categoryTitle: 'Caster of the Year', first: 'ZerdaFox', second: 'Bvddy', third: 'Tommy' },
            // Autres users — quelques votes épars
            { username: 'user25', categoryTitle: 'Dirt Player of the Year', first: 'Kuumba', second: 'Bvddy', third: 'Trilisk' },
            { username: 'user25', categoryTitle: 'Rookie of the Year', first: 'Lukario', second: 'Tommy', third: 'Coz' },
            { username: 'Kuumba', categoryTitle: 'Dirt Player of the Year', first: 'Bvddy', second: 'Coz', third: 'Trilisk' },
            { username: 'Kuumba', categoryTitle: 'Clown of the Year', first: 'Dahsirio', second: 'ZerdaFox', third: 'Tommy' },
            { username: 'ZerdaFox', categoryTitle: 'Nyxar of the Year', first: 'Kuumba', second: 'Bvddy', third: 'Trilisk' },
        ])

        // ==================== VOTES CUSTOM NOMINEES 2026 ====================
        const [rows2026] = await pool.query('SELECT id FROM noty_campaign WHERE title = ? LIMIT 1', ['Noty Awards 2026'])
        if (rows2026.length > 0) {
            const cId = rows2026[0].id
            const [customCats] = await pool.query(
                'SELECT id, title, nominee_type FROM voting_categories WHERE noty_campaign_id = ? AND nominee_type != ?',
                [cId, 'player']
            )

            const getCustomNomineeId = async (categoryId, title) => {
                const [rows] = await pool.query(
                    'SELECT id FROM custom_nominees WHERE category_id = ? AND title = ? AND is_deleted = 0 LIMIT 1',
                    [categoryId, title]
                )
                return rows.length > 0 ? rows[0].id : null
            }

            const insertCustomVote = async (username, categoryTitle, first, second, third) => {
                const userId = getUserId(username)
                const cat = customCats.find(c => c.title === categoryTitle)
                if (!userId || !cat) return false
                const firstId = first ? await getCustomNomineeId(cat.id, first) : null
                const secondId = second ? await getCustomNomineeId(cat.id, second) : null
                const thirdId = third ? await getCustomNomineeId(cat.id, third) : null
                await pool.query(
                    'INSERT INTO votes (user_id, category_id, noty_campaign_id, first_choice, second_choice, third_choice) VALUES (?, ?, ?, ?, ?, ?)',
                    [userId, cat.id, cId, firstId, secondId, thirdId]
                )
                return true
            }

            let customCount = 0
            if (await insertCustomVote('admin25', 'Clip of the Year', 'Yeager clutch insane', 'Kuumba triple wallbang', 'Yeager rage quit fail')) customCount++
            if (await insertCustomVote('user25', 'Clip of the Year', 'Kuumba triple wallbang', 'Yeager rage quit fail', 'Yeager clutch insane')) customCount++
            if (await insertCustomVote('Kuumba', 'Clip of the Year', 'Yeager clutch insane', 'Kuumba triple wallbang', 'Yeager rage quit fail')) customCount++
            if (await insertCustomVote('admin25', 'Rematch: Goal of the Year', 'Tommy air dribble goal', 'Kuumba ceiling shot', 'Lukario double tap')) customCount++
            if (await insertCustomVote('user25', 'Rematch: Goal of the Year', 'Tommy air dribble goal', 'Lukario double tap', 'Kuumba ceiling shot')) customCount++
            if (await insertCustomVote('admin25', 'Soundboard of the Year', 'ZerdaFox rage compilation', 'Dahsirio fou rire', 'Kuumba soundboard spam')) customCount++
            if (await insertCustomVote('user25', 'Soundboard of the Year', 'Dahsirio fou rire', 'ZerdaFox rage compilation', 'Tommy micro-coupé moment')) customCount++
            if (await insertCustomVote('Kuumba', 'Soundboard of the Year', 'ZerdaFox rage compilation', 'Tommy micro-coupé moment', 'Bvddy zen ASMR')) customCount++
            if (await insertCustomVote('admin25', 'Mapper of the Year', 'Trilisk - Canyon Odyssey', 'X-Strab - Winter Madness', 'Kuumba - Desert Storm')) customCount++
            if (await insertCustomVote('Kuumba', 'Mapper of the Year', 'Trilisk - Canyon Odyssey', 'X-Strab - Winter Madness', 'Kuumba - Desert Storm')) customCount++
            if (await insertCustomVote('admin25', 'Skin Maker of the Year', 'Coz - Nyxar Racing Livery', 'Trilisk - Carbon Fiber', 'ZerdaFox - Fox Edition')) customCount++
            if (await insertCustomVote('user25', 'Skin Maker of the Year', 'ZerdaFox - Fox Edition', 'Coz - Nyxar Racing Livery', 'Bvddy - Minimalist White')) customCount++
            if (await insertCustomVote('admin25', 'Nyxar Moment of the Year', 'La remontada en TMGL', 'Le clutch de Kuumba en finale', 'Premier top 10 de Tommy')) customCount++
            if (await insertCustomVote('Kuumba', 'Nyxar Moment of the Year', 'La remontada en TMGL', 'Premier top 10 de Tommy', 'Le clutch de Kuumba en finale')) customCount++
            if (await insertCustomVote('admin25', 'Nyxar\'s Cup of the Year', 'Nyxar Cup #20 - Anniversary Special', 'Nyxar Cup #12 - Ice Edition', 'Nyxar Cup #18 - Tech Masters')) customCount++
            if (await insertCustomVote('user25', 'Nyxar\'s Cup of the Year', 'Nyxar Cup #12 - Ice Edition', 'Nyxar Cup #22 - Mixed Chaos', 'Nyxar Cup #20 - Anniversary Special')) customCount++
            console.log(`✓ ${customCount} votes custom nominees créés pour 'Noty Awards 2026'`)
        }
    } catch (error) {
        console.error('Erreur insertion votes de test:', error)
    }
}

// ==================== SEED TEST ====================

export async function seedTestData() {
    console.log('\n🧪 Insertion des données de test...')

    await seedTestCampaigns()
    await seedTestVotingCategories()
    await seedTestCustomNominees()
    await seedTestVotes()

    console.log('\n✅ Données de test insérées avec succès\n')
}
