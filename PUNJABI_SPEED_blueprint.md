# PUNJABI SPEED — Project Blueprint
> Document de référence pour Claude Code · v2.0 · Mis à jour 2026-06-26

---

## 1. Contexte et contraintes matérielles

### Plateforme cible
- **Appareil** : Radio aftermarket Android (ex. Hyundai Accent 2012)
- **OS** : Android natif (pas Android Auto)
- **RAM** : 2 Go
- **Écran** : Touchscreen intégré, résolution cible **1280×720** (fallback 1024×600)
- **Entrée** : Écran tactile + manette USB (standard HID, ex. Xbox filaire)
- **Distribution** : `index.html` + `menu-music.mp3` sur clé USB, chargé via WebView Android

### Contraintes techniques absolues
- **Un seul fichier HTML** — zéro dépendance externe, zéro réseau requis au runtime
- **Pas d'assets externes** — visuels générés en Canvas 2D / pixel art procédural en JS (exception : `menu-music.mp3` co-localisé)
- **Pas de WebGL** — Canvas 2D uniquement (compatibilité maximale, perf prévisible)
- **Cible 30 fps stable** — priorité à la stabilité sur matériel faible
- **Taille** : `index.html` ≈ 106 Ko · `menu-music.mp3` ≈ 2.1 Mo
- **Pas de localStorage** — scores en mémoire session uniquement
- **Gamepad API** (`navigator.getGamepads()`) pour la manette USB
- JS pur — aucune librairie externe

### Fichiers à mettre sur la clé USB
```
/
├── index.html          (106 Ko — jeu complet)
└── menu-music.mp3      (2.1 Mo — Notize - Density Wave)
```

---

## 2. Nom et identité

- **Nom du jeu** : PUNJABI SPEED
- **Sous-titre** : MOREL × NAGPAL RACING
- **Circuits** : HOCHELAGA · KITCHENER · ÎLE NOTRE-DAME
- **Contexte personnel** :
  - Alexis Morel (Montréal) + famille Nagpal (Kitchener, Ontario, origine Inde)
  - Les circuits et personnages reflètent leurs vies
- **Favicon** : SVG inline — lettre "P" rouge (`#E24B4A`) en Courier New bold sur fond noir

---

## 3. Architecture du fichier `index.html`

```
index.html
├── <head>
│   ├── <title>PUNJABI SPEED</title>
│   ├── <link rel="icon"> SVG inline (lettre P rouge)
│   └── <style> CSS inline complet
├── <body>
│   ├── #stage → #frame (conteneur 16:9 centré)
│   │   ├── Écrans UI (divs)
│   │   │   ├── #screen-title       Titre + sélection 1J/2J
│   │   │   ├── #screen-select      Sélection de personnage
│   │   │   ├── #screen-diff        Paramètres de course (diff/tours/CC)
│   │   │   ├── #screen-track       Sélection de circuit (minimap)
│   │   │   ├── #screen-settings    Volume musique + SFX
│   │   │   ├── #screen-stats       Statistiques de session
│   │   │   ├── #screen-result      Résultats de course
│   │   │   └── #screen-pause       Menu pause
│   │   ├── #game-canvas            Canvas principal Mode 7
│   │   ├── #hud                    HUD overlay (tour / temps / vitesse / position)
│   │   ├── #notif-el               Notifications items (centre écran)
│   │   ├── #star-fx                Overlay étoile (invincibilité)
│   │   ├── #bridge-hud             Alerte pont (Kitchener)
│   │   ├── #wrong-way              Alerte mauvais sens
│   │   ├── Boutons tactiles        ◀ ▶ USE B A (in-game)
│   │   ├── #ingame-menu-btn        ⌂ bouton pause (top-right in-game)
│   │   ├── #top-bar                ⌂ home + EN/FR (hors jeu)
│   │   └── <audio id="menu-music"> Musique menu (src=menu-music.mp3)
│   └── <script>
│       ├── CONSTANTS               WORLD, TEX, TARGET_DT, etc.
│       ├── GLOBAL STATE            difficulty, selectedLaps, selectedCC
│       ├── TEXTURES                texColor Uint32Array (512×512)
│       ├── KART SPRITES            KART8, KART12 (tableaux pixel art)
│       ├── CHARACTERS              4 personnages jouables/IA
│       ├── ITEM_INFO               6 types d'items
│       ├── ICON SYSTEM             _buildPixelEmoji, drawPixelIcon
│       ├── TRACKS                  3 circuits (Catmull-Rom splines)
│       ├── AUDIO                   Web Audio API + menu-music.mp3
│       ├── INPUT                   Clavier / tactile / gamepad
│       ├── MODE 7                  Moteur rendu sol pseudo-3D
│       ├── BILLBOARDS              Sprites 3D (karts, items, décors)
│       ├── PHYSICS                 updatePlayer, updateAI, collisions
│       ├── ITEMS                   Boîtes, projectiles, bananes
│       ├── HUD                     drawHUD, minimap, timer
│       ├── I18N                    T(key), STRINGS.fr/en
│       ├── SCREENS                 showScreen, initDiffSelect, etc.
│       └── GAME LOOP               startRace, loop (rAF)
```

---

## 4. États de jeu (STATE machine)

```
TITLE(0) → SELECT(1) → DIFF_SELECT(9) → TRACK_SELECT(2) → COUNTDOWN(3) → RACING(4)
                                                                              ↓
                                                                          PAUSE(6)
                                                                              ↓
                                                                          RESULT(5) → TITLE
                                                                              ↓
                                                                          STATS(7) / SETTINGS(8)
```

| État | Valeur | Écran |
|------|--------|-------|
| TITLE | 0 | Logo + 1J/2J + JOUER |
| SELECT | 1 | Sélection personnage |
| TRACK_SELECT | 2 | Sélection circuit avec minimap |
| COUNTDOWN | 3 | 3 - 2 - 1 - GO! |
| RACING | 4 | Jeu (Mode 7 + HUD) |
| RESULT | 5 | Résultats de course |
| PAUSE | 6 | Menu pause (Reprendre / Recommencer / Menu) |
| STATS | 7 | Statistiques de session |
| SETTINGS | 8 | Volume musique + SFX |
| DIFF_SELECT | 9 | Paramètres de course |

---

## 5. Personnages

4 personnages — jouables en 1J ou 2J, le reste devient IA.

| ID | Nom | Couleur | Vitesse | Accél | Maniab | Style IA |
|----|-----|---------|---------|-------|--------|----------|
| 0 | MR BOOGERMAN | `#9B59B6` violet | 10/10 | 6/10 | 5/10 | Agressif |
| 1 | HANUMAN | `#E67E22` orange | 8/10 | 10/10 | 7/10 | Régulier |
| 2 | BABYPIE | `#FF6B9D` rose | 6/10 | 8/10 | 10/10 | Technique |
| 3 | ASHI | `#00BCD4` cyan | 7/10 | 8/10 | 8/10 | Équilibré |

Sprites : tableaux pixel art `KART8` (8×8) et `KART12` (12×12), dessinés avec `ctx.fillRect()`.

---

## 6. Paramètres de course (écran DIFF_SELECT)

Trois sélecteurs indépendants, persistants jusqu'à la fin de la session :

### Difficulté
| Valeur | Label | Effet |
|--------|-------|-------|
| 0 | FACILE | IA lente, items fréquents |
| 1 | NORMAL (défaut) | Équilibré |
| 2 | DIFFICILE | IA agressive |

### Nombre de tours
Options : **1 / 3 (défaut) / 5**

### CC (cylindrée)
| CC | Multiplicateur vitesse |
|----|----------------------|
| 50 | × 0.65 |
| 100 (défaut) | × 1.00 |
| 150 | × 1.35 |

Appliqué à `topSpeed` et `acceleration` de tous les karts au lancement de la course.

---

## 7. Circuits (3 tracks)

Tous définis par des **splines Catmull-Rom** sur une grille monde 1000×1000. Texture sol : `Uint32Array` 512×512 (`TEX_SCALE = 0.512`). Points de contrôle gardés à ≥ 70 unités des bords du monde.

### HOCHELAGA — Montréal, Québec
- 11 points de contrôle
- Grande ligne droite (~625 unités)
- Épingle serrée côté ouest (virage droit)
- Chicane en S (virage droit puis gauche)
- Couleur preview : `#E24B4A` (rouge)

### KITCHENER — Ontario, Canada
- Circuit ovale avec épingle
- Zone spéciale : **PONT** (alerte `#bridge-hud`)
- Couleur preview : `#1D9E75` (vert)

### ÎLE NOTRE-DAME — Montréal, Québec
- Inspiration Circuit Gilles-Villeneuve
- Couleur preview : `#378ADD` (bleu)

---

## 8. Système d'items

6 types d'items. Récupérés sur des boîtes `?` placées sur la piste. Affichage en icônes emoji pixelisées (nearest-neighbor scaling).

| Clé | Emoji | Type | Effet |
|-----|-------|------|-------|
| FUSIL | 🔫 | Projectile avant | Rapide, tir direct |
| COUTEAU | 🔪 | Projectile avant | Moyen, rebondit |
| POULET | 🐔 | Projectile avant | Lent, rebondit longtemps |
| BANANE | 🍌 | Posé derrière | Glisse les adversaires |
| TURBO | ⚡ | Effet immédiat | Boost de vitesse |
| ETOILE | ⭐ | Effet temporaire | Invincibilité + écrase les adversaires |

### Système d'icônes pixelisées (`_buildPixelEmoji`)
1. Rend l'emoji à petite taille (`srcPx ≈ sz/4`)
2. Scale up en `imageSmoothingEnabled=false` → pixels carrés visibles
3. Utilisé partout de façon cohérente : inventaire HUD, icône centre-écran, rendu 3D sur piste

### Comportement ÉTOILE
Kart invincible pendant `starTime > 0` :
- Perce à travers les autres karts
- Étourdit (`stunKart`) toute victime touchée
- Le timer continue même pendant un stun

---

## 9. Moteur de rendu Mode 7

Projection pseudo-3D sol vu de derrière le kart (floor-casting).

```
Pour chaque ligne horizontale sous l'horizon :
  1. Calculer distance caméra
  2. Projeter en coordonnées monde (raycasting horizontal)
  3. Lire texColor[ty*512 + tx] → couleur (route, herbe, bordure)
  4. Écrire dans imageData
→ putImageData() unique par frame
```

Variables clés :
- `_vpY0`, `_vpH` : position et hauteur du viewport (split-screen)
- `WORLD=1000`, `TEX=512`, `TEX_SCALE=0.512`
- `texColor` : Uint32Array 512×512 généré à `setupTrack()`

### Split-screen 2 joueurs
- Deux viewports de 175px de haut chacun
- `drawBillboardsClipped()` par viewport
- Un seul `putImageData` par frame

---

## 10. Physique

### Joueur
```js
// Steering proportionnel à la vitesse (plus précis lentement)
steerStrength = handling * (1 - speed/topSpeed * 0.4)
// Hors piste : pénalité offTrackPenalty (0.52–0.68 selon perso)
// Friction différente sur/hors piste
```

### Collisions kart-à-kart
- `minD = 9` unités (boîte physique réduite)
- Si un kart a `starTime > 0` : pousse et étourdit la victime, kart étoile non affecté
- Deux étoiles simultanés : repoussement symétrique
- Projectiles : rayon de détection `< 16` unités (plus généreux)

### Classement (`computePlace`)
```js
score = finished ? (1e9 - finishTime) : (laps + u) * 1000
// place = nombre de karts avec score supérieur + 1
```

---

## 11. Audio

### Musique menu
- Fichier : `menu-music.mp3` (Notize - Density Wave, 2.1 Mo)
- Chargé via `<audio id="menu-music">`
- Pause automatique quand l'onglet/app passe en arrière-plan (`visibilitychange`)
- Reprend à la mise au premier plan

### Effets sonores (Web Audio API — procédural)
- Moteur : oscillateur sawtooth, fréquence proportionnelle à la vitesse
- SFX : `AUDIO.beep(freq, dur, vol, x, y)` avec atténuation par distance :
  ```js
  dmul = 1 / (1 + (d/160)²)   // coupé si dmul < 0.04
  ```
- Contrôle volume indépendant : `sfxVolume` (slider Settings)

---

## 12. Internationalisation (i18n)

Deux langues : **FR** (défaut) et **EN**. Basculement via bouton `#lang-btn` (top-right).

```js
T(key)  // retourne STRINGS[lang][key]
// Attribut HTML : data-i18n="key" → mis à jour par applyI18n()
```

Toutes les chaînes UI sont traduites : menus, HUD, notifications, descriptions.

---

## 13. Système d'input

```
Clavier   : ← → (direction) · ↑ (gaz) · ↓ (frein) · Shift (item)
Manette   : Gamepad API — axes[0] steer, RT gaz, LT frein, A item
Tactile   : Boutons ◀ ▶ (direction) · A (gaz) · B (frein) · USE (item)
```

Multi-touch supporté. Boutons tactiles larges (min 80×80px) pour usage en voiture.

---

## 14. HUD en jeu

Barre semi-transparente en haut :

| Zone | Contenu |
|------|---------|
| Gauche | `LAP 2/3` |
| Centre | Chronomètre `1:23.45` |
| Centre-droite | `128 km/h` |
| Droite | Position `2e` |

- Flash jaune au passage de tour
- Minimap (coin bas-droit) : circuit avec position des karts
- Bouton `⌂` (top-right in-game) → ouvre le menu PAUSE

---

## 15. Performances

| Technique | Détail |
|-----------|--------|
| `dt` normalisé | `Math.min(delta/TARGET_DT, 3)` |
| `putImageData` unique | Tous les pixels Mode 7 en un seul appel |
| `imageSmoothingEnabled=false` | Upscaling nearest-neighbor pour sprites |
| Pas de garbage loop | Réutilisation des objets, pas d'allocations dans la game loop |
| Canvas résolution native | Pas d'upscaling CSS (1:1 pixel) |

---

## 16. Déploiement — Clé USB / WebView Android

### Prérequis
- Une app WebView Android capable de charger des fichiers locaux (`file://`)
- La WebView doit autoriser les médias audio (pour `menu-music.mp3`)

### Structure de la clé USB
```
/
├── index.html          (jeu complet)
└── menu-music.mp3      (musique menu)
```

### Résolution
- Le jeu s'adapte à tout ratio 16:9 via CSS (`max-width:177.78vh`)
- Cible principale : **1280×720**
- Boutons tactiles positionnés pour usage au volant (bas d'écran, larges)

---

## 17. Ce qui reste hors scope

- Sauvegarde des scores (pas de localStorage)
- Multijoueur réseau
- Ghost / mode chrono
- Circuits supplémentaires (au-delà des 3 existants)
- Personnalisation de kart (couleurs, etc.)
- Mode plein écran forcé (géré par l'APK WebView)
- PWA / service worker (pas nécessaire si chargé depuis clé USB)
