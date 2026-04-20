# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture

Monorepo avec deux parties distinctes :

- **`backend/`** : API REST Node.js/Express (port 5176), base de données MySQL via `mysql2`
- **`frontend/`** : SPA React 19 + Vite (port 5173), pas de framework CSS externe (CSS vanilla par composant)

En production, le backend sert aussi le build frontend (`backend/public/`). En dev, les deux tournent séparément.

## Commandes

### Développement (depuis la racine)
```bash
npm run dev          # Lance backend + frontend en parallèle
npm run dev:back     # Backend seul (node --watch)
npm run dev:front    # Frontend seul (vite)
```

### Frontend (depuis `frontend/`)
```bash
npm run build        # Build de production
npm run lint         # ESLint
npm run preview      # Preview du build
```

### Base de données (depuis la racine)
```bash
npm run db:init          # Créer les tables (si absentes)
npm run db:setup         # Insérer les données d'initialisation du site
npm run db:setup:test    # Insérer les données de test (à lancer après db:setup)
npm run db:reset         # Drop + Init tables + Seed init
npm run db:reset:full    # Drop + Init tables + Seed init + Seed test
npm run db:purge         # Vider toutes les données
npm run db:drop          # Supprimer la base de données
```

## Configuration

Le backend nécessite `backend/.env` (voir `backend/.env.example`) :
- `DB_HOST`, `DB_PORT` (3306), `DB_NAME`, `DB_USER`, `DB_PASSWORD` — MySQL
- `JWT_SECRET` — clé de signature JWT
- `PORT` (défaut 5176)
- `NODE_ENV` — `development` ou `production`

Le frontend détecte automatiquement l'URL de l'API :
- Dev : `http://<hostname>:5176`
- Prod : domaine courant
- Override : `VITE_API_URL` dans `frontend/.env`

## Structure backend

- `backend/server.js` — point d'entrée, monte toutes les routes sous `/api/`
- `backend/db.js` — pool MySQL (mysql2/promise)
- `backend/schema.js` — définitions des tables et migrations (ALTER TABLE via INFORMATION_SCHEMA)
- `backend/init.js` — initialisation des tables au démarrage (appelle schema.js)
- `backend/db-cli.js` — CLI base de données (init/setup/reset/purge/drop)
- `backend/seed-init.js` — données d'initialisation du site (users, joueurs, line-ups, NOTY 2025 officielle, skins, résultats, compétitions, sponsors, banners)
- `backend/seed-test.js` — données de développement (NOTY 2024 + 2026, votes simulés, custom nominees)
- `backend/routes/` — une route par domaine métier
- `backend/utils/` — utilitaires partagés (auth middleware, uploads, helpers NOTY)
- `backend/utils/noty-helpers.js` — helpers NOTY partagés : `logAdminAction`, `fetchCategoryResults`, cache Hall of Fame, `hasNyxarOrAdminAccess`

### Routes NOTY
Le module NOTY est découpé en 5 sous-routers montés sous `/api/noty` :
- `noty-campaigns.js` — CRUD campagnes, stats, export, audit-log
- `noty-categories.js` — CRUD catégories + nominés
- `noty-votes.js` — soumission, suppression, détails des votes
- `noty-stats.js` — hall-of-fame, live stats, progression
- `noty-cards.js` — génération, téléchargement, waveforms

Les uploads sont servis depuis `frontend/public/uploads/` en dev, `backend/public/uploads/` en prod.

## Structure frontend

- `frontend/src/App.jsx` — routeur principal, gestion des routes protégées via `PermissionRoute`
- `frontend/src/context/AuthContext.jsx` — état global auth (JWT dans localStorage), expose `user`, `token`, `hasPermission()`, `canViewSite`
- `frontend/src/context/NotyCampaignContext.jsx` — état global campagne NOTY active, expose : `currentActiveCampaign`, `hasActiveCampaign`, `hasPastCampaigns`, `votingOpen`, `resultsPhase`
- `frontend/src/services/api.js` — exporte `API_URL` (URL de base de l'API)
- `frontend/src/services/auth.js` — appels API d'authentification
- `frontend/src/hooks/useAdminCRUD.js` — hook générique CRUD pour les pages admin (fetch/create/update/delete/toggleActive + état UI)
- `frontend/src/hooks/useFetch.js` — hook générique fetch+loading+error pour les pages publiques (path, token, transform, deps)
- `frontend/src/utils/format.js` — utilitaires de formatage : `formatDateFr` (affichage FR), `formatDateForInput` (format `YYYY-MM-DD`)
- `frontend/src/pages/admin/` — pages d'administration (Gestion*)
- `frontend/src/pages/form/` — formulaires (Form*)
- `frontend/src/pages/Page*.jsx` — pages de consultation publiques
- `frontend/src/components/admin/` — composants réutilisables pour les tables/modaux admin
- `frontend/src/components/noty/` — composants spécifiques au système NOTY
- `frontend/src/components/players/PlayerCard.jsx` — carte joueur réutilisable (PageHome + PageTeams), gère le hover en interne

## Système d'authentification et permissions

JWT stocké en localStorage. Le middleware backend vérifie le token sur les routes protégées.

Trois permissions applicatives (stockées en base et normalisées dans `AuthContext`) :
- `viewSite` — accès au site (requis pour tout sauf login)
- `manageGames` — accès aux pages d'administration
- `adminFull` — accès complet (gestion des utilisateurs)

## Module NOTY

Système de vote/récompenses interne. Pages dédiées sous `/noty/*`. Contexte `NotyCampaignContext` gère l'état de la campagne active (phases : votes ouverts / résultats / inactif).

Composants spécifiques dans `frontend/src/components/noty/` :
- `CampaignDetailsModal.jsx` — détail/résultats d'une campagne (extrait de GestionNoty)
- `CampaignFormModal.jsx` — formulaire création/édition campagne avec upload et gestion de conflit
- `NotyProgressBar.jsx` — barre de progression des votes (voted/total)
- `VotingCategories/` — composants de vote par catégorie

GestionNoty utilise une machine d'état pour les modaux : `modal = null | { type: 'form'|'delete'|'details', ... }` (remplace 4 états indépendants).

Table `admin_audit_log` en base — `logAdminAction()` dans `noty-helpers.js` logge les actions critiques (création/modif/suppression campagne, génération cards, etc.).

## Patterns à respecter

- Tous les appels API du frontend passent par `API_URL` (jamais d'URL en dur)
- Les pages admin utilisent le hook `useAdminCRUD` pour éviter la duplication
- Les pages publiques utilisent `useFetch` pour le chargement de données (évite le pattern useState×3)
- Les requêtes authentifiées envoient le header `Authorization: Bearer <token>`
- Le CSS est colocalisé avec les composants (`.css` dans le même dossier ou `frontend/src/styles/`)
- Formatage des dates : `formatDateFr` pour l'affichage, `formatDateForInput` pour les `<input type="date">`
- Toutes les pages admin wrappent leur contenu dans `<AdminAccessGuard user={user}>` (contrôle d'accès)
- Les suppressions admin utilisent `<AdminConfirmDeleteModal>` (pattern standardisé)
- `AdminTable` gère la pagination en interne via `itemsPerPage` — ne pas re-implémenter dans les pages
- Pas de tests automatisés dans ce projet
