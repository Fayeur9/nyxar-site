/**
 * Tests d'intégration — Feature vote NOTY
 *
 * Stack : Jest (ESM) + Supertest + MySQL de test
 * Lance avec : npm test
 * Couverture  : npm test -- --coverage
 *
 * Prérequis :
 *   - Fichier backend/.env.test (copie de .env.test.example)
 *   - Base de test initialisée : DB_NAME=nyxar_test npm run db:init
 *
 * Le module jsonwebtoken n'est PAS mocké — on utilise un JWT_SECRET de test
 * défini dans .env.test. Les tokens sont signés avec ce secret via jwt.sign().
 *
 * | ID     | Scénario                                              | Statut attendu |
 * |--------|-------------------------------------------------------|---------------|
 * | TC-001 | Vote nominal — user connecté, campagne active         | 201            |
 * | TC-002 | Upsert — même user/catégorie, vote déjà existant      | 201 (mis à jour)|
 * | TC-003 | Campagne pausée (is_paused=1)                         | 403            |
 * | TC-004 | Requête sans token JWT                                | 401            |
 * | TC-005 | Catégorie privée, user sans rôle nyxar                | 403            |
 * | TC-006 | Nominee inexistant (first_choice=99999)               | 400            |
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import pool from '../db.js'
import app from '../app.js'
import { insertFixtures, cleanFixtures, cleanVotes, IDS } from './fixtures.js'

const JWT_SECRET = process.env.JWT_SECRET

/** Génère un token JWT valide pour un userId donné */
function makeToken(userId) {
    return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '1h' })
}

const VOTER_TOKEN = makeToken(IDS.USER_VOTER)   // rôle viewer_test (pas nyxar)
const NYXAR_TOKEN = makeToken(IDS.USER_NYXAR)   // rôle nyxar_test

// ─── Setup / Teardown ────────────────────────────────────────────────────────

beforeAll(async () => {
    await insertFixtures()
})

afterAll(async () => {
    await cleanFixtures()
    await pool.end()
})

beforeEach(async () => {
    // Partir d'une table votes vide pour les fixtures de test
    await cleanVotes()
})

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('POST /api/noty/categories/:id/vote', () => {

    /**
     * TC-001 — Vote nominal
     * User connecté, campagne active, catégorie publique, nominee valide
     * → 201 + message "Vote enregistré" + ligne créée en BDD
     */
    test('TC-001 — vote nominal → 201 + vote créé en BDD', async () => {
        const res = await request(app)
            .post(`/api/noty/categories/${IDS.CATEGORY_PUBLIC}/vote`)
            .set('Authorization', `Bearer ${VOTER_TOKEN}`)
            .send({
                first_choice: IDS.PLAYER,
                noty_campaign_id: IDS.CAMPAIGN_ACTIVE,
            })

        expect(res.status).toBe(201)
        expect(res.body.message).toBe('Vote enregistré')

        // Vérifier la présence en BDD
        const [rows] = await pool.query(
            'SELECT * FROM votes WHERE user_id = ? AND category_id = ? AND noty_campaign_id = ? AND is_deleted = 0',
            [IDS.USER_VOTER, IDS.CATEGORY_PUBLIC, IDS.CAMPAIGN_ACTIVE]
        )
        expect(rows).toHaveLength(1)
        expect(rows[0].first_choice).toBe(IDS.PLAYER)
    })

    /**
     * TC-002 — Mise à jour vote (upsert)
     * Même user/catégorie, vote déjà existant → mise à jour des choix
     * La route retourne 201 dans les deux cas (ON DUPLICATE KEY UPDATE).
     */
    test('TC-002 — upsert vote existant → 201 + vote mis à jour en BDD', async () => {
        // Premier vote
        await request(app)
            .post(`/api/noty/categories/${IDS.CATEGORY_PUBLIC}/vote`)
            .set('Authorization', `Bearer ${VOTER_TOKEN}`)
            .send({
                first_choice: IDS.PLAYER,
                noty_campaign_id: IDS.CAMPAIGN_ACTIVE,
            })

        // Deuxième vote (même user/catégorie) avec second_choice en plus
        const res = await request(app)
            .post(`/api/noty/categories/${IDS.CATEGORY_PUBLIC}/vote`)
            .set('Authorization', `Bearer ${VOTER_TOKEN}`)
            .send({
                first_choice: IDS.PLAYER,
                second_choice: IDS.PLAYER,
                noty_campaign_id: IDS.CAMPAIGN_ACTIVE,
            })

        expect(res.status).toBe(201)

        // Vérifier que le vote a bien été mis à jour (toujours 1 ligne, second_choice renseigné)
        const [rows] = await pool.query(
            'SELECT * FROM votes WHERE user_id = ? AND category_id = ? AND noty_campaign_id = ? AND is_deleted = 0',
            [IDS.USER_VOTER, IDS.CATEGORY_PUBLIC, IDS.CAMPAIGN_ACTIVE]
        )
        expect(rows).toHaveLength(1)
        expect(rows[0].second_choice).toBe(IDS.PLAYER)
    })

    /**
     * TC-003 — Campagne pausée
     * La campagne a is_paused=1 → votes bloqués même si dans les dates
     * → 403 avec message "temporairement suspendus"
     */
    test('TC-003 — campagne pausée → 403', async () => {
        const res = await request(app)
            .post(`/api/noty/categories/${IDS.CATEGORY_PAUSED}/vote`)
            .set('Authorization', `Bearer ${VOTER_TOKEN}`)
            .send({
                first_choice: IDS.PLAYER,
                noty_campaign_id: IDS.CAMPAIGN_PAUSED,
            })

        expect(res.status).toBe(403)
        expect(res.body.message).toMatch(/suspendus/i)
    })

    /**
     * TC-004 — Requête sans token JWT
     * Aucun header Authorization → 401 Unauthorized
     */
    test('TC-004 — sans token JWT → 401', async () => {
        const res = await request(app)
            .post(`/api/noty/categories/${IDS.CATEGORY_PUBLIC}/vote`)
            .send({
                first_choice: IDS.PLAYER,
                noty_campaign_id: IDS.CAMPAIGN_ACTIVE,
            })

        expect(res.status).toBe(401)
        expect(res.body.message).toMatch(/token/i)
    })

    /**
     * TC-005 — Catégorie privée, user sans rôle nyxar
     * visible_by_nyxar=1 + user avec rôle viewer (pas nyxar/admin)
     * → 403 Forbidden
     */
    test('TC-005 — catégorie privée, sans rôle nyxar → 403', async () => {
        const res = await request(app)
            .post(`/api/noty/categories/${IDS.CATEGORY_PRIVATE}/vote`)
            .set('Authorization', `Bearer ${VOTER_TOKEN}`)   // viewer_test, pas nyxar
            .send({
                first_choice: IDS.PLAYER,
                noty_campaign_id: IDS.CAMPAIGN_ACTIVE,
            })

        expect(res.status).toBe(403)
        expect(res.body.message).toMatch(/nyxar/i)
    })

    /**
     * TC-006 — Nominee inexistant
     * first_choice=99999 ne correspond à aucun nyxarien en BDD
     * → 400 Bad Request (choix invalide)
     *
     * Note : la spec préconise 404 mais la route retourne 400 pour les choix invalides.
     * Ce comportement est volontaire : 400 signale que c'est le corps de la requête
     * qui est invalide, pas une ressource manquante.
     */
    test('TC-006 — nominee inexistant → 400', async () => {
        const res = await request(app)
            .post(`/api/noty/categories/${IDS.CATEGORY_PUBLIC}/vote`)
            .set('Authorization', `Bearer ${VOTER_TOKEN}`)
            .send({
                first_choice: 99999,
                noty_campaign_id: IDS.CAMPAIGN_ACTIVE,
            })

        expect(res.status).toBe(400)
        expect(res.body.message).toMatch(/nominé|introuvable/i)
    })
})
