import pool from './db.js'
import mysql from 'mysql2/promise'
import dotenv from 'dotenv'
import os from 'os'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '.env') })

// ============ FONCTIONS DE VÉRIFICATION ============

// Vérifier si la base de données existe
export async function databaseExists() {
    try {
        const isLinux = os.platform() === 'linux'
        const tempPool = mysql.createPool({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            user: isLinux ? process.env.DB_USER : 'root',
            password: isLinux ? process.env.DB_PASSWORD : '',
        })

        const dbName = process.env.DB_NAME || 'nyxar_db'
        const [rows] = await tempPool.query(
            `SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?`,
            [dbName]
        )

        await tempPool.end()
        return rows.length > 0
    } catch (error) {
        console.error('Erreur vérification base de données:', error)
        return false
    }
}

// Récupérer la liste des tables existantes
export async function getExistingTables() {
    try {
        const dbName = process.env.DB_NAME || 'nyxar_db'
        const [rows] = await pool.query(
            `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ?`,
            [dbName]
        )
        return rows.map(row => row.TABLE_NAME)
    } catch (error) {
        console.error('Erreur récupération tables:', error)
        return []
    }
}

// Vérifier si une table existe
export async function tableExists(tableName) {
    try {
        const dbName = process.env.DB_NAME || 'nyxar_db'
        const [rows] = await pool.query(
            `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
            [dbName, tableName]
        )
        return rows.length > 0
    } catch (error) {
        return false
    }
}

// ============ FONCTIONS DE GESTION ============

// Supprimer la base de donnees
export async function dropDatabase() {
    try {
        const isLinux = os.platform() === 'linux'
        const tempPool = mysql.createPool({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            user: isLinux ? process.env.DB_USER : 'root',
            password: isLinux ? process.env.DB_PASSWORD : '',
        })

        const dbName = process.env.DB_NAME || 'nyxar_db'
        await tempPool.query(`DROP DATABASE IF EXISTS \`${dbName}\``)
        console.log(`✓ Base de données '${dbName}' supprimée`)

        await tempPool.end()
    } catch (error) {
        console.error('Erreur suppression base de données:', error)
        throw error
    }
}

// Creer la base de donnees
export async function createDatabase() {
    try {
        const dbName = process.env.DB_NAME || 'nyxar_db'

        const isLinux = os.platform() === 'linux'
        const tempPool = mysql.createPool({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            user: isLinux ? process.env.DB_USER : 'root',
            password: isLinux ? process.env.DB_PASSWORD : '',
        })

        await tempPool.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
        console.log(`\n✓ Base de données '${dbName}' créée`)

        await tempPool.end()
    } catch (error) {
        console.error('Erreur création base de données:', error)
        throw error
    }
}

// ============ CRÉATION DES TABLES ============

// Creer la table users
export async function createUsersTable() {
    try {
        await pool.query(
            'CREATE TABLE IF NOT EXISTS users (\n' +
            '    id INT AUTO_INCREMENT PRIMARY KEY,\n' +
            '    username VARCHAR(191) UNIQUE NOT NULL,\n' +
            '    email VARCHAR(191) UNIQUE NOT NULL,\n' +
            '    password_hash VARCHAR(255) NOT NULL,\n' +
            '    image_url VARCHAR(500),\n' +
            '    trackmania_io_url VARCHAR(500),\n' +
            '    is_deleted TINYINT DEFAULT 0,\n' +
            '    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n' +
            '    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP\n' +
            ')'
        );
        console.log('✓ Table users créée')
    } catch (error) {
        console.error('Erreur création table users:', error)
    }
}

// Creer la table role
export async function createRoleTable() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS role (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(50) UNIQUE NOT NULL,
                description VARCHAR(255),
                color VARCHAR(7),
                icon_url VARCHAR(255),
                permissions JSON,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `)
        console.log('✓ Table role créée')
    } catch (error) {
        console.error('Erreur création table role:', error)
    }
}

// Creer la table role_user
export async function createRoleUserTable() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS role_user (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                role_id INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (role_id) REFERENCES role(id) ON DELETE CASCADE,
                UNIQUE KEY unique_user_role (user_id, role_id)
            )
        `)
        console.log('✓ Table role_user créée')
    } catch (error) {
        console.error('Erreur création table role_user:', error)
    }
}

// Creer la table games
export async function createGamesTable() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS games (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(191) UNIQUE NOT NULL,
                color VARCHAR(50) NOT NULL,
                image_url VARCHAR(500),
                image_hover VARCHAR(500),
                link VARCHAR(500),
                is_active TINYINT DEFAULT 1,
                is_deleted TINYINT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `)
        console.log('✓ Table games créée')
    } catch (error) {
        console.error('Erreur création table games:', error)
    }
}

// Creer la table noty_campaign
export async function createNotyCampaignTable() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS noty_campaign (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                image_url VARCHAR(500),
                card_background_url VARCHAR(500),
                start_date DATE NOT NULL,
                end_date DATE NOT NULL,
                results_end_date DATE,
                is_paused TINYINT DEFAULT 0,
                is_deleted TINYINT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `)
        console.log('✓ Table noty_campaign créée')
    } catch (error) {
        console.error('Erreur création table noty_campaign:', error)
    }
}

// Creer la table voting_categories
export async function createVotingCategoriesTable() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS voting_categories (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                image_url VARCHAR(500),
                game_id INT,
                nominee_type ENUM('player','image','sound','video','url') NOT NULL DEFAULT 'player',
                noty_campaign_id INT NOT NULL,
                display_order INT DEFAULT 0,
                visible_by_nyxar TINYINT DEFAULT 1,
                votes_count INT DEFAULT 0,
                is_deleted TINYINT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE SET NULL,
                FOREIGN KEY (noty_campaign_id) REFERENCES noty_campaign(id) ON DELETE CASCADE
            )
        `)
        console.log('✓ Table voting_categories créée')
    } catch (error) {
        console.error('Erreur création table voting_categories:', error)
    }
}

// Creer la table line_ups
export async function createLineUpsTable() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS line_ups (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                image_url VARCHAR(500),
                color VARCHAR(50),
                game_id INT,
                is_active TINYINT DEFAULT 1,
                is_deleted TINYINT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE SET NULL
            )
        `)
        console.log('✓ Table line_ups créée')
    } catch (error) {
        console.error('Erreur création table line_ups:', error)
    }
}

// Creer la table nyxariens
export async function createPlayersTable() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS nyxariens (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT,
                pseudo VARCHAR(191) NOT NULL UNIQUE,
                first_name VARCHAR(255),
                last_name VARCHAR(255),
                image_url VARCHAR(500),
                image_url_hover VARCHAR(500),
                birth_date DATE,
                catch_phrase TEXT,
                is_deleted TINYINT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
                UNIQUE KEY unique_user_id (user_id)
            )
        `)
        console.log('✓ Table nyxariens créée')
    } catch (error) {
        console.error('Erreur création table nyxariens:', error)
    }
}

// Creer la table poste
export async function createPosteTable() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS poste (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(191) NOT NULL UNIQUE,
                description TEXT,
                color VARCHAR(50),
                is_deleted TINYINT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `)
        console.log('✓ Table poste créée')
    } catch (error) {
        console.error('Erreur création table poste:', error)
    }
}

// Creer la table poste_nyxarien (junction table M2M)
export async function createPosteNyxarienTable() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS poste_nyxarien (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nyxarien_id INT NOT NULL,
                poste_id INT NOT NULL,
                joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                left_at TIMESTAMP DEFAULT NULL,
                is_deleted TINYINT DEFAULT 0,
                FOREIGN KEY (nyxarien_id) REFERENCES nyxariens(id) ON DELETE CASCADE,
                FOREIGN KEY (poste_id) REFERENCES poste(id) ON DELETE CASCADE,
                UNIQUE KEY unique_nyxarien_poste (nyxarien_id, poste_id)
            )
        `)
        console.log('✓ Table poste_nyxarien créée')
    } catch (error) {
        console.error('Erreur création table poste_nyxarien:', error)
    }
}

// Creer la table line_up_players
export async function createLineUpPlayersTable() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS line_up_players (
                id INT AUTO_INCREMENT PRIMARY KEY,
                line_up_id INT NOT NULL,
                player_id INT NOT NULL,
                is_captain TINYINT DEFAULT 0,
                joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                left_at TIMESTAMP DEFAULT NULL,
                is_deleted TINYINT DEFAULT 0,
                FOREIGN KEY (line_up_id) REFERENCES line_ups(id) ON DELETE CASCADE,
                FOREIGN KEY (player_id) REFERENCES nyxariens(id) ON DELETE CASCADE
            )
        `)
        console.log('✓ Table line_up_players créée')
    } catch (error) {
        console.error('Erreur création table line_up_players:', error)
    }
}

// Creer la table votes
export async function createVotesTable() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS votes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                category_id INT NOT NULL,
                noty_campaign_id INT,
                first_choice INT,
                second_choice INT,
                third_choice INT,
                is_deleted TINYINT DEFAULT 0,
                deleted_at TIMESTAMP NULL,
                deleted_by INT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (category_id) REFERENCES voting_categories(id) ON DELETE CASCADE,
                FOREIGN KEY (noty_campaign_id) REFERENCES noty_campaign(id) ON DELETE CASCADE,
                UNIQUE KEY unique_user_category_campaign (user_id, category_id, noty_campaign_id)
            )
        `)
        console.log('✓ Table votes créée')
    } catch (error) {
        console.error('Erreur création table votes:', error)
    }
}

// Creer la table admin_audit_log
export async function createAdminAuditLogTable() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS admin_audit_log (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                action VARCHAR(100) NOT NULL,
                target_type VARCHAR(50) NOT NULL,
                target_id INT NULL,
                details JSON NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_audit_user (user_id),
                INDEX idx_audit_created (created_at)
            )
        `)
        console.log('✓ Table admin_audit_log créée')
    } catch (error) {
        console.error('Erreur création table admin_audit_log:', error)
    }
}

// Creer la table custom_nominees
export async function createCustomNomineesTable() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS custom_nominees (
                id INT AUTO_INCREMENT PRIMARY KEY,
                category_id INT NOT NULL,
                title VARCHAR(255) NOT NULL,
                media_url VARCHAR(500) NOT NULL,
                waveform_data JSON,
                display_order INT DEFAULT 0,
                is_deleted TINYINT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (category_id) REFERENCES voting_categories(id) ON DELETE CASCADE
            )
        `)
        console.log('✓ Table custom_nominees créée')
    } catch (error) {
        console.error('Erreur création table custom_nominees:', error)
    }
}

// Creer la table voting_categories_nominees (liaison joueurs ↔ catégories)
export async function createVotingCategoriesNomineesTable() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS voting_categories_nominees (
                id INT AUTO_INCREMENT PRIMARY KEY,
                category_id INT NOT NULL,
                player_id INT NOT NULL,
                is_deleted TINYINT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (category_id) REFERENCES voting_categories(id) ON DELETE CASCADE,
                FOREIGN KEY (player_id) REFERENCES nyxariens(id) ON DELETE CASCADE,
                UNIQUE KEY unique_category_player (category_id, player_id)
            )
        `)
        console.log('✓ Table voting_categories_nominees créée')
    } catch (error) {
        console.error('Erreur création table voting_categories_nominees:', error)
    }
}

// Creer la table skins
export async function createSkinsTable() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS skins (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(191) NOT NULL UNIQUE,
                description TEXT,
                image_url VARCHAR(500),
                image_url_hover VARCHAR(500),
                download_url VARCHAR(500),
                skin_maker VARCHAR(255),
                is_active TINYINT DEFAULT 1,
                is_deleted TINYINT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `)
        console.log('✓ Table skins créée')
    } catch (error) {
        console.error('Erreur création table skins:', error)
    }
}

// Creer la table resultats
export async function createResultatsTable() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS resultats (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                image_url VARCHAR(500),
                url_page VARCHAR(255),
                trackmania_exchange VARCHAR(500),
                trackmania_io VARCHAR(500),
                google_sheet VARCHAR(500),
                e_circuit_mania VARCHAR(500),
                rule_book VARCHAR(500),
                website VARCHAR(500),
                tm_event VARCHAR(500),
                liquipedia VARCHAR(500),
                is_active TINYINT DEFAULT 1,
                is_deleted TINYINT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `)
        console.log('✓ Table resultats créée')
    } catch (error) {
        console.error('Erreur création table resultats:', error)
    }
}

// Créer la table sponsors
export async function createSponsorsTable() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS sponsors (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                image_url VARCHAR(500) NOT NULL,
                display_order INT DEFAULT 0,
                is_active TINYINT DEFAULT 1,
                is_deleted TINYINT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `)
        console.log('✓ Table sponsors créée')
    } catch (error) {
        console.error('Erreur création table sponsors:', error)
    }
}

// Créer la table hero_banners
export async function createHeroBannersTable() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS hero_banners (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255),
                image_url VARCHAR(500) NOT NULL,
                display_order INT DEFAULT 0,
                is_active TINYINT DEFAULT 1,
                is_deleted TINYINT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `)
        console.log('✓ Table hero_banners créée')
    } catch (error) {
        console.error('Erreur création table hero_banners:', error)
    }
}

// Créer la table competitions
export async function createCompetitionsTable() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS competitions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                date VARCHAR(255) NOT NULL,
                prize VARCHAR(255),
                format VARCHAR(255),
                description LONGTEXT,
                image VARCHAR(500),
                game VARCHAR(100),
                discord_link VARCHAR(500),
                rule_book VARCHAR(500),
                is_active TINYINT DEFAULT 1,
                is_deleted TINYINT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `)
        console.log('✓ Table competitions créée')
    } catch (error) {
        console.error('Erreur création table competitions:', error)
    }
}

// Créer la table scores pour les mini-jeux
export async function createScoresTable() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS scores (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT,
                game VARCHAR(100) NOT NULL,
                score INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
            )
        `)
        console.log('✓ Table scores créée')
    } catch (error) {
        console.error('Erreur création table scores:', error)
    }
}

// Créer la table mini_game_settings pour les statuts des mini-jeux
export async function createMiniGamesSettingsTable() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS mini_game_settings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                game_id INT NOT NULL,
                slug VARCHAR(100) NOT NULL,
                is_active TINYINT DEFAULT 1,
                display_order INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY uniq_game_id (game_id),
                UNIQUE KEY uniq_slug (slug)
            )
        `)
        console.log('✓ Table mini_game_settings créée')
    } catch (error) {
        console.error('Erreur création table mini_game_settings:', error)
    }
}

// Créer la table daily_words pour le mot du jour Wordle
export async function createDailyWordsTable() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS daily_words (
                id INT AUTO_INCREMENT PRIMARY KEY,
                word VARCHAR(32) NOT NULL,
                effective_date DATE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY uniq_effective_date (effective_date)
            )
        `)
        console.log('✓ Table daily_words créée')
    } catch (error) {
        console.error('Erreur création table daily_words:', error)
    }
}

// Créer la table wordle_games (état des parties Wordle par utilisateur)
export async function createWordleGamesTable() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS wordle_games (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                mode ENUM('simple', 'serie') NOT NULL DEFAULT 'simple',
                date DATE NOT NULL,
                word VARCHAR(32) NOT NULL,
                guesses JSON NOT NULL,
                status ENUM('ongoing', 'won', 'lost') NOT NULL DEFAULT 'ongoing',
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY uq_wordle_game (user_id, mode, date),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `)
        console.log('✓ Table wordle_games créée')
    } catch (error) {
        console.error('Erreur création table wordle_games:', error)
    }
}

// Créer la table wordle_stats (stats agrégées par utilisateur et mode)
export async function createWordleStatsTable() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS wordle_stats (
                user_id INT NOT NULL,
                mode ENUM('simple', 'serie') NOT NULL DEFAULT 'simple',
                played INT NOT NULL DEFAULT 0,
                won INT NOT NULL DEFAULT 0,
                current_streak INT NOT NULL DEFAULT 0,
                best_streak INT NOT NULL DEFAULT 0,
                guess_distribution JSON NOT NULL,
                total_guesses INT NOT NULL DEFAULT 0,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (user_id, mode),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `)
        console.log('✓ Table wordle_stats créée')
    } catch (error) {
        console.error('Erreur création table wordle_stats:', error)
    }
}

// ============ CRÉATION INTELLIGENTE DE TOUTES LES TABLES ============

// Creer toutes les tables dans le bon ordre (intelligemment)
// Retourne le nombre de tables créées
export async function createAllTables() {
    // Récupérer les tables existantes
    const existingTables = await getExistingTables()

    // Définir toutes les tables dans l'ordre de création (dépendances)
    const allTables = [
        // Tables sans dépendances
        { name: 'users', create: createUsersTable },
        { name: 'role', create: createRoleTable },
        { name: 'games', create: createGamesTable },
        { name: 'nyxariens', create: createPlayersTable },
        { name: 'poste', create: createPosteTable },
        { name: 'skins', create: createSkinsTable },
        { name: 'resultats', create: createResultatsTable },
        { name: 'noty_campaign', create: createNotyCampaignTable },
        { name: 'competitions', create: createCompetitionsTable },
        { name: 'sponsors', create: createSponsorsTable },
        { name: 'hero_banners', create: createHeroBannersTable },
        // Tables avec dépendances
        { name: 'role_user', create: createRoleUserTable },
        { name: 'voting_categories', create: createVotingCategoriesTable },
        { name: 'line_ups', create: createLineUpsTable },
        { name: 'poste_nyxarien', create: createPosteNyxarienTable },
        { name: 'line_up_players', create: createLineUpPlayersTable },
        { name: 'custom_nominees', create: createCustomNomineesTable },
        { name: 'voting_categories_nominees', create: createVotingCategoriesNomineesTable },
        { name: 'votes', create: createVotesTable },
        { name: 'admin_audit_log', create: createAdminAuditLogTable },
        { name: 'scores', create: createScoresTable },
        { name: 'daily_words', create: createDailyWordsTable },
        { name: 'wordle_games', create: createWordleGamesTable },
        { name: 'wordle_stats', create: createWordleStatsTable },
        { name: 'mini_game_settings', create: createMiniGamesSettingsTable },
    ]

    // Trouver les tables manquantes
    const missingTables = allTables.filter(t => !existingTables.includes(t.name))

    // Si aucune table manquante, retourner 0
    if (missingTables.length === 0) {
        await runMigrations()
        return 0
    }

    // Créer seulement les tables manquantes
    console.log(`\n📦 Création de ${missingTables.length} table(s) manquante(s)...`)
    for (const table of missingTables) {
        await table.create()
    }

    // Appliquer les migrations
    await runMigrations()

    return missingTables.length
}

// ============ MIGRATIONS ============

// Migrations pour mettre à jour les tables existantes (silencieux si rien à faire)
export async function runMigrations() {
    try {
        let migrationsApplied = 0

        // Migration: Ajouter image_url à la table users si elle n'existe pas
        const [columns] = await pool.query(
            `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'image_url'`,
            [process.env.DB_NAME || 'nyxar_db']
        )

        if (columns.length === 0) {
            await pool.query(
                'ALTER TABLE users ADD COLUMN image_url VARCHAR(500) AFTER password_hash'
            )
            console.log('✓ Migration: Colonne image_url ajoutée à users')
            migrationsApplied++
        }

        // Migration: Ajouter trackmania_io_url à la table users si elle n'existe pas
        const [trackmaniaColumn] = await pool.query(
            `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'trackmania_io_url'`,
            [process.env.DB_NAME || 'nyxar_db']
        )

        if (trackmaniaColumn.length === 0) {
            await pool.query(
                'ALTER TABLE users ADD COLUMN trackmania_io_url VARCHAR(500) AFTER image_url'
            )
            console.log('✓ Migration: Colonne trackmania_io_url ajoutée à users')
            migrationsApplied++
        }

        // Migration: Ajouter is_active aux tables games, results, sponsors, competitions, skins, line_ups
        const tablesToMigrate = [
            { name: 'games', after: 'link' },
            { name: 'resultats', after: 'tm_event' },
            { name: 'sponsors', after: 'display_order' },
            { name: 'competitions', after: 'rule_book' },
            { name: 'skins', after: 'skin_maker' },
            { name: 'line_ups', after: 'game_id' }
        ]
        for (const table of tablesToMigrate) {
            const [cols] = await pool.query(
                `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
                 WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = 'is_active'`,
                [process.env.DB_NAME || 'nyxar_db', table.name]
            )
            if (cols.length === 0) {
                await pool.query(
                    `ALTER TABLE ${table.name} ADD COLUMN is_active TINYINT DEFAULT 1 AFTER ${table.after}`
                )
                console.log(`✓ Migration: Colonne is_active ajoutée à ${table.name}`)
                migrationsApplied++
            }
        }

        // Migration: Ajouter display_order à voting_categories si elle n'existe pas
        const [displayOrderCol] = await pool.query(
            `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'voting_categories' AND COLUMN_NAME = 'display_order'`,
            [process.env.DB_NAME || 'nyxar_db']
        )

        if (displayOrderCol.length === 0) {
            await pool.query(
                'ALTER TABLE voting_categories ADD COLUMN display_order INT DEFAULT 0 AFTER noty_campaign_id'
            )
            console.log('✓ Migration: Colonne display_order ajoutée à voting_categories')
            migrationsApplied++
        }

        // Migration: Ajouter nominee_type à voting_categories si elle n'existe pas
        const [nomineeTypeCol] = await pool.query(
            `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'voting_categories' AND COLUMN_NAME = 'nominee_type'`,
            [process.env.DB_NAME || 'nyxar_db']
        )

        if (nomineeTypeCol.length === 0) {
            await pool.query(
                `ALTER TABLE voting_categories ADD COLUMN nominee_type ENUM('player','image','sound','video','url') NOT NULL DEFAULT 'player' AFTER game_id`
            )
            console.log('✓ Migration: Colonne nominee_type ajoutée à voting_categories')
            migrationsApplied++
        } else {
            // Migration: Fusionner youtube/twitch → url dans l'ENUM nominee_type
            const [enumInfo] = await pool.query(
                `SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
                 WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'voting_categories' AND COLUMN_NAME = 'nominee_type'`,
                [process.env.DB_NAME || 'nyxar_db']
            )
            if (enumInfo.length > 0) {
                const colType = enumInfo[0].COLUMN_TYPE
                if (colType.includes('youtube') || colType.includes('twitch')) {
                    // Convertir les données existantes avant de changer l'ENUM
                    await pool.query(`UPDATE voting_categories SET nominee_type = 'url' WHERE nominee_type IN ('youtube', 'twitch')`)
                    await pool.query(
                        `ALTER TABLE voting_categories MODIFY COLUMN nominee_type ENUM('player','image','sound','video','url') NOT NULL DEFAULT 'player'`
                    )
                    console.log('✓ Migration: ENUM nominee_type fusionné (youtube/twitch → url)')
                    migrationsApplied++
                } else if (!colType.includes('video')) {
                    await pool.query(
                        `ALTER TABLE voting_categories MODIFY COLUMN nominee_type ENUM('player','image','sound','video','url') NOT NULL DEFAULT 'player'`
                    )
                    console.log('✓ Migration: ENUM nominee_type étendu (video, url)')
                    migrationsApplied++
                }
            }
        }

        // Migration: Supprimer les FK de votes vers nyxariens (first_choice, second_choice, third_choice)
        const [voteFks] = await pool.query(
            `SELECT CONSTRAINT_NAME, COLUMN_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
             WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'votes' AND REFERENCED_TABLE_NAME = 'nyxariens'`,
            [process.env.DB_NAME || 'nyxar_db']
        )

        for (const fk of voteFks) {
            await pool.query(`ALTER TABLE votes DROP FOREIGN KEY ${fk.CONSTRAINT_NAME}`)
            console.log(`✓ Migration: FK ${fk.CONSTRAINT_NAME} supprimée de votes`)
            migrationsApplied++
        }

        // Migration: Ajouter results_end_date à noty_campaign si elle n'existe pas
        const [resultsEndDateCol] = await pool.query(
            `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'noty_campaign' AND COLUMN_NAME = 'results_end_date'`,
            [process.env.DB_NAME || 'nyxar_db']
        )

        if (resultsEndDateCol.length === 0) {
            await pool.query(
                'ALTER TABLE noty_campaign ADD COLUMN results_end_date DATE AFTER end_date'
            )
            console.log('✓ Migration: Colonne results_end_date ajoutée à noty_campaign')
            migrationsApplied++
        }

        // Migration: Ajouter card_background_url à noty_campaign
        const [cardBgCol] = await pool.query(
            `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'noty_campaign' AND COLUMN_NAME = 'card_background_url'`,
            [process.env.DB_NAME || 'nyxar_db']
        )

        if (cardBgCol.length === 0) {
            await pool.query(
                'ALTER TABLE noty_campaign ADD COLUMN card_background_url VARCHAR(500) AFTER image_url'
            )
            console.log('✓ Migration: Colonne card_background_url ajoutée à noty_campaign')
            migrationsApplied++
        }

        // Migration: Ajouter is_paused à noty_campaign si elle n'existe pas
        const [isPausedCol] = await pool.query(
            `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'noty_campaign' AND COLUMN_NAME = 'is_paused'`,
            [process.env.DB_NAME || 'nyxar_db']
        )

        if (isPausedCol.length === 0) {
            await pool.query(
                'ALTER TABLE noty_campaign ADD COLUMN is_paused TINYINT(1) NOT NULL DEFAULT 0 AFTER results_end_date'
            )
            console.log('✓ Migration: Colonne is_paused ajoutée à noty_campaign')
            migrationsApplied++
        }

        // Migration: Ajouter liquipedia à resultats si elle n'existe pas
        const [liquipediaCol] = await pool.query(
            `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'resultats' AND COLUMN_NAME = 'liquipedia'`,
            [process.env.DB_NAME || 'nyxar_db']
        )
        if (liquipediaCol.length === 0) {
            await pool.query(
                'ALTER TABLE resultats ADD COLUMN liquipedia VARCHAR(500) AFTER tm_event'
            )
            console.log('✓ Migration: Colonne liquipedia ajoutée à resultats')
            migrationsApplied++
        }

        // Migration: Mettre à jour les chemins d'images des catégories
        const [updatedPaths] = await pool.query(
            `UPDATE voting_categories SET image_url = REPLACE(image_url, '/uploads/categories/', '/uploads/noty/categories/thumbnails/') WHERE image_url LIKE '/uploads/categories/%'`
        )

        if (updatedPaths.affectedRows > 0) {
            console.log(`✓ Migration: ${updatedPaths.affectedRows} chemins d'images mis à jour`)
            migrationsApplied++
        }

        // Migration: Supprimer users.role (remplacé par role_user)
        const [usersRoleCol] = await pool.query(
            `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'role'`,
            [process.env.DB_NAME || 'nyxar_db']
        )
        if (usersRoleCol.length > 0) {
            await pool.query(`ALTER TABLE users DROP COLUMN role`)
            console.log('✓ Migration: Colonne role supprimée de users')
            migrationsApplied++
        }

        // Migration: Ajouter FK votes.deleted_by → users(id)
        const [deletedByFk] = await pool.query(
            `SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
             WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'votes' AND COLUMN_NAME = 'deleted_by'
             AND REFERENCED_TABLE_NAME IS NOT NULL`,
            [process.env.DB_NAME || 'nyxar_db']
        )
        if (deletedByFk.length === 0) {
            // S'assurer que la colonne deleted_by existe d'abord
            const [deletedByCol] = await pool.query(
                `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
                 WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'votes' AND COLUMN_NAME = 'deleted_by'`,
                [process.env.DB_NAME || 'nyxar_db']
            )
            if (deletedByCol.length > 0) {
                await pool.query(
                    `ALTER TABLE votes ADD CONSTRAINT votes_ibfk_4
                     FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL`
                )
                console.log('✓ Migration: FK votes.deleted_by → users ajoutée')
                migrationsApplied++
            }
        }

        // Migration: Supprimer voting_categories_nominees.noty_campaign_id (redondant)
        const [vcnNotypCol] = await pool.query(
            `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'voting_categories_nominees' AND COLUMN_NAME = 'noty_campaign_id'`,
            [process.env.DB_NAME || 'nyxar_db']
        )
        if (vcnNotypCol.length > 0) {
            // Dropper d'abord les FK sur cette colonne
            const [vcnFks] = await pool.query(
                `SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
                 WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'voting_categories_nominees'
                 AND COLUMN_NAME = 'noty_campaign_id' AND REFERENCED_TABLE_NAME IS NOT NULL`,
                [process.env.DB_NAME || 'nyxar_db']
            )
            for (const fk of vcnFks) {
                await pool.query(`ALTER TABLE voting_categories_nominees DROP FOREIGN KEY ${fk.CONSTRAINT_NAME}`)
            }
            await pool.query(`ALTER TABLE voting_categories_nominees DROP COLUMN noty_campaign_id`)
            console.log('✓ Migration: Colonne noty_campaign_id supprimée de voting_categories_nominees')
            migrationsApplied++
        }

        // Migration: Supprimer campaign_categories (relation M2M abandonnée, 1-N directe via noty_campaign_id)
        const [ccExists] = await pool.query(
            `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'campaign_categories'`,
            [process.env.DB_NAME || 'nyxar_db']
        )
        if (ccExists.length > 0) {
            await pool.query(`DROP TABLE campaign_categories`)
            console.log('✓ Migration: Table campaign_categories supprimée')
            migrationsApplied++
        }

        // Migration: voting_categories.noty_campaign_id NOT NULL
        const [vcNotypNullable] = await pool.query(
            `SELECT IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'voting_categories' AND COLUMN_NAME = 'noty_campaign_id'`,
            [process.env.DB_NAME || 'nyxar_db']
        )
        if (vcNotypNullable.length > 0 && vcNotypNullable[0].IS_NULLABLE === 'YES') {
            await pool.query(`ALTER TABLE voting_categories MODIFY noty_campaign_id INT NOT NULL`)
            console.log('✓ Migration: voting_categories.noty_campaign_id mis à NOT NULL')
            migrationsApplied++
        }

        // Migration: UNIQUE votes (user_id, category_id) → (user_id, category_id, noty_campaign_id)
        const [voteIndexes] = await pool.query(
            `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
             WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'votes' AND INDEX_NAME = 'unique_user_category'`,
            [process.env.DB_NAME || 'nyxar_db']
        )
        if (voteIndexes.length > 0) {
            // MySQL exige un index sur user_id seul avant de supprimer le composite (FK votes_ibfk_1)
            try { await pool.query(`ALTER TABLE votes ADD INDEX idx_votes_user (user_id)`) } catch {}
            await pool.query(`ALTER TABLE votes DROP INDEX unique_user_category`)
            await pool.query(`ALTER TABLE votes ADD UNIQUE KEY unique_user_category_campaign (user_id, category_id, noty_campaign_id)`)
            console.log('✓ Migration M2M: UNIQUE votes mis à jour (user_id, category_id, noty_campaign_id)')
            migrationsApplied++
        }

        // Migration: Ajouter waveform_data à custom_nominees
        const [waveformCol] = await pool.query(
            `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'custom_nominees' AND COLUMN_NAME = 'waveform_data'`,
            [process.env.DB_NAME || 'nyxar_db']
        )

        if (waveformCol.length === 0) {
            await pool.query(
                'ALTER TABLE custom_nominees ADD COLUMN waveform_data JSON AFTER media_url'
            )
            console.log('✓ Migration: Colonne waveform_data ajoutée à custom_nominees')
            migrationsApplied++
        }

        // Migration: Index sur colonnes FK très sollicitées (votes, custom_nominees, voting_categories_nominees)
        const indexesToAdd = [
            { table: 'votes', name: 'idx_votes_campaign', columns: 'noty_campaign_id' },
            { table: 'votes', name: 'idx_votes_category', columns: 'category_id' },
            { table: 'custom_nominees', name: 'idx_custom_nominees_category', columns: 'category_id' },
            { table: 'voting_categories_nominees', name: 'idx_vcn_category', columns: 'category_id' },
        ]
        for (const idx of indexesToAdd) {
            const [existing] = await pool.query(
                `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
                 WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ?`,
                [process.env.DB_NAME || 'nyxar_db', idx.table, idx.name]
            )
            if (existing.length === 0) {
                try {
                    await pool.query(`ALTER TABLE ${idx.table} ADD INDEX ${idx.name} (${idx.columns})`)
                    console.log(`✓ Migration: Index ${idx.name} ajouté sur ${idx.table}`)
                    migrationsApplied++
                } catch (err) {
                    console.log(`⚠ Index ${idx.name} ignoré: ${err.message}`)
                }
            }
        }

        // Migration: Ajouter mode à daily_words et mettre à jour la clé unique
        const [dailyWordsMode] = await pool.query(
            `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'daily_words' AND COLUMN_NAME = 'mode'`,
            [process.env.DB_NAME || 'nyxar_db']
        )
        if (dailyWordsMode.length === 0) {
            await pool.query(`ALTER TABLE daily_words ADD COLUMN mode ENUM('simple','serie') NOT NULL DEFAULT 'simple' AFTER word`)
            // Supprimer l'ancienne clé unique sur effective_date seule
            try {
                await pool.query(`ALTER TABLE daily_words DROP INDEX uniq_effective_date`)
            } catch {}
            // Nouvelle clé unique sur (effective_date, mode)
            await pool.query(`ALTER TABLE daily_words ADD UNIQUE KEY uq_daily_word (effective_date, mode)`)
            console.log('✓ Migration: Colonne mode + clé unique (effective_date, mode) ajoutées à daily_words')
            migrationsApplied++
        }

        // Migration: Soft delete des votes (is_deleted, deleted_at, deleted_by)
        const [votesIsDeletedCol] = await pool.query(
            `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'votes' AND COLUMN_NAME = 'is_deleted'`,
            [process.env.DB_NAME || 'nyxar_db']
        )
        if (votesIsDeletedCol.length === 0) {
            await pool.query(
                `ALTER TABLE votes
                 ADD COLUMN is_deleted TINYINT DEFAULT 0,
                 ADD COLUMN deleted_at TIMESTAMP NULL,
                 ADD COLUMN deleted_by INT NULL`
            )
            console.log('✓ Migration: Colonnes is_deleted/deleted_at/deleted_by ajoutées à votes')
            migrationsApplied++
        }

        return migrationsApplied
    } catch (error) {
        console.error('Erreur migration:', error.message)
        return 0
    }
}

// ============ PURGE ============

// Vider toutes les données (TRUNCATE)
export async function purgeAllData() {
    console.log('\n🗑️  Purge des données...')

    // Ordre inverse des dépendances pour éviter les erreurs de foreign key
    const tables = [
        'wordle_games',
        'wordle_stats',
        'daily_words',
        'mini_game_settings',
        'scores',
        'votes',
        'voting_categories_nominees',
        'custom_nominees',
        'line_up_players',
        'poste_nyxarien',
        'role_user',
        'voting_categories',
        'line_ups',
        'noty_campaign',
        'nyxariens',
        'poste',
        'skins',
        'resultats',
        'competitions',
        'sponsors',
        'hero_banners',
        'games',
        'role',
        'users'
    ]

    try {
        // Désactiver temporairement les foreign key checks
        await pool.query('SET FOREIGN_KEY_CHECKS = 0')

        for (const table of tables) {
            try {
                await pool.query(`TRUNCATE TABLE ${table}`)
                console.log(`✓ Table '${table}' vidée`)
            } catch (err) {
                // Table n'existe peut-être pas encore
                console.log(`⚠ Table '${table}' ignorée (n'existe pas)`)
            }
        }

        // Réactiver les foreign key checks
        await pool.query('SET FOREIGN_KEY_CHECKS = 1')

        console.log('✓ Toutes les données ont été supprimées\n')
    } catch (error) {
        await pool.query('SET FOREIGN_KEY_CHECKS = 1')
        console.error('Erreur purge données:', error)
        throw error
    }
}
