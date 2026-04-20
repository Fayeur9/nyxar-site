# Design System — NYXAR

Documentation des conventions visuelles et CSS du frontend.

## Principes

- **Thème sombre** — base `#0a0e1a`, accent indigo/violet/cyan
- **CSS vanilla** — pas de framework, variables CSS pour la cohérence
- **Composants responsables de leur style** — CSS colocalisé ou dans `src/styles/`
- **BEM-like** — `block__element--modifier` pour les composants complexes (NOTY, admin)

---

## Palette de couleurs

### Fonds
| Variable | Valeur | Usage |
|---|---|---|
| `--bg-primary` | `#0a0e1a` | Fond page |
| `--bg-secondary` | `#13182b` | Fond sections |
| `--bg-tertiary` | `#1a2035` | Fond inputs |
| `--bg-card` | `#1e2639` | Fond cartes |
| `--bg-card-hover` | `#252d42` | Hover cartes |

### Accents
| Variable | Valeur | Usage |
|---|---|---|
| `--accent-primary` | `#6366f1` | Indigo — CTA, focus, sélection |
| `--accent-secondary` | `#8b5cf6` | Violet — gradient fin |
| `--accent-tertiary` | `#06b6d4` | Cyan — badges, info |
| `--gradient-main` | `135deg, #6366f1 → #8b5cf6` | Boutons primaires |
| `--gradient-hover` | `135deg, #7c3aed → #a855f7` | Boutons hover |

### Texte
| Variable | Valeur | Usage |
|---|---|---|
| `--text-primary` | `#f1f5f9` | Corps, titres |
| `--text-secondary` | `#cbd5e1` | Sous-titres, labels |
| `--text-tertiary` | `#94a3b8` | Descriptions |
| `--text-muted` | `#64748b` | Placeholders, désactivé |

### États fonctionnels
| Variable | Valeur |
|---|---|
| `--color-success` | `#10b981` |
| `--color-warning` | `#f59e0b` |
| `--color-error` | `#ef4444` |
| `--color-info` | `#3b82f6` |

### Bordures
| Variable | Valeur |
|---|---|
| `--border-color` | `rgba(255, 255, 255, 0.08)` |
| `--border-hover` | `rgba(255, 255, 255, 0.15)` |

---

## Typographie

### Polices
- **Corps** : `system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`
- **Titres** : `'Inter', system-ui, sans-serif`
- **Accent large** : `Orbitron` (700, 900) — Google Fonts — titres héros et NOTY

### Échelle
| Élément | Desktop | 768px | 480px |
|---|---|---|---|
| `h1` | 2.5rem | 2rem | 1.5rem |
| `h2` | 2rem | 1.5rem | 1.2rem |
| `h3` | 1.4rem | 1.1rem | 1rem |
| Corps | 1rem | 0.95rem | 0.9rem |

### Propriétés globales
```css
body {
    line-height: 1.8;
    font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
}
h1–h4 { line-height: 1.2; font-weight: 600–800; }
```

---

## Espacements

Système basé sur des multiples de `0.25rem` (= 4px) :

| Variable | Valeur |
|---|---|
| `--spacing-xs` | `0.25rem` (4px) |
| `--spacing-sm` | `0.5rem` (8px) |
| `--spacing-md` | `1rem` (16px) |
| `--spacing-lg` | `1.5rem` (24px) |
| `--spacing-xl` | `2rem` (32px) |
| `--spacing-2xl` | `3rem` (48px) |

---

## Rayons de bordure

| Variable | Valeur | Usage |
|---|---|---|
| `--radius-sm` | `6px` | Inputs, badges |
| `--radius-md` | `10px` | Boutons, cartes |
| `--radius-lg` | `14px` | Modals, panels |
| `--radius-xl` | `20px` | Surfaces hero |
| `--radius-full` | `9999px` | Pills, avatars ronds |

---

## Ombres

| Variable | Usage |
|---|---|
| `--shadow-lg` | Élévation cartes |
| `--shadow-glow` | `0 0 20px rgba(99, 102, 241, 0.3)` — état normal |
| `--shadow-glow-hover` | `0 0 30px rgba(99, 102, 241, 0.5)` — hover |

---

## Transitions

| Variable | Valeur | Usage |
|---|---|---|
| `--transition-fast` | `150ms cubic-bezier(0.4, 0, 0.2, 1)` | Hover couleur |
| `--transition-base` | `250ms cubic-bezier(0.4, 0, 0.2, 1)` | Cartes, boutons |
| `--transition-slow` | `350ms cubic-bezier(0.4, 0, 0.2, 1)` | Modals, slides |

---

## Layout

### Conteneurs
| Classe | Max-width | Usage |
|---|---|---|
| `.page-container` | 1400px | Pages publiques, padding `3rem 2rem` |
| `.container` | 1400px | Générique |
| `.container--sm` | 900px | Formulaires, contenu étroit |
| `.container--lg` | 1600px | Dashboard large |

### Utilitaires Flexbox
```css
.flex-center   { display: flex; align-items: center; justify-content: center; }
.flex-between  { display: flex; align-items: center; justify-content: space-between; }
.flex-col      { display: flex; flex-direction: column; }
.flex-end      { display: flex; gap: 0.75rem; align-items: center; margin-left: auto; }
```

### Grilles
```css
.grid-auto-fill { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); }
.grid-2-col     { display: grid; grid-template-columns: repeat(2, 1fr); }
.grid-3-col     { display: grid; grid-template-columns: repeat(3, 1fr); }
.grid-4-col     { display: grid; grid-template-columns: repeat(4, 1fr); }
```

### Breakpoints
| Seuil | Comportement |
|---|---|
| `1300px` | Navbar bascule en burger menu |
| `1200px` | Grilles NOTY 4→3 colonnes |
| `1024px` | Compétitions 2→1 colonne |
| `768px` | Toutes les grilles → 1 colonne, padding réduit |
| `480px` | Typographie minimale, spacing réduit |

---

## Animations

### Keyframes disponibles
| Animation | Effet |
|---|---|
| `fadeIn` | opacity 0→1 + translateY(10px→0) |
| `slideIn` | opacity 0→1 + translateX(-20px→0) |
| `fadeInUp` | opacity 0→1 + translateY(20px→0) |
| `scaleIn` | opacity 0→1 + scale(0.9→1) |
| `modalSlideIn` | opacity 0→1 + translateY(-50px) + scale(0.9→1) |
| `pulse` | opacity 1↔0.5 (badge, urgence) |
| `spin` | rotate(360deg) (spinner) |
| `dropdownFadeIn` | opacity 0→1 + translateY(-10px→0) |

### Classes utilitaires
```css
.animate-fade-in      { animation: fadeIn 0.5s ease-out; }
.animate-slide-in     { animation: slideIn 0.5s ease-out; }
.animate-fade-in-left { animation: fadeInLeft 0.5s ease-out; }
.animate-fade-in-right{ animation: fadeInRight 0.5s ease-out; }
.animate-scale-in     { animation: scaleIn 0.3s ease-out; }
```

---

## Composants

### Boutons

Classe de base `.btn` + modificateur :

| Classe | Rendu |
|---|---|
| `.btn-primary` / `.btn-submit` / `.btn-add` | Gradient accent (indigo→violet) |
| `.btn-secondary` / `.btn-cancel` | Fond semi-transparent |
| `.btn-success` | Gradient vert |
| `.btn-delete` | Gradient rouge |
| `.btn-ghost` | Transparent, hover overlay |
| `.btn-vote` | Gradient + glow |
| `.btn-icon-round` | Cercle 36px |

Variantes taille : `.btn-sm` (padding `0.5rem 1rem`), `.btn-lg` (padding `0.875rem 1.75rem`)

Hover : `translateY(-2px)` + shadow glow
Disabled : `opacity: 0.6; cursor: not-allowed; transform: none`

### Cartes
| Classe | Usage |
|---|---|
| `.card` | Carte standard, hover translateY(-2px) |
| `.card-glass` | Glassmorphism — `blur(12px)` |
| `.card--elevated` | Ombre plus marquée |
| `.card--flat` | Sans ombre |
| `.card--compact` | Padding réduit |

### Modals (`.modal-overlay` + `.modal-content`)

Tailles de `.modal-content` : `-sm` (400px), `-md` (500px), `-lg` (700px), `-xl` (900px)

Animation : `modalSlideIn 0.3s` à l'ouverture
Fermeture : `.modal-close:hover { transform: rotate(90deg) }`

### Formulaires

| Classe | Usage |
|---|---|
| `.f-field` | Conteneur flex-col, gap sm |
| Input focus | `border-color: accent-primary; box-shadow: 0 0 0 3px rgba(accent, 0.1)` |
| `.is-selected` | Bordure + bg accent light (nominees, options) |
| `.c-form-image-upload` | Zone drag-drop avec bordure dashed |

### Badges
```css
.badge           { padding: 0.25rem 0.75rem; border-radius: var(--radius-full); }
.badge-primary   /* Indigo */
.badge-success   /* Vert */
.badge-warning   /* Amber */
.badge-error     /* Rouge */
```

---

## Glassmorphism

Pattern utilisé sur les surfaces flottantes (cartes hero, overlays) :

```css
.card-glass {
    background: rgba(30, 38, 57, 0.7);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid var(--border-color);
}
```

---

## Conventions de nommage

| Contexte | Convention | Exemple |
|---|---|---|
| Composants NOTY | BEM strict | `.noty-card__image`, `.noty-card--voted` |
| Admin | BEM avec préfixes | `.c-admin-panel`, `.l-admin-page`, `.f-field` |
| Utilitaires | Descriptif fonctionnel | `.flex-center`, `.grid-3-col`, `.animate-fade-in` |
| États | Préfixe `.is-` ou modificateur `--` | `.is-active`, `.is-selected`, `.--dimmed` |
| Sections page | Sémantique | `.section`, `.section-title`, `.section-header` |

---

## Z-index

| Variable | Valeur | Usage |
|---|---|---|
| `--z-dropdown` | `1000` | Menus déroulants |
| `--z-sticky` | `1020` | Headers sticky |
| `--z-fixed` | `1030` | Navbar |
| `--z-modal-backdrop` | `1040` | Fond modal |
| `--z-modal` | `1050` | Contenu modal |
| `--z-popover` | `1060` | Popover |
| `--z-tooltip` | `1070` | Tooltip |

---

## Structure CSS

```
frontend/src/styles/
├── global.css            # Import de tous les styles globaux
├── variables.css          # Tokens CSS (:root)
├── typography.css         # h1-h4, corps, liens
├── layout.css             # .page-container, sections
├── layout-utilities.css   # .flex-*, .grid-*
├── cards.css              # .card, .card-glass, variantes
├── buttons.css            # .btn-*
├── landing.css            # Spécifique page d'accueil
├── animation.css          # @keyframes + .animate-*
├── form/
│   └── forms.css          # .f-field, inputs, .c-form-*
├── pages/
│   ├── admin.css          # .c-admin-*, .l-admin-*
│   ├── NotyPage.css       # Système NOTY complet (~1300 lignes)
│   └── ...
└── components/
    ├── modals.css          # .modal-overlay, .modal-content
    ├── VotingResults.css  # Podium, résultats
    └── ...

# CSS colocalisé (dans le dossier du composant)
frontend/src/components/global/Navbar.css
frontend/src/components/noty/VotingCategories/VotingCategories.css
frontend/src/components/games/HeroBanner.css
...
```

---

## Accessibilité

```css
/* Focus visible */
:focus-visible {
    outline: 2px solid var(--accent-primary);
    outline-offset: 2px;
}

/* Sélection texte */
::selection {
    background-color: var(--accent-primary);
    color: white;
}

/* Scrollbar discrète */
html { scrollbar-width: thin; scrollbar-color: var(--bg-card) transparent; }
```

---

## Patterns spéciaux

### Text clamp multi-ligne
```css
.truncate-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}
```

### Cartes NOTY media (aspect-ratio)
```css
.noty-card          { aspect-ratio: 3/4; }   /* Portrait */
.noty-card--url,
.noty-card--video   { aspect-ratio: 16/9; }  /* Paysage */
.noty-card--image   { aspect-ratio: 1; }     /* Carré */
```

### Feedback messages
```css
.error-message   { background: rgba(239, 68, 68, 0.1); border-left: 4px solid var(--color-error); }
.success-message { background: rgba(16, 185, 129, 0.1); border-left: 4px solid var(--color-success); }
.warning-message { background: rgba(245, 158, 11, 0.08); border-left: 4px solid var(--color-warning); }
```
