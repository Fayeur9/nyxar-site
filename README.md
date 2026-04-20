# NYXAR — Plateforme E-sport

Plateforme web de la team NYXAR : gestion des joueurs, line-ups, compétitions, résultats et système de vote NOTY Awards.

## Stack

- **Backend** : Node.js + Express, MySQL via `mysql2/promise`, JWT, bcryptjs
- **Frontend** : React 19 + Vite, CSS vanilla (pas de framework CSS)
- En production, le backend sert aussi le build frontend (`backend/public/`)

## Prérequis

- Node.js v18+
- MySQL 8+

## Installation

```bash
# Installe toutes les dépendances (racine + frontend + backend)
npm run install:all
```

## Configuration

Créer `backend/.env` (voir `backend/.env.example`) :

```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=nyxar_db
DB_USER=votre_user
DB_PASSWORD=votre_password
JWT_SECRET=votre_clé_secrète_jwt
PORT=5176
NODE_ENV=development

# Mots de passe des comptes spéciaux (seed)
SEED_ADMIN_PASSWORD=admin25
SEED_NYXAR_PASSWORD=nyxar25
SEED_USER_PASSWORD=user25
```

Pour forcer l'URL de l'API en frontend, créer `frontend/.env` :
```env
VITE_API_URL=https://votre-domaine.com
```

## Lancer le projet

```bash
# Dev (backend + frontend en parallèle)
npm run dev

# Backend seul  →  http://localhost:5176
npm run dev:back

# Frontend seul →  http://localhost:5173
npm run dev:front
```

## Base de données

```bash
# Créer les tables
npm run db:init

# Initialiser avec les données du site (joueurs, NOTY 2025 officielle, compétitions...)
npm run db:setup

# Ajouter les données de test (NOTY 2024 + 2026, votes simulés)
npm run db:setup:test

# Reset complet → tables + données init
npm run db:reset

# Reset complet → tables + données init + données test
npm run db:reset:full

# Vider les données (sans supprimer les tables)
npm run db:purge

# Supprimer la base de données
npm run db:drop
```

### Différence init vs test

| `db:setup` (seed-init) | `db:setup:test` (seed-test) |
|---|---|
| Comptes joueurs réels | Campagne NOTY 2024 (votes manuels) |
| Joueurs, line-ups, postes | Campagne NOTY 2026 (votes simulés) |
| Campagne NOTY 2025 (résultats officiels CSV) | Custom nominees fictifs (clips, sons, maps) |
| Skins, résultats, compétitions | |
| Sponsors, hero banners | |

## Structure du projet

```
nyxar-site/
├── backend/
│   ├── server.js          # Point d'entrée Express
│   ├── db.js              # Pool MySQL
│   ├── schema.js          # Création tables + migrations
│   ├── init.js            # Init DB au démarrage du serveur
│   ├── db-cli.js          # CLI base de données
│   ├── seed-init.js       # Données d'initialisation
│   ├── seed-test.js       # Données de test/développement
│   ├── routes/            # Une route par domaine métier
│   │   ├── auth.js
│   │   ├── noty-campaigns.js
│   │   ├── noty-categories.js
│   │   ├── noty-votes.js
│   │   ├── noty-stats.js
│   │   ├── noty-cards.js
│   │   └── ...
│   └── utils/
│       ├── auth.js        # Middlewares JWT
│       ├── noty-helpers.js
│       └── ...
└── frontend/
    └── src/
        ├── App.jsx        # Routeur principal
        ├── context/       # AuthContext, NotyCampaignContext
        ├── hooks/         # useAdminCRUD, useFetch, useDeferredUpload...
        ├── pages/         # Pages publiques + admin
        ├── components/    # Composants réutilisables
        ├── services/      # api.js, auth.js
        └── utils/         # format.js
```

## Variables d'environnement

| Variable | Description | Défaut |
|---|---|---|
| `DB_HOST` | Host MySQL | `localhost` |
| `DB_PORT` | Port MySQL | `3306` |
| `DB_NAME` | Nom de la base | `nyxar_db` |
| `DB_USER` | Utilisateur MySQL | — |
| `DB_PASSWORD` | Mot de passe MySQL | — |
| `JWT_SECRET` | Clé de signature JWT | — |
| `PORT` | Port du backend | `5176` |
| `NODE_ENV` | Environnement | `development` |
| `ALLOWED_ORIGINS` | CORS whitelist (virgules) | — |
| `SEED_ADMIN_PASSWORD` | Mot de passe compte admin | `admin25` |
| `SEED_NYXAR_PASSWORD` | Mot de passe compte nyxar | `nyxar25` |
| `SEED_USER_PASSWORD` | Mot de passe compte user | `user25` |

## Module NOTY

Système de vote et récompenses annuelles. Accessible sous `/noty/*`.

Phases gérées par `NotyCampaignContext` :
- **Votes ouverts** — les nyxariens votent pour leurs catégories
- **Phase résultats** — les résultats sont visibles, votes fermés
- **Inactif** — aucune campagne active

Les routes backend sont découpées en 5 fichiers sous `/api/noty` : campagnes, catégories, votes, stats, cards.
