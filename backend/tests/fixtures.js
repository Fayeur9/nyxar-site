/**
 * Fixtures pour les tests d'intégration — vote NOTY
 *
 * Stratégie : IDs élevés (9000+) pour éviter tout conflit avec les données existantes.
 * Nettoyage explicite via cleanFixtures() dans afterAll.
 */
import pool from '../db.js'

export const IDS = {
    // Utilisateurs
    USER_VOTER: 9001,   // rôle viewer (viewSite) — peut voter dans les catégories publiques
    USER_NYXAR: 9002,   // rôle nyxar — peut voter dans les catégories privées

    // Rôles
    ROLE_VIEWER: 9001,  // name='viewer_test', permissions={viewSite:true}
    ROLE_NYXAR: 9002,   // name='nyxar_test', permissions={viewSite:true}

    // Campagnes
    CAMPAIGN_ACTIVE: 9001,  // active, non pausée, end_date=2099-12-31
    CAMPAIGN_PAUSED: 9002,  // active mais is_paused=1

    // Catégories
    CATEGORY_PUBLIC: 9001,   // visible_by_nyxar=0 → accessible à tous les membres
    CATEGORY_PRIVATE: 9002,  // visible_by_nyxar=1 → réservée aux nyxariens
    CATEGORY_PAUSED: 9003,   // liée à la campagne pausée

    // Nominés
    PLAYER: 9001,   // nyxarien valide (nominee_type='player')
}

export async function insertFixtures() {
    // Rôles
    await pool.query(
        `INSERT IGNORE INTO role (id, name, description, permissions)
         VALUES
           (?, 'viewer_test', 'Rôle de test — visiteur', '{"viewSite":true}'),
           (?, 'nyxar_test',  'Rôle de test — nyxarien', '{"viewSite":true}')`,
        [IDS.ROLE_VIEWER, IDS.ROLE_NYXAR]
    )

    // Utilisateurs (mot de passe factice, pas utilisé dans les tests)
    await pool.query(
        `INSERT IGNORE INTO users (id, username, email, password_hash)
         VALUES
           (?, 'test_voter', 'test_voter@test.local', '$2b$10$fakehashfortest'),
           (?, 'test_nyxar', 'test_nyxar@test.local', '$2b$10$fakehashfortest')`,
        [IDS.USER_VOTER, IDS.USER_NYXAR]
    )

    // Associations user ↔ rôle
    await pool.query(
        `INSERT IGNORE INTO role_user (user_id, role_id)
         VALUES (?, ?), (?, ?)`,
        [IDS.USER_VOTER, IDS.ROLE_VIEWER, IDS.USER_NYXAR, IDS.ROLE_NYXAR]
    )

    // Campagnes
    await pool.query(
        `INSERT IGNORE INTO noty_campaign (id, title, start_date, end_date, is_paused)
         VALUES
           (?, 'Campagne test active',  '2020-01-01', '2099-12-31', 0),
           (?, 'Campagne test pausée', '2020-01-01', '2099-12-31', 1)`,
        [IDS.CAMPAIGN_ACTIVE, IDS.CAMPAIGN_PAUSED]
    )

    // Catégories
    // visible_by_nyxar=0 → public, visible_by_nyxar=1 → réservé nyxar/admin
    await pool.query(
        `INSERT IGNORE INTO voting_categories
           (id, title, nominee_type, noty_campaign_id, visible_by_nyxar)
         VALUES
           (?, 'Catégorie publique test',  'player', ?, 0),
           (?, 'Catégorie privée test',    'player', ?, 1),
           (?, 'Catégorie pausée test',    'player', ?, 0)`,
        [
            IDS.CATEGORY_PUBLIC,  IDS.CAMPAIGN_ACTIVE,
            IDS.CATEGORY_PRIVATE, IDS.CAMPAIGN_ACTIVE,
            IDS.CATEGORY_PAUSED,  IDS.CAMPAIGN_PAUSED,
        ]
    )

    // Nominé joueur
    await pool.query(
        `INSERT IGNORE INTO nyxariens (id, pseudo)
         VALUES (?, 'TestPlayer9001')`,
        [IDS.PLAYER]
    )
}

export async function cleanFixtures() {
    // Suppression dans l'ordre inverse des dépendances FK
    await pool.query('DELETE FROM votes         WHERE user_id IN (?, ?)', [IDS.USER_VOTER, IDS.USER_NYXAR])
    await pool.query('DELETE FROM role_user     WHERE user_id IN (?, ?)', [IDS.USER_VOTER, IDS.USER_NYXAR])
    await pool.query('DELETE FROM voting_categories WHERE id IN (?, ?, ?)', [IDS.CATEGORY_PUBLIC, IDS.CATEGORY_PRIVATE, IDS.CATEGORY_PAUSED])
    await pool.query('DELETE FROM noty_campaign  WHERE id IN (?, ?)',        [IDS.CAMPAIGN_ACTIVE, IDS.CAMPAIGN_PAUSED])
    await pool.query('DELETE FROM nyxariens      WHERE id = ?',              [IDS.PLAYER])
    await pool.query('DELETE FROM users          WHERE id IN (?, ?)',        [IDS.USER_VOTER, IDS.USER_NYXAR])
    await pool.query('DELETE FROM role           WHERE id IN (?, ?)',        [IDS.ROLE_VIEWER, IDS.ROLE_NYXAR])
}

export async function cleanVotes() {
    await pool.query(
        'DELETE FROM votes WHERE user_id IN (?, ?)',
        [IDS.USER_VOTER, IDS.USER_NYXAR]
    )
}
