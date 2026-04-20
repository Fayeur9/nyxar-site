import pool from './db.js'
import bcrypt from 'bcryptjs'

// ==================== USERS ====================

export async function seedUsers() {
    try {
        const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'admin25'
        const nyxarPassword = process.env.SEED_NYXAR_PASSWORD || 'nyxar25'
        const userPassword = process.env.SEED_USER_PASSWORD || 'user25'

        const users = [
            // Comptes spéciaux (mots de passe via variables d'environnement SEED_*_PASSWORD)
            { username: 'admin25', email: 'admin@admin.com', password: adminPassword, roleName: 'admin', image_url: 'uploads/users/admin.png' },
            { username: 'nyxar', email: 'nyxar@nyxar.com', password: nyxarPassword, roleName: 'nyxar', image_url: 'uploads/users/nyxar.png' },
            { username: 'user25', email: 'user@user.com', password: userPassword, roleName: 'user', image_url: 'uploads/users/user.png' },
            // Un compte par nyxarien
            { username: 'Kuumba', email: 'kuumba@nyxar.com', password: 'kuumba123', roleName: 'user', image_url: 'uploads/users/kuumba.png' },
            { username: 'Bvddy', email: 'bvddy@nyxar.com', password: 'bvddy123', roleName: 'user', image_url: null },
            { username: 'Trilisk', email: 'trilisk@nyxar.com', password: 'trilisk123', roleName: 'user', image_url: null },
            { username: 'X-Strab', email: 'xstrab@nyxar.com', password: 'xstrab123', roleName: 'user', image_url: null },
            { username: 'Tommy', email: 'tommy@nyxar.com', password: 'tommy123', roleName: 'user', image_url: null },
            { username: 'Dahsirio', email: 'dahsirio@nyxar.com', password: 'dahsirio123', roleName: 'user', image_url: null },
            { username: 'ZerdaFox', email: 'zerdafox@nyxar.com', password: 'zerdafox123', roleName: 'user', image_url: 'uploads/users/zerdafox.png' },
            { username: 'Lukario', email: 'lukario@nyxar.com', password: 'lukario123', roleName: 'user', image_url: null },
            { username: 'Roquett', email: 'roquett@nyxar.com', password: 'roquett123', roleName: 'user', image_url: null },
            { username: 'Quentin43', email: 'quentin43@nyxar.com', password: 'quentin43123', roleName: 'user', image_url: null },
            { username: 'Xert0x', email: 'xert0x@nyxar.com', password: 'xert0x123', roleName: 'user', image_url: null },
            { username: 'Coz', email: 'coz@nyxar.com', password: 'coz123', roleName: 'user', image_url: null },
            { username: 'Mentoz', email: 'mentoz@nyxar.com', password: 'mentoz123', roleName: 'user', image_url: null },
            { username: 'Ujimaa', email: 'ujimaa@nyxar.com', password: 'ujimaa123', roleName: 'user', image_url: null },
            { username: 'At0me', email: 'at0me@nyxar.com', password: 'at0me123', roleName: 'user', image_url: null },
            { username: 'EnjoysoloQ', email: 'enjoysoloq@nyxar.com', password: 'enjoysoloq123', roleName: 'user', image_url: null },
            { username: 'Vibes', email: 'vibes@nyxar.com', password: 'vibes123', roleName: 'user', image_url: null },
            { username: 'Aapril', email: 'aapril@nyxar.com', password: 'aapril123', roleName: 'user', image_url: null },
            { username: 'Lyltreck', email: 'lyltreck@nyxar.com', password: 'lyltreck123', roleName: 'user', image_url: null },
            { username: 'Undier', email: 'undier@nyxar.com', password: 'undier123', roleName: 'user', image_url: null },
            { username: 'Kimy', email: 'kimy@nyxar.com', password: 'kimy123', roleName: 'user', image_url: null },
            { username: 'Yeager', email: 'yeager@nyxar.com', password: 'yeager123', roleName: 'user', image_url: null },
            { username: 'Kyhudji', email: 'kyhudji@nyxar.com', password: 'kyhudji123', roleName: 'user', image_url: null },
            { username: 'Yannou', email: 'yannou@nyxar.com', password: 'yannou123', roleName: 'user', image_url: null },
            { username: 'Vincent', email: 'vincent@nyxar.com', password: 'vincent123', roleName: 'user', image_url: null },
            { username: 'Chtiwid', email: 'chtiwid@nyxar.com', password: 'chtiwid123', roleName: 'user', image_url: null },
            { username: 'Rag', email: 'rag@nyxar.com', password: 'rag123', roleName: 'user', image_url: null },
            { username: 'Drackus', email: 'drackus@nyxar.com', password: 'drackus123', roleName: 'user', image_url: null },
            { username: 'Dolit0x', email: 'dolit0x@nyxar.com', password: 'dolit0x123', roleName: 'user', image_url: null },
            { username: 'Sucretm', email: 'sucretm@nyxar.com', password: 'sucretm123', roleName: 'user', image_url: null },
            { username: 'Rominouze', email: 'rominouze@nyxar.com', password: 'rominouze123', roleName: 'user', image_url: null },
            { username: 'Tani', email: 'tani@nyxar.com', password: 'tani123', roleName: 'user', image_url: null },
            { username: 'Hasaki', email: 'hasaki@nyxar.com', password: 'hasaki123', roleName: 'user', image_url: null },
            { username: 'Baban', email: 'baban@nyxar.com', password: 'baban123', roleName: 'user', image_url: null },
            { username: 'Hybarri', email: 'hybarri@nyxar.com', password: 'hybarri123', roleName: 'user', image_url: null },
            { username: 'Gombaies', email: 'gombaies@nyxar.com', password: 'gombaies123', roleName: 'user', image_url: null },
            { username: 'Foxx', email: 'foxx@nyxar.com', password: 'foxx123', roleName: 'user', image_url: null },
            { username: 'Tito', email: 'tito@nyxar.com', password: 'tito123', roleName: 'user', image_url: null },
            { username: 'Senjojoveller', email: 'senjojoveller@nyxar.com', password: 'senjojoveller123', roleName: 'user', image_url: null },
            // Comptes votants pour la reconstruction des scores officiels NOTY 2025
            ...Array.from({ length: 30 }, (_, i) => ({
                username: `voter_${i + 1}`, email: `voter${i + 1}@seed.nyxar.com`, password: 'voter123', roleName: 'user', image_url: null
            })),
        ]

        for (const user of users) {
            const hashedPassword = await bcrypt.hash(user.password, 10)
            await pool.query(
                'INSERT INTO users (username, email, password_hash, image_url) VALUES (?, ?, ?, ?)',
                [user.username, user.email, hashedPassword, user.image_url]
            )
            console.log(`✓ Utilisateur '${user.username}' créé`)
        }
    } catch (error) {
        console.error('Erreur insertion utilisateurs:', error)
    }
}

// ==================== ROLES ====================

export async function seedRoles() {
    try {
        const roles = [
            { name: 'admin', description: 'Administrateur', color: '#f97316', permissions: { manageGames: true, adminFull: true, viewSite: true } },
            { name: 'moderator', description: 'Modérateur', color: '#0ea5e9', permissions: { manageGames: false, adminFull: false, viewSite: true } },
            { name: 'user', description: 'Utilisateur standard', color: '#9ca3af', permissions: { manageGames: false, adminFull: false, viewSite: false } },
            { name: 'nyxar', description: 'Utilisateur Nyxar', color: '#a855f7', permissions: { manageGames: false, adminFull: false, viewSite: false } },
            { name: 'captain', description: 'Capitaine d\'une équipe', color: '#10b981', permissions: { manageGames: false, adminFull: false, viewSite: false } },
            { name: 'skin_maker', description: 'Créateur de skins', color: '#f43f5e', permissions: { manageGames: false, adminFull: false, viewSite: false } }
        ]

        for (const role of roles) {
            await pool.query(
                'INSERT INTO role (name, description, color, permissions) VALUES (?, ?, ?, ?)',
                [role.name, role.description, role.color, JSON.stringify(role.permissions)]
            )
            console.log(`✓ Rôle '${role.name}' créé`)
        }
    } catch (error) {
        console.error('Erreur insertion rôles:', error)
    }
}

// ==================== ROLE_USER ====================

export async function seedRoleUser() {
    try {
        // Mapping username → rôle à assigner (défini dans seedUsers)
        const roleAssignments = [
            { username: 'admin25', roleName: 'admin' },
            { username: 'nyxar', roleName: 'nyxar' },
        ]
        // Tous les autres users reçoivent le rôle 'user' par défaut
        const [allUsers] = await pool.query('SELECT id, username FROM users')
        const [allRoles] = await pool.query('SELECT id, name FROM role')
        const roleMap = Object.fromEntries(allRoles.map(r => [r.name, r.id]))

        for (const user of allUsers) {
            const assignment = roleAssignments.find(a => a.username === user.username)
            const roleName = assignment ? assignment.roleName : 'user'
            const roleId = roleMap[roleName]
            if (roleId) {
                await pool.query(
                    'INSERT IGNORE INTO role_user (user_id, role_id) VALUES (?, ?)',
                    [user.id, roleId]
                )
            }
        }
        console.log('✓ Associations user-role créées')
    } catch (error) {
        console.error('Erreur insertion role_user:', error)
    }
}

// ==================== GAMES ====================

export async function seedGames() {
    try {
        const games = [
            { name: 'Trackmania', color: '#00ff6e', image_url: '/uploads/games/trackmania.png', image_hover: '/uploads/games/trackmania_hover.png', link: 'https://www.trackmania.com/?lang=fr' },
            { name: 'Rematch', color: '#05daff', image_url: '/uploads/games/rematch.png', image_hover: '/uploads/games/rematch_hover.png', link: 'https://www.playrematch.com/' },
        ]

        for (const game of games) {
            await pool.query(
                'INSERT INTO games (name, color, image_url, image_hover, link) VALUES (?, ?, ?, ?, ?)',
                [game.name, game.color, game.image_url, game.image_hover, game.link]
            )
            console.log(`✓ Jeu '${game.name}' créé`)
        }
    } catch (error) {
        console.error('Erreur insertion jeux:', error)
    }
}

// ==================== NOTY CAMPAIGN (2025 officielle) ====================

export async function seedNotyCampaign() {
    try {
        const [result] = await pool.query(
            'INSERT INTO noty_campaign (title, start_date, end_date, results_end_date) VALUES (?, ?, ?, ?)',
            ['Noty Awards 2025', '2025-01-15', '2025-06-30', '2025-07-31']
        )
        const imageUrl = `/uploads/noty/campaign/${result.insertId}/noty_2025.png`
        await pool.query('UPDATE noty_campaign SET image_url = ? WHERE id = ?', [imageUrl, result.insertId])
        console.log(`✓ Campagne 'Noty Awards 2025' créée (id=${result.insertId})`)
    } catch (error) {
        console.error('Erreur insertion noty_campaign:', error)
    }
}

// ==================== VOTING CATEGORIES (2025) ====================

export async function seedVotingCategories() {
    try {
        const [campaigns] = await pool.query('SELECT id FROM noty_campaign WHERE title = ? LIMIT 1', ['Noty Awards 2025'])
        const campaignId = campaigns.length > 0 ? campaigns[0].id : null
        if (!campaignId) { console.error('Campagne 2025 introuvable'); return }

        const img = `/uploads/noty/categories/${campaignId}/thumbnails/category1.png`
        const img2 = `/uploads/noty/categories/${campaignId}/thumbnails/category2.png`

        const categories = [
            // --- Trackmania surfaces ---
            { title: 'Dirt Player of the Year', description: 'Meilleur joueur Dirt 2025', image_url: img, game_id: 1, display_order: 1 },
            { title: 'Tech Player of the Year', description: 'Meilleur joueur Tech 2025', image_url: img, game_id: 1, display_order: 2 },
            { title: 'Plastic Player of the Year', description: 'Meilleur joueur Plastic 2025', image_url: img, game_id: 1, display_order: 3 },
            { title: 'RPG Player of the Year', description: 'Meilleur joueur RPG 2025', image_url: img, game_id: 1, display_order: 4 },
            { title: 'FS Player of the Year', description: 'Meilleur joueur Fullspeed 2025', image_url: img, game_id: 1, display_order: 5 },
            { title: 'Ice Player of the Year', description: 'Meilleur joueur Ice 2025', image_url: img, game_id: 1, display_order: 6 },
            { title: 'Bob Player of the Year', description: 'Meilleur joueur Bobsleigh 2025', image_url: img, game_id: 1, display_order: 7 },
            { title: 'Short Player of the Year', description: 'Meilleur joueur maps courtes 2025', image_url: img, game_id: 1, display_order: 8 },
            { title: 'LOL Player of the Year', description: 'Meilleur joueur LOL 2025', image_url: img, game_id: 1, display_order: 9 },
            { title: 'Pathfinding Player of the Year', description: 'Meilleur joueur Pathfinding 2025', image_url: img, game_id: 1, display_order: 10 },
            { title: 'Grass Player of the Year', description: 'Meilleur joueur Grass 2025', image_url: img, game_id: 1, display_order: 11 },
            { title: 'Mixed Player of the Year', description: 'Meilleur joueur Mixed 2025', image_url: img, game_id: 1, display_order: 12 },
            { title: 'Snowcar Player of the Year', description: 'Meilleur joueur Snowcar 2025', image_url: img, game_id: 1, display_order: 13 },
            { title: 'Desertcar Player of the Year', description: 'Meilleur joueur Desertcar 2025', image_url: img, game_id: 1, display_order: 14 },
            { title: 'Rally Player of the Year', description: 'Meilleur joueur Rally 2025', image_url: img, game_id: 1, display_order: 15 },
            // --- Rematch ---
            { title: 'Rematch: Chocker of the Year', description: 'Le joueur qui choke le plus en Rematch 2025', image_url: img2, game_id: 2, display_order: 16 },
            { title: 'Rematch: Scorer of the Year', description: 'Meilleur buteur Rematch 2025', image_url: img2, game_id: 2, display_order: 17 },
            { title: 'Rematch: Goal of the Year', description: 'Plus beau but Rematch 2025', image_url: img2, game_id: 2, display_order: 18 },
            { title: 'Rematch: Goal Assist of the Year', description: 'Meilleur passeur Rematch 2025', image_url: img2, game_id: 2, display_order: 19 },
            // --- Compétences générales ---
            { title: 'Rookie of the Year', description: 'Meilleur nouveau joueur 2025', image_url: img, game_id: null, display_order: 20 },
            { title: 'Most Improved of the Year', description: 'Joueur ayant le plus progressé 2025', image_url: img, game_id: null, display_order: 21 },
            { title: 'Hunter of the Year', description: 'Meilleur joueur Hunter 2025', image_url: img, game_id: 1, display_order: 22 },
            { title: 'Régu of the Year', description: 'Joueur le plus régulier 2025', image_url: img, game_id: null, display_order: 23 },
            { title: 'Fast Learner of the Year', description: 'Joueur qui apprend le plus vite 2025', image_url: img, game_id: null, display_order: 24 },
            { title: 'Clutcher of the Year', description: 'Joueur qui clutch le plus 2025', image_url: img, game_id: null, display_order: 25 },
            { title: 'Clip of the Year', description: 'Meilleur clip 2025', image_url: img, game_id: null, display_order: 26 },
            // --- Personnalité & communauté ---
            { title: 'Soundboard of the Year', description: 'Meilleur soundboard 2025', image_url: img, game_id: null, display_order: 27 },
            { title: 'Tilter of the Year', description: 'Le joueur qui tilt le plus 2025', image_url: img, game_id: null, display_order: 28 },
            { title: 'Puant of the Year', description: 'Le joueur le plus puant 2025', image_url: img, game_id: null, display_order: 29 },
            { title: 'Nyxar Spirit of the Year', description: 'Esprit Nyxar 2025', image_url: img, game_id: null, display_order: 30 },
            { title: 'Mate of the Year', description: 'Meilleur coéquipier 2025', image_url: img, game_id: null, display_order: 31 },
            { title: 'Hardworker of the Year', description: 'Joueur le plus travailleur 2025', image_url: img, game_id: null, display_order: 32 },
            { title: 'Captain of the Year', description: 'Meilleur capitaine 2025', image_url: img, game_id: null, display_order: 33 },
            { title: 'Staff of the Year', description: 'Meilleur membre du staff 2025', image_url: img, game_id: null, display_order: 34 },
            { title: 'Mapper of the Year', description: 'Meilleur créateur de maps 2025', image_url: img, game_id: null, display_order: 35 },
            { title: 'Caster of the Year', description: 'Meilleur caster 2025', image_url: img, game_id: null, display_order: 36 },
            { title: 'Nyxar Moment of the Year', description: 'Meilleur moment Nyxar 2025', image_url: img, game_id: null, display_order: 37 },
            { title: 'Nyxar\'s Cup of the Year', description: 'Meilleure Nyxar Cup 2025', image_url: img, game_id: null, display_order: 38 },
            { title: 'Clown of the Year', description: 'Le plus drôle 2025', image_url: img, game_id: null, display_order: 39 },
            { title: 'Zen of the Year', description: 'La personne la plus zen 2025', image_url: img, game_id: null, display_order: 40 },
            { title: 'Piplette of the Year', description: 'La personne qui parle le plus 2025', image_url: img, game_id: null, display_order: 41 },
            { title: 'Cutter of the Year', description: 'Le joueur qui coupe le plus la parole 2025', image_url: img, game_id: null, display_order: 42 },
            { title: 'Most Positive Player of the Year', description: 'Joueur le plus positif 2025', image_url: img, game_id: null, display_order: 43 },
            { title: 'Most Tired People of the Year', description: 'Personne la plus fatiguée 2025', image_url: img, game_id: null, display_order: 44 },
            { title: 'Shy of the Year', description: 'La personne la plus timide 2025', image_url: img, game_id: null, display_order: 45 },
            { title: 'Greeder of the Year', description: 'Le joueur le plus avare 2025', image_url: img, game_id: null, display_order: 46 },
            { title: 'Suceur de Staff of the Year', description: 'Personne qui lèche le plus le staff 2025', image_url: img, game_id: null, display_order: 47 },
            // --- Staff & contributions ---
            { title: 'Skin Maker of the Year', description: 'Meilleur créateur de skins 2025', image_url: img, game_id: null, display_order: 48 },
            // --- Grand prix ---
            { title: 'Nyxar of the Year', description: 'Le Nyxar de l\'année 2025', image_url: img, game_id: null, visible_by_nyxar: 0, display_order: 49 },
        ]

        for (const cat of categories) {
            await pool.query(
                'INSERT INTO voting_categories (title, description, image_url, game_id, noty_campaign_id, visible_by_nyxar, votes_count, display_order, nominee_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [cat.title, cat.description, cat.image_url, cat.game_id ?? null, campaignId, cat.visible_by_nyxar ?? 1, 0, cat.display_order, 'player']
            )
        }
        console.log(`✓ ${categories.length} catégories créées pour Noty Awards 2025`)
    } catch (error) {
        console.error('Erreur insertion catégories 2025:', error)
    }
}

// ==================== VOTES 2025 (résultats officiels CSV) ====================

export async function seedVotes() {
    try {
        const [campRows] = await pool.query('SELECT id FROM noty_campaign WHERE title = ? LIMIT 1', ['Noty Awards 2025'])
        if (campRows.length === 0) { console.error('Campagne 2025 introuvable'); return }

        const campId = campRows[0].id
        const [cats] = await pool.query('SELECT id, title FROM voting_categories WHERE noty_campaign_id = ?', [campId])
        const [nyxariens] = await pool.query('SELECT id, pseudo FROM nyxariens')
        const [allVoters] = await pool.query('SELECT id FROM users ORDER BY id')

        const getNyxarienId = (pseudo) => {
            const n = nyxariens.find(nx => nx.pseudo === pseudo)
            return n ? n.id : null
        }

        // Mapping colonnes CSV → titres catégories (ordre exact du CSV source)
        const csvCatMap = [
            'Rookie of the Year', 'Most Improved of the Year', 'Dirt Player of the Year', 'Tech Player of the Year',
            'Plastic Player of the Year', 'RPG Player of the Year', 'FS Player of the Year', 'Ice Player of the Year',
            'Bob Player of the Year', 'Short Player of the Year', 'LOL Player of the Year', 'Pathfinding Player of the Year',
            'Grass Player of the Year', 'Mixed Player of the Year', 'Snowcar Player of the Year', 'Desertcar Player of the Year',
            'Rally Player of the Year', 'Rematch: Chocker of the Year', 'Rematch: Scorer of the Year', 'Rematch: Goal of the Year',
            'Rematch: Goal Assist of the Year', 'Hunter of the Year', 'Régu of the Year', 'Fast Learner of the Year',
            'Clutcher of the Year', 'Clip of the Year', 'Soundboard of the Year', 'Tilter of the Year',
            'Puant of the Year', 'Nyxar Spirit of the Year', 'Mate of the Year', 'Hardworker of the Year',
            'Captain of the Year', 'Staff of the Year', 'Mapper of the Year', 'Caster of the Year',
            'Nyxar Moment of the Year', "Nyxar's Cup of the Year", 'Clown of the Year', 'Zen of the Year',
            'Piplette of the Year', 'Cutter of the Year', 'Most Positive Player of the Year', 'Most Tired People of the Year',
            'Shy of the Year', 'Greeder of the Year', 'Suceur de Staff of the Year', 'Skin Maker of the Year',
            'Nyxar of the Year'
        ]

        // Mapping nom CSV → pseudo nyxarien
        const pseudoMap = {
            'LUKARIO': 'Lukario', 'ROQUETT': 'Roquett', 'TOMMY': 'Tommy', 'QUENTIN43': 'Quentin43',
            'XERT0X': 'Xert0x', 'KUUMBA': 'Kuumba', 'BVDDY': 'Bvddy', 'FAYEUR': 'Fayeur',
            'COZ': 'Coz', 'TRILISK': 'Trilisk', 'MENTOZ': 'Mentoz', 'UJIMAA': 'Ujimaa',
            'SENJO': 'Senjojoveller', 'AT0ME': 'At0me', 'ENJOYSOLOQ': 'EnjoysoloQ',
            'VIBES': 'Vibes', 'AAPRIL': 'Aapril', 'LYLTRECK': 'Lyltreck', 'UNDIER': 'Undier',
            'FOREAAL': 'Kimy', 'X-STRAB': 'X-Strab', 'YEAGER': 'Yeager',
            'KYHUDJI': 'Kyhudji', 'YANNOU': 'Yannou', 'VINCENT': 'Vincent', 'CHTIWID': 'Chtiwid',
            'RAG': 'Rag', 'DRACKUS': 'Drackus', 'DOLIT0X': 'Dolit0x',
            'ZERDAFOX': 'ZerdaFox', 'SUCRETM': 'Sucretm', 'ROMINOUZE': 'Rominouze',
            'TANI': 'Tani', 'DAHSIRIO': 'Dahsirio', 'HASAKI': 'Hasaki',
            'BABAN': 'Baban', 'HYBARRI': 'Hybarri', 'GOMBAIES': 'Gombaies',
            'FOXX': 'Foxx', 'TITO': 'Tito'
        }

        // Données CSV brutes (résultats officiels NOTY 2025)
        const csvData = [
'LUKARIO,1,,3,2,8,8,4,1,2,,2,2,1,10,,,,3,2,11,1,1,7,11,6,,,2,,2,2,2,3,,1,,,1,,2,2,6,5,,2,1,1,,5',
'ROQUETT,7,,14,3,10,4,18,,2,3,2,3,9,11,8,7,5,,,,,5,2,12,2,,,,1,,1,2,,,2,,,,3,2,,17,,,3,17,,,6',
'TOMMY,,,3,25,3,6,3,2,1,2,1,2,2,5,1,1,1,,,,,5,3,7,5,,,3,16,2,4,2,1,,,,,2,4,1,6,1,2,16,2,2,2,,2',
'XERT0X,,,,4,,,,,,1,,,,,,,,,,,,,1,,,,,,,,,,,,,,,,,,,,,,,,,,',
'KUUMBA,,,,,,,,,,,,,,,,,1,1,1,1,1,,,,,,,1,,9,1,,1,15,16,25,,,,,2,,,1,1,,2,,11',
'BVDDY,,,8,,3,,,,,7,3,1,2,6,16,14,14,,,,,,7,3,5,,,16,2,7,3,1,11,12,,14,,12,9,,1,1,4,13,,,,,3',
'FAYEUR,,,,,3,,1,,,7,18,3,,,14,8,6,,,,,,,2,1,,,1,,,2,1,,,,,,,1,1,1,,1,,,1,1,,',
'COZ,,1,2,,1,,,,,1,,,6,3,1,,1,,,,,,1,1,,,,,,2,1,,,,1,,,,,9,,1,1,,6,,,23,',
'TRILISK,,7,3,3,4,23,,,,10,2,11,2,1,,1,2,,,,,8,2,6,5,,,3,6,3,8,5,,,,,,,1,4,,4,3,6,2,4,1,,2',
'MENTOZ,1,1,1,1,,6,,,,2,2,19,,3,,,,,,,,,5,8,2,,,2,,,1,1,,,5,,,3,1,1,,11,,,1,,,,2',
'UJIMAA,,9,5,1,1,1,1,20,2,,1,1,,,4,13,8,,,,,1,12,2,4,,,,,4,5,6,5,,,,,,2,5,,,9,1,,,,,3',
'SENJO,,3,,,2,,7,13,21,5,1,,1,1,3,3,5,,,,,1,1,,3,,,,4,8,3,2,8,12,,,,,,2,,,7,,,,,,',
'AT0ME,,,,,,,,,,,,,5,,,,,,,,,,,,,,,,,,1,,,,15,,,,,2,,2,,1,,,,,',
'ENJOYSOLOQ,,,,,,,,,,,4,,1,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,1,,,,',
'VIBES,1,4,8,5,,,,,,,,,1,6,,,,,,,,1,2,,,,,,,2,3,,,,,,,,,5,,,2,,1,,,,1',
'AAPRIL,1,2,2,3,,,,2,2,,,,,,,,,,,,,,4,,,,,1,10,1,1,2,,,6,,,,,1,2,,1,,1,,,,',
'LYLTRECK,,,,3,,,,,,,,,,,,,,,,,,,,,,,,,,,,2,,,,,,,,,,,,,,,,,',
'UNDIER,,,,1,,,,,,,,,1,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,1,,,,',
'FOREAAL,7,3,2,1,5,,4,,,,,,1,,,,,,,,,,1,,,,,,,,,,,,,,,,,,,,1,,3,,,,',
'X-STRAB,1,7,,,,,,,,1,1,,,2,,5,,,,,,1,1,,,,,10,5,5,3,2,8,8,,,,6,15,1,12,1,1,1,,,,,1',
'YEAGER,5,,1,,,,,,,,,,1,,,,,,,,,13,,,,,,,,1,,9,,,3,,,2,,1,,,,1,,,1,,',
'KYHUDJI,,,,,1,1,3,,,,2,,,,,,,,,,,,,,,,,1,,1,,,,,,,,,,1,2,,,,,1,,,',
'YANNOU,22,7,1,1,4,,,1,1,1,1,,5,2,,,,,,,,1,,,,,,,,1,1,1,,,,,,,,,,,,,1,7,,,1',
'VINCENT,,,,,,,,,5,,,,,,,,,,,,,1,,,,,,,,,,1,,,,,,,,,,,,1,1,,,,1',
'CHTIWID,,,,,,,,,,,,,,,,,,,,,,,,,1,,,,,,1,,,,,,,,,1,,,,,8,,,,',
'RAG,1,,,,,,,,,,5,,,,,,,,,,,,,,,,,8,,,,,,,,,,2,3,,12,1,,,,1,7,,',
'DRACKUS,,,,,,1,,,,,,,,,,,,,,,,,,,,,,,,,1,,,,,,,,,,1,,,,,,,,',
'DOLIT0X,1,,,,1,,,,,5,,1,7,,,,,,,,,,,,1,,,,,,,,,,,,,,,1,,,1,,,,,,',
'SUCRETM,2,3,,1,,,,,,,,,,,,,,,,,,7,,,,,,,,,2,5,,,,,,,,1,,,,,1,,,,',
'ROMINOUZE,,,,,,,,,,,,,,,,,1,,,,,,,,,,,,,,,,4,,,,,,,,,,1,,,,,,',
'TANI,1,1,,,1,,,,1,,,,,,,,,,,,,,,,,,,,,,1,,2,,,,,,,2,,,3,,4,,,,',
'HASAKI,,,,,,,,,,,,,,,,,,,2,,1,1,,,,,,,1,,,,,,,,,,,1,1,,,,,,,,',
'BABAN,,1,,,,,,,,,,,,,,,,,,,2,,,,1,,,,,,1,,,,,,,,2,,,,1,,,,,,',
'HYBARRI,,,,,,,,,,,,,,,,,,1,2,,2,,,,,,,,,,,,,,,,,,,,,,,,,1,,,',
'GOMBAIES,,,,,,,,,,,,,,,,,,,,,1,,,,,,,,,,,,,,,,,,,,,,,,,,,,',
'FOXX,,,,,,,,,,,,,,,,,,,,,1,,,,,,,,,,1,1,,,,,,,,2,,,1,,1,,,,',
'TITO,,,,,,,,,,,,,,,,,,4,4,,,,,,,,,,,,,,,,,,,,,,,,,,1,,,,',
'DAHSIRIO,,,,,,,,,,,,,,,,,,2,,2,3,,,,,,,,,,,,,,,,,,,,,,,1,,,1,,1',
        ].join('\n')

        // Parser le CSV → { categoryTitle: { pseudo: score } }
        const scoresByCat = {}
        for (const line of csvData.trim().split('\n')) {
            const parts = line.split(',')
            const rawName = parts[0].trim()
            const pseudo = pseudoMap[rawName]
            if (!pseudo) continue

            const scores = parts.slice(1).map(v => { const n = parseInt(v); return isNaN(n) ? 0 : n })
            for (let i = 0; i < csvCatMap.length && i < scores.length; i++) {
                if (scores[i] > 0) {
                    const catTitle = csvCatMap[i]
                    if (!scoresByCat[catTitle]) scoresByCat[catTitle] = {}
                    scoresByCat[catTitle][pseudo] = (scoresByCat[catTitle][pseudo] || 0) + scores[i]
                }
            }
        }

        // Distribuer les scores via first_choice (3pts) / second_choice (2pts) / third_choice (1pt)
        let totalVotes = 0
        for (const [catTitle, nominees] of Object.entries(scoresByCat)) {
            const cat = cats.find(c => c.title === catTitle)
            if (!cat) continue

            let voterIdx = 0
            for (const [pseudo, score] of Object.entries(nominees)) {
                const nxId = getNyxarienId(pseudo)
                if (!nxId) continue

                const nFirst = Math.floor(score / 3)
                const remainder = score % 3

                for (let i = 0; i < nFirst && voterIdx < allVoters.length; i++) {
                    await pool.query(
                        'INSERT INTO votes (user_id, category_id, noty_campaign_id, first_choice, second_choice, third_choice) VALUES (?, ?, ?, ?, NULL, NULL)',
                        [allVoters[voterIdx].id, cat.id, campId, nxId]
                    )
                    voterIdx++
                    totalVotes++
                }
                if (remainder === 2 && voterIdx < allVoters.length) {
                    await pool.query(
                        'INSERT INTO votes (user_id, category_id, noty_campaign_id, first_choice, second_choice, third_choice) VALUES (?, ?, ?, NULL, ?, NULL)',
                        [allVoters[voterIdx].id, cat.id, campId, nxId]
                    )
                    voterIdx++
                    totalVotes++
                } else if (remainder === 1 && voterIdx < allVoters.length) {
                    await pool.query(
                        'INSERT INTO votes (user_id, category_id, noty_campaign_id, first_choice, second_choice, third_choice) VALUES (?, ?, ?, NULL, NULL, ?)',
                        [allVoters[voterIdx].id, cat.id, campId, nxId]
                    )
                    voterIdx++
                    totalVotes++
                }
            }
        }
        console.log(`✓ ${totalVotes} votes créés pour 'Noty Awards 2025' (résultats officiels)`)
    } catch (error) {
        console.error('Erreur insertion votes 2025:', error)
    }
}

// ==================== LINE-UPS ====================

export async function seedLineUps() {
    try {
        const lineUps = [
            { name: 'Nyxar Main', image_url: '/uploads/line_ups/nyxar_main.png', color: 'blue', game_id: 1 },
            { name: 'Nyxar Competitive', image_url: '/uploads/line_ups/nyxar_competitive.png', color: 'red', game_id: 1 },
            { name: 'Nyxar Academy', image_url: '/uploads/line_ups/nyxar_academy.png', color: 'green', game_id: 1 },
            { name: 'Snow Kids', image_url: '/uploads/line_ups/snow_kids.png', color: 'cyan', game_id: 2 },
        ]

        for (const lu of lineUps) {
            await pool.query(
                'INSERT INTO line_ups (name, image_url, color, game_id) VALUES (?, ?, ?, ?)',
                [lu.name, lu.image_url, lu.color, lu.game_id]
            )
            console.log(`✓ Line-up '${lu.name}' créée`)
        }
    } catch (error) {
        console.error('Erreur insertion line-ups:', error)
    }
}

// ==================== PLAYERS (NYXARIENS) ====================

export async function seedPlayers() {
    try {
        const players = [
            // === ID 1-8 : Joueurs existants ===
            { pseudo: 'Kuumba', first_name: 'Hugo', last_name: '', image_url: '/uploads/players/kuumba.png', image_url_hover: '/uploads/players/kuumba_hover.png', birth_date: '1994-05-07', catch_phrase: "L'architecte de Nyxar" },
            { pseudo: 'Bvddy', first_name: 'Greg', last_name: '', image_url: '/uploads/players/bvddy.png', image_url_hover: '/uploads/players/bvddy_hover.png', birth_date: '1996-02-08', catch_phrase: 'On lâche rien, jamais' },
            { pseudo: 'Trilisk', first_name: 'Antonin', last_name: '', image_url: '/uploads/players/trilisk.png', image_url_hover: null, birth_date: '2000-07-20', catch_phrase: 'Le rally, c\'est la vie' },
            { pseudo: 'X-Strab', first_name: '', last_name: '', image_url: '/uploads/players/x_strab.png', image_url_hover: '/uploads/players/x_strab_hover.png', birth_date: '1996-12-09', catch_phrase: 'La stratégie avant tout' },
            { pseudo: 'Tommy', first_name: 'Tom', last_name: '', image_url: '/uploads/players/tommy.png', image_url_hover: null, birth_date: '2001-03-07', catch_phrase: 'Full speed, no regrets' },
            { pseudo: 'Dahsirio', first_name: '', last_name: '', image_url: '/uploads/players/dahsirio.png', image_url_hover: null, birth_date: null, catch_phrase: 'Rematch ? Toujours prêt' },
            { pseudo: 'ZerdaFox', first_name: '', last_name: '', image_url: '/uploads/players/zerdafox.png', image_url_hover: null, birth_date: '1992-01-05', catch_phrase: 'Rusé comme un renard' },
            // === ID 9-12 : Nyxar Competitive Trackmania ===
            { pseudo: 'Lukario', first_name: '', last_name: '', image_url: '/uploads/players/lukario.png', image_url_hover: null, birth_date: '2006-04-06', catch_phrase: "L'aura du combat" },
            { pseudo: 'Roquett', first_name: '', last_name: '', image_url: '/uploads/players/roquett.png', image_url_hover: null, birth_date: '2008-12-16', catch_phrase: 'Décollage imminent' },
            { pseudo: 'Quentin43', first_name: '', last_name: '', image_url: '/uploads/players/quentin43.png', image_url_hover: null, birth_date: null, catch_phrase: '43 raisons de gagner' },
            { pseudo: 'Xert0x', first_name: 'Hugo', last_name: '', image_url: '/uploads/players/xert0x.png', image_url_hover: null, birth_date: '2004-08-13', catch_phrase: 'Zero bug, full send' },
            // === ID 13-22 : Nyxar Main Trackmania ===
            { pseudo: 'Coz', first_name: '', last_name: '', image_url: '/uploads/players/coz.png', image_url_hover: null, birth_date: '2001-09-28', catch_phrase: 'Keep it coz-y' },
            { pseudo: 'Mentoz', first_name: '', last_name: '', image_url: '/uploads/players/mentoz.png', image_url_hover: null, birth_date: '2003-06-16', catch_phrase: 'Frais comme un Mentoz' },
            { pseudo: 'Ujimaa', first_name: '', last_name: '', image_url: '/uploads/players/ujimaa.png', image_url_hover: null, birth_date: '1997-08-04', catch_phrase: "L'union fait la force" },
            { pseudo: 'At0me', first_name: '', last_name: '', image_url: '/uploads/players/at0me.png', image_url_hover: null, birth_date: '2007-04-11', catch_phrase: 'Petit mais explosif' },
            { pseudo: 'EnjoysoloQ', first_name: '', last_name: '', image_url: '/uploads/players/enjoysoloq.png', image_url_hover: null, birth_date: '1998-01-28', catch_phrase: 'Solo mais jamais seul' },
            { pseudo: 'Vibes', first_name: '', last_name: '', image_url: '/uploads/players/vibes.png', image_url_hover: null, birth_date: '2004-08-21', catch_phrase: 'Good vibes only' },
            { pseudo: 'Aapril', first_name: '', last_name: '', image_url: '/uploads/players/aapril.png', image_url_hover: null, birth_date: '2002-10-17', catch_phrase: 'Le renouveau à chaque run' },
            { pseudo: 'Lyltreck', first_name: '', last_name: '', image_url: '/uploads/players/lyltreck.png', image_url_hover: null, birth_date: '2005-04-07', catch_phrase: 'Sur les rails du succès' },
            { pseudo: 'Undier', first_name: '', last_name: '', image_url: '/uploads/players/undier.png', image_url_hover: null, birth_date: null, catch_phrase: 'Toujours un cran au-dessus' },
            { pseudo: 'Kimy', first_name: '', last_name: '', image_url: '/uploads/players/kimy.png', image_url_hover: null, birth_date: '2009-02-24', catch_phrase: 'For real, no cap' },
            // === ID 23-33 : Nyxar Academy Trackmania ===
            { pseudo: 'Yeager', first_name: '', last_name: '', image_url: '/uploads/players/yeager.png', image_url_hover: null, birth_date: '2008-04-15', catch_phrase: 'Shinzou wo sasageyo' },
            { pseudo: 'Kyhudji', first_name: '', last_name: '', image_url: '/uploads/players/kyhudji.png', image_url_hover: null, birth_date: '2002-01-03', catch_phrase: "L'instinct du chasseur" },
            { pseudo: 'Yannou', first_name: '', last_name: '', image_url: '/uploads/players/yannou.png', image_url_hover: null, birth_date: '2012-09-23', catch_phrase: 'La relève est là' },
            { pseudo: 'Vincent', first_name: '', last_name: '', image_url: '/uploads/players/vincent.png', image_url_hover: null, birth_date: '2001-07-09', catch_phrase: 'Veni, vidi, vici' },
            { pseudo: 'Chtiwid', first_name: '', last_name: '', image_url: '/uploads/players/chtiwid.png', image_url_hover: null, birth_date: '2002-04-12', catch_phrase: "Ch'ti mais costaude" },
            { pseudo: 'Rag', first_name: '', last_name: '', image_url: '/uploads/players/rag.png', image_url_hover: null, birth_date: '1998-05-27', catch_phrase: "Du skill à l'état brut" },
            { pseudo: 'Drackus', first_name: '', last_name: '', image_url: '/uploads/players/drackus.png', image_url_hover: null, birth_date: '2002-10-23', catch_phrase: 'Le dragon sommeille en moi' },
            { pseudo: 'Dolit0x', first_name: '', last_name: '', image_url: '/uploads/players/dolit0x.png', image_url_hover: null, birth_date: '2002-03-23', catch_phrase: 'Zéro erreur, zéro pitié' },
            { pseudo: 'Sucretm', first_name: '', last_name: '', image_url: '/uploads/players/sucretm.png', image_url_hover: null, birth_date: '2000-02-09', catch_phrase: 'Doux au pseudo, dur en piste' },
            { pseudo: 'Rominouze', first_name: '', last_name: '', image_url: '/uploads/players/rominouze.png', image_url_hover: null, birth_date: '1997-10-08', catch_phrase: 'La classe à la française' },
            { pseudo: 'Tani', first_name: '', last_name: '', image_url: '/uploads/players/tani.png', image_url_hover: null, birth_date: '1998-05-16', catch_phrase: 'Discret mais redoutable' },
            // === ID 34-39 : Snow Kids / Rematch ===
            { pseudo: 'Hasaki', first_name: '', last_name: '', image_url: '/uploads/players/hasaki.png', image_url_hover: null, birth_date: null, catch_phrase: 'HASAKI !... désolé, réflexe' },
            { pseudo: 'Baban', first_name: '', last_name: '', image_url: '/uploads/players/baban.png', image_url_hover: null, birth_date: null, catch_phrase: 'Le mur infranchissable' },
            { pseudo: 'Hybarri', first_name: '', last_name: '', image_url: '/uploads/players/hybarri.png', image_url_hover: null, birth_date: '2006-02-12', catch_phrase: "L'hybride qui casse les codes" },
            { pseudo: 'Gombaies', first_name: '', last_name: '', image_url: '/uploads/players/gombaies.png', image_url_hover: null, birth_date: null, catch_phrase: 'Champignon vénéneux' },
            { pseudo: 'Foxx', first_name: '', last_name: '', image_url: '/uploads/players/foxx.png', image_url_hover: null, birth_date: '2002-10-22', catch_phrase: 'Agile et imprévisible' },
            { pseudo: 'Tito', first_name: '', last_name: '', image_url: '/uploads/players/tito.png', image_url_hover: null, birth_date: null, catch_phrase: 'Petit nom, grand talent' },
            // === ID 40 : Staff ===
            { pseudo: 'Senjojoveller', first_name: '', last_name: '', image_url: '/uploads/players/senjo.png', image_url_hover: null, birth_date: null, catch_phrase: 'Dans l\'ombre, tout se joue' },
        ]

        for (const player of players) {
            await pool.query(
                'INSERT INTO nyxariens (pseudo, first_name, last_name, image_url, image_url_hover, birth_date, catch_phrase) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [player.pseudo, player.first_name, player.last_name, player.image_url, player.image_url_hover, player.birth_date, player.catch_phrase]
            )
            console.log(`✓ Player '${player.pseudo}' créé`)
        }
    } catch (error) {
        console.error('Erreur insertion players:', error)
    }
}

// ==================== POSTES ====================

export async function seedPostes() {
    try {
        const postes = [
            { name: 'player', description: 'Joueur sélectionnable en line-up', color: '#3498db' },
            { name: 'captain', description: "Capitaine de l'équipe", color: '#df12a1ff' },
            { name: 'staff', description: 'Membre du staff', color: '#e74c3c' },
            { name: 'fondateur', description: 'Fondateur de Nyxar', color: '#dbc024ff' }
        ]

        for (const poste of postes) {
            await pool.query(
                'INSERT INTO poste (name, description, color) VALUES (?, ?, ?)',
                [poste.name, poste.description, poste.color]
            )
            console.log(`✓ Poste '${poste.name}' créé`)
        }
    } catch (error) {
        console.error('Erreur insertion postes:', error)
    }
}

// ==================== POSTE_NYXARIEN ====================

export async function seedPosteNyxarien() {
    try {
        const [postes] = await pool.query('SELECT id, name FROM poste')
        const playerPoste = postes.find(p => p.name === 'player')
        const fondateurPoste = postes.find(p => p.name === 'fondateur')
        const staffPoste = postes.find(p => p.name === 'staff')
        if (!playerPoste) return

        const [nyxariens] = await pool.query('SELECT id, pseudo FROM nyxariens')
        for (const n of nyxariens) {
            await pool.query('INSERT INTO poste_nyxarien (nyxarien_id, poste_id) VALUES (?, ?)', [n.id, playerPoste.id])
            if (n.pseudo === 'Kuumba' && fondateurPoste) {
                await pool.query('INSERT INTO poste_nyxarien (nyxarien_id, poste_id) VALUES (?, ?)', [n.id, fondateurPoste.id])
            }
            if (['X-Strab', 'Bvddy', 'Senjojoveller'].includes(n.pseudo) && staffPoste) {
                await pool.query('INSERT INTO poste_nyxarien (nyxarien_id, poste_id) VALUES (?, ?)', [n.id, staffPoste.id])
            }
        }
        console.log('✓ Associations player-positions créées')
    } catch (error) {
        console.error('Erreur insertion poste_nyxarien:', error)
    }
}

// ==================== LINK USERS TO PLAYERS ====================

export async function seedUserPlayerLinks() {
    try {
        const links = [
            'Kuumba', 'Bvddy', 'Trilisk', 'X-Strab', 'Tommy', 'Dahsirio', 'ZerdaFox',
            'Lukario', 'Roquett', 'Quentin43', 'Xert0x', 'Coz', 'Mentoz', 'Ujimaa', 'At0me',
            'EnjoysoloQ', 'Vibes', 'Aapril', 'Lyltreck', 'Undier', 'Kimy', 'Yeager', 'Kyhudji',
            'Yannou', 'Vincent', 'Chtiwid', 'Rag', 'Drackus', 'Dolit0x', 'Sucretm', 'Rominouze',
            'Tani', 'Hasaki', 'Baban', 'Hybarri', 'Gombaies', 'Foxx', 'Tito', 'Senjojoveller',
        ]

        for (const pseudo of links) {
            const [users] = await pool.query('SELECT id FROM users WHERE username = ?', [pseudo])
            const [nyxariens] = await pool.query('SELECT id FROM nyxariens WHERE pseudo = ?', [pseudo])
            if (users.length > 0 && nyxariens.length > 0) {
                await pool.query('UPDATE nyxariens SET user_id = ? WHERE id = ?', [users[0].id, nyxariens[0].id])
                console.log(`✓ User '${pseudo}' lié au player '${pseudo}'`)
            }
        }
    } catch (error) {
        console.error('Erreur insertion user-player links:', error)
    }
}

// ==================== LINE_UP_PLAYERS ====================

export async function seedLineUpPlayers() {
    try {
        // line_up_id: 1=Nyxar Main, 2=Nyxar Competitive, 3=Nyxar Academy, 4=Snow Kids
        const associations = [
            // Nyxar Main (capitaine: Bvddy)
            { line_up_id: 1, player_id: 1, joined_at: '2025-03-22' },
            { line_up_id: 1, player_id: 3, joined_at: '2025-03-22', is_captain: true },
            { line_up_id: 1, player_id: 2, joined_at: '2025-03-22' },
            { line_up_id: 1, player_id: 13, joined_at: '2025-03-22' },
            { line_up_id: 1, player_id: 4, joined_at: '2025-03-22' },
            { line_up_id: 1, player_id: 14, joined_at: '2025-03-22' },
            { line_up_id: 1, player_id: 15, joined_at: '2025-04-28' },
            { line_up_id: 1, player_id: 16, joined_at: '2025-08-08' },
            { line_up_id: 1, player_id: 17, joined_at: '2025-08-08' },
            { line_up_id: 1, player_id: 18, joined_at: '2025-08-22' },
            { line_up_id: 1, player_id: 19, joined_at: '2025-10-12' },
            { line_up_id: 1, player_id: 20, joined_at: '2025-11-28' },
            { line_up_id: 1, player_id: 21, joined_at: '2025-11-28' },
            { line_up_id: 1, player_id: 22, joined_at: '2025-10-12' },
            // Nyxar Competitive (capitaine: Lukario)
            { line_up_id: 2, player_id: 9, joined_at: '2025-03-22', is_captain: true },
            { line_up_id: 2, player_id: 10, joined_at: '2025-07-02' },
            { line_up_id: 2, player_id: 6, joined_at: '2025-10-12' },
            { line_up_id: 2, player_id: 11, joined_at: '2025-11-28' },
            { line_up_id: 2, player_id: 12, joined_at: '2025-11-28' },
            // Nyxar Academy (capitaine: X-Strab)
            { line_up_id: 3, player_id: 5, joined_at: '2025-08-22', is_captain: true },
            { line_up_id: 3, player_id: 23, joined_at: '2025-08-22' },
            { line_up_id: 3, player_id: 24, joined_at: '2025-08-22' },
            { line_up_id: 3, player_id: 25, joined_at: '2025-08-22' },
            { line_up_id: 3, player_id: 26, joined_at: '2025-08-22' },
            { line_up_id: 3, player_id: 27, joined_at: '2025-08-22' },
            { line_up_id: 3, player_id: 28, joined_at: '2025-09-06' },
            { line_up_id: 3, player_id: 29, joined_at: '2025-09-06' },
            { line_up_id: 3, player_id: 30, joined_at: '2025-09-06' },
            { line_up_id: 3, player_id: 8, joined_at: '2025-10-12' },
            { line_up_id: 3, player_id: 31, joined_at: '2025-10-12' },
            { line_up_id: 3, player_id: 32, joined_at: '2025-10-12' },
            { line_up_id: 3, player_id: 33, joined_at: '2025-07-21' },
            // Snow Kids (capitaine: Dahsirio)
            { line_up_id: 4, player_id: 7, joined_at: '2025-08-07', is_captain: true },
            { line_up_id: 4, player_id: 9, joined_at: '2025-08-07' },
            { line_up_id: 4, player_id: 34, joined_at: '2025-08-07' },
            { line_up_id: 4, player_id: 35, joined_at: '2025-08-07' },
            { line_up_id: 4, player_id: 36, joined_at: '2025-08-07' },
            { line_up_id: 4, player_id: 37, joined_at: '2025-08-07' },
            { line_up_id: 4, player_id: 38, joined_at: '2025-09-27' },
            { line_up_id: 4, player_id: 39, joined_at: '2025-10-12' },
        ]

        for (const a of associations) {
            await pool.query(
                'INSERT INTO line_up_players (line_up_id, player_id, is_captain, joined_at) VALUES (?, ?, ?, ?)',
                [a.line_up_id, a.player_id, a.is_captain ? 1 : 0, a.joined_at]
            )
        }
        console.log(`✓ ${associations.length} associations line-up/joueur créées`)
    } catch (error) {
        console.error('Erreur insertion line_up_players:', error)
    }
}

// ==================== SKINS ====================

export async function seedSkins() {
    try {
        const skins = [
            { name: 'Dam Pouleto', description: 'Skin Dam Pouleto par Coz.TM', image_url: '/uploads/skins/dam_pouleto.png', image_url_hover: '/uploads/skins/dam_pouleto_hover.png', download_url: '', skin_maker: 'Coz.TM' },
            { name: 'Michelin', description: 'Skin Michelin par Coz.TM', image_url: '/uploads/skins/michelin.png', image_url_hover: '/uploads/skins/michelin_hover.png', download_url: '', skin_maker: 'Coz.TM' },
            { name: 'Nyxar', description: 'Skin officiel Nyxar par Coz.TM', image_url: '/uploads/skins/nyxar.png', image_url_hover: '/uploads/skins/nyxar_hover.png', download_url: '', skin_maker: 'Coz.TM' },
        ]

        for (const skin of skins) {
            await pool.query(
                'INSERT INTO skins (name, description, image_url, image_url_hover, download_url, skin_maker) VALUES (?, ?, ?, ?, ?, ?)',
                [skin.name, skin.description, skin.image_url, skin.image_url_hover, skin.download_url, skin.skin_maker]
            )
            console.log(`✓ Skin '${skin.name}' créé`)
        }
    } catch (error) {
        console.error('Erreur insertion skins:', error)
    }
}

// ==================== COMPETITIONS ====================

export async function seedCompetitions() {
    try {
        const competitions = [
            {
                title: 'NYXAR Tower',
                date: 'Courant avril 2026',
                prize: '500€ pour le premier finisher',
                format: 'Trackmania · Solo endurance',
                description: "Une tour géante sans checkpoint où chaque joueur de l'équipe a mappé un étage. Qui réussira à tout enchaîner et atteindre le sommet en premier ?",
                image: '/evenements/nyxar_tower.png',
                game: 'Trackmania',
                discord_link: 'https://discord.gg/jHxZrCQrMR',
                rule_book: 'https://docs.google.com/spreadsheets/d/1DGubh0lKXEjzv_Ep-ihOU48STkdpe0w4YfTbWebl7Ok/edit?usp=sharing'
            },
            {
                title: 'Rebellion',
                date: '11 avril 2026 → 3 mai 2026',
                prize: 'Cash prize par équipes (4 à 8 joueurs)',
                format: 'Trackmania · Alt cars · Compétition team',
                description: 'Compétition par équipes sur des maps compétitives alt cars. Cohésion, coordination et maîtrise des lignes seront clés pour décrocher le titre.',
                image: '/evenements/rebellion.png',
                game: 'Trackmania',
                discord_link: 'https://discord.gg/jHxZrCQrMR',
                rule_book: 'https://docs.google.com/spreadsheets/d/1KSuwpcnFNIKeSOLwP56NlNs52IMox5nDNZ5pu_iIHsM/edit?gid=0#gid=0'
            },
            {
                title: 'NYXAR Monthly Cup',
                date: 'Chaque 1er week-end du mois',
                prize: '100€ pour la meilleure équipe + ticket pour la finale annuelle (500€)',
                format: 'Rematch · Série mensuelle',
                description: 'Un rendez-vous mensuel : gagne une manche pour obtenir ton ticket vers la grande finale annuelle à 500€. Idéal pour tester les nouvelles line-ups.',
                image: '/evenements/rematch.png',
                game: 'Rematch',
                discord_link: 'https://discord.gg/jHxZrCQrMR',
                rule_book: 'https://docs.google.com/spreadsheets/d/1KSuwpcnFNIKeSOLwP56NlNs52IMox5nDNZ5pu_iIHsM/edit?gid=0#gid=0'
            },
        ]

        for (const c of competitions) {
            await pool.query(
                'INSERT INTO competitions (title, date, prize, format, description, image, game, discord_link, rule_book) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [c.title, c.date, c.prize, c.format, c.description, c.image, c.game, c.discord_link, c.rule_book]
            )
            console.log(`✓ Compétition '${c.title}' créée`)
        }
    } catch (error) {
        console.error('Erreur insertion compétitions:', error)
    }
}

// ==================== RÉSULTATS ====================

export async function seedResultats() {
    try {
        const resultats = [
            {
                title: 'Shroom Mixed Series',
                description: 'Victoire en Division 5 ! Nyxar gagne la division avec son équipe de 8 joueurs et remporte également les playoffs. Une performance exceptionnelle qui propulse l\'équipe en division supérieure !',
                image_url: '/uploads/resultats/sms.png', url_page: 'sms',
                trackmania_exchange: 'https://exchange.trackmania.com/events/sms',
                trackmania_io: 'https://trackmania.io/competition/sms',
                google_sheet: 'https://docs.google.com/spreadsheets/d/sms-results',
                e_circuit_mania: 'https://ecircuit-mania.com/events/sms',
                rule_book: 'https://docs.google.com/document/d/sms-rules',
                website: 'https://www.google.com',
                tm_event: 'https://tm-events.trackmania.com/sms'
            },
            {
                title: 'OmniumCup',
                description: 'Résultats de l\'OmniumCup en Division 3. Nyxar termine 2ème de la division et 2ème des playoffs avec son équipe de 8. Une belle performance dans cette compétition prestigieuse !',
                image_url: '/uploads/resultats/omnium.png', url_page: 'omniumcup',
                trackmania_exchange: 'https://exchange.trackmania.com/events/omniumcup',
                trackmania_io: 'https://trackmania.io/competition/omniumcup',
                google_sheet: 'https://docs.google.com/spreadsheets/d/omniumcup-results',
                e_circuit_mania: null,
                rule_book: 'https://docs.google.com/document/d/omniumcup-rules',
                website: null,
                tm_event: 'https://tm-events.trackmania.com/omniumcup'
            },
            // {
            //     title: 'Trackmania For Hours #4',
            //     description: 'Trackmania For Hours est une compétition d\'endurance de 24h par équipe. Nyxar a envoyé 4 équipes qui se sont classées respectivement 32ème, 52ème, 129ème et 139ème sur 188 équipes participantes.',
            //     image_url: '/uploads/resultats/tfh.png', url_page: 'tfh',
            //     trackmania_exchange: null,
            //     trackmania_io: 'https://trackmania.io/competition/tfh',
            //     google_sheet: 'https://docs.google.com/spreadsheets/d/tfh-results',
            //     e_circuit_mania: null,
            //     rule_book: 'https://docs.google.com/document/d/tfh-rules',
            //     website: 'https://trackmaniaforhours.com',
            //     tm_event: 'https://tm-events.trackmania.com/tfh',
            //     liquipedia: null
            // },
            {
                title: 'INSA LAN 2026',
                description: '11 Nyxariens à Rennes les 7 et 8 mars 2026 pour la LAN Trackmania de l\'INSA. Quentin43 et Roquett en Top 9-12 Elite, Tommy en Top 17-24 Elite, Aapril en Top 25-32 Elite, Bvddy en Top 9-12 Amateur.',
                image_url: '/uploads/resultats/insalan.png', url_page: 'insa-2026',
                trackmania_exchange: null,
                trackmania_io: null,
                google_sheet: null,
                e_circuit_mania: null,
                rule_book: null,
                website: 'https://insalan.fr/tournament/5',
                tm_event: null,
                liquipedia: null
            },
        ]

        for (const r of resultats) {
            await pool.query(
                'INSERT INTO resultats (title, description, image_url, url_page, trackmania_exchange, trackmania_io, google_sheet, e_circuit_mania, rule_book, website, tm_event, liquipedia) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [r.title, r.description, r.image_url, r.url_page, r.trackmania_exchange, r.trackmania_io, r.google_sheet, r.e_circuit_mania, r.rule_book, r.website, r.tm_event, r.liquipedia]
            )
            console.log(`✓ Résultat '${r.title}' créé`)
        }
    } catch (error) {
        console.error('Erreur insertion résultats:', error)
    }
}

// ==================== SPONSORS ====================

export async function seedSponsors() {
    try {
        const sponsors = [
            { name: 'Sponsor 1', image_url: '/uploads/sponsors/sponsor_1.png', display_order: 0 },
            { name: 'Sponsor 2', image_url: '/uploads/sponsors/sponsor_2.png', display_order: 1 },
        ]

        for (const s of sponsors) {
            await pool.query(
                'INSERT INTO sponsors (name, image_url, display_order) VALUES (?, ?, ?)',
                [s.name, s.image_url, s.display_order]
            )
            console.log(`✓ Sponsor '${s.name}' créé`)
        }
    } catch (error) {
        console.error('Erreur insertion sponsors:', error)
    }
}

// ==================== HERO BANNERS ====================

export async function seedHeroBanners() {
    try {
        const banners = [
            { title: 'Banner 1', image_url: '/uploads/herobanner/banner_1.png', display_order: 0, is_active: 1 },
            { title: 'Banner 2', image_url: '/uploads/herobanner/banner_2.png', display_order: 1, is_active: 1 },
            { title: 'Banner 3', image_url: '/uploads/herobanner/banner_3.png', display_order: 2, is_active: 1 },
            { title: 'Banner 4', image_url: '/uploads/herobanner/banner_4.png', display_order: 3, is_active: 1 },
        ]

        for (const b of banners) {
            await pool.query(
                'INSERT INTO hero_banners (title, image_url, display_order, is_active) VALUES (?, ?, ?, ?)',
                [b.title, b.image_url, b.display_order, b.is_active]
            )
            console.log(`✓ Hero banner '${b.title}' créé`)
        }
    } catch (error) {
        console.error('Erreur insertion hero banners:', error)
    }
}

export async function seedInitData() {
    console.log('\n🌱 Initialisation des données du site...')

    // Données de base (sans dépendances)
    await seedRoles()
    await seedPostes()
    await seedGames()
    await seedUsers()
    await seedPlayers()
    await seedSkins()
    await seedNotyCampaign()
    await seedCompetitions()
    await seedResultats()
    await seedSponsors()
    await seedHeroBanners()

    // Données avec dépendances
    await seedRoleUser()
    await seedVotingCategories()
    await seedLineUps()
    await seedPosteNyxarien()
    await seedUserPlayerLinks()
    await seedLineUpPlayers()

    // Résultats officiels NOTY 2025
    await seedVotes()

    console.log('\n✅ Données d\'initialisation insérées avec succès\n')
}
