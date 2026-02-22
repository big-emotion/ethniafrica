# EthnAfrica — Design System v1.0

## Variante C « Carte vivante » · Février 2026

---

## Fichiers du système

| Fichier                  | Rôle                                                         |
| ------------------------ | ------------------------------------------------------------ |
| `design-tokens.css`      | Variables CSS centralisées (couleurs, typo, spacing, rayons) |
| `component-catalog.html` | Storybook visuel : chaque composant dans tous ses variants   |
| `DESIGN-SYSTEM.md`       | Ce document : règles, variants, logique conditionnelle       |

---

## Palette sémantique

| Token          | Hex       | Usage                                                   |
| -------------- | --------- | ------------------------------------------------------- |
| `--gold`       | `#B8860B` | Royaumes, précolonial, tradition, étymologie autochtone |
| `--green`      | `#2B6B42` | Souveraineté, indépendance, langues officielles         |
| `--terracotta` | `#C2532A` | Accent chaud, données démographiques, révolution        |
| `--earth`      | `#8B6B47` | Culture, sources, neutre chaud                          |
| `--colonial`   | `#9B3030` | Colonisation, termes péjoratifs, noms coloniaux barrés  |

**Règle décoloniale** : tout nom colonial utilise `--colonial` + `text-decoration: line-through`. Jamais de couleur neutre pour un nom colonial.

---

## Composants (10)

### 1. HeroCard `OBLIGATOIRE`

Carte d'identité du pays en haut de page.

**Contenu** : Lien retour région · ISO badge · Année badge · Drapeau (emoji 48px) · Nom du pays (Fraunces 34px black) · Nom officiel · Bloc meaning

**Bloc meaning — logique conditionnelle** :

- Étymologie connue → quote + langues
- Étymologie incertaine → quote avec `?` + tag `⚠ Étymologie débattue`

---

### 2. EtymologyBlock `OBLIGATOIRE` · 3 variants

| Variant                | Classe            | Quand l'utiliser                  | Exemples                   |
| ---------------------- | ----------------- | --------------------------------- | -------------------------- |
| **A — Split bilingue** | `.etym-split`     | Nom composé de 2+ langues/racines | Burkina Faso, Sierra Leone |
| **B — Mot unique**     | `.etym-single`    | Nom issu d'un seul mot/lieu       | Togo, Mali, Ghana          |
| **C — Incertain**      | `.etym-uncertain` | Origine débattue, hypothèses      | Djibouti                   |

**Variant A** : 2 colonnes égales, fond gold-bg | green-bg, mots en gros (28px), langue en micro-caps, définition en 14px.

**Variant B** : Bloc centré unique, fond gold-bg, bordure solid. Champ optionnel `.etym-note` (italique, contexte).

**Variant C** : Bordure **dashed** (signal visuel « incertain »), fond bg-warm. Liste de `.etym-hypothesis-tag` numérotées.

---

### 3. OriginBanner `OBLIGATOIRE` · 3 tonalités

| Tonalité       | Classes                      | Quand l'utiliser                      | Exemples               |
| -------------- | ---------------------------- | ------------------------------------- | ---------------------- |
| **Révolution** | `.origin-banner--revolution` | Nom choisi par un leader/révolution   | Burkina Faso (Sankara) |
| **Colonial**   | `.origin-banner--colonial`   | Nom créé par un colonisateur          | Nigeria (Flora Shaw)   |
| **Neutre**     | `.origin-banner--neutral`    | Nom local repris par l'administration | Togo (Ewe → Allemands) |

**Structure** : Avatar (initiales ou emoji drapeau) · Nom de la personne/administration · Date · Description · Tag(s) `.origin-old-name` (barré)

---

### 4. TimelineVertical `OBLIGATOIRE`

Ligne verticale avec dégradé coloré par ère.

**Types d'items** (`data-type`) :
| Type | Couleur dot | Bordure | Texte nom |
|---|---|---|---|
| `kingdom` | Or (gold-bg, border gold) | — | Normal |
| `colonial` | Rouge (colonial-bg, border colonial) | — | **Barré** (line-through) |
| `sovereign` | Vert **plein** (rempli) + ombre | — | Normal + ✦ |

**Dégradé de la ligne** : ajuster les % selon la proportion d'ères dans les données. Ex. Nigeria (5 royaumes, 1 colonial, 1 souverain) → 60% or, 85% colonial, 100% vert.

---

### 5. PeoplesSection `OBLIGATOIRE`

**Structure** :

1. Header : total population (Fraunces 24px terracotta) + nombre de peuples
2. Visual bar : segments proportionnels (12px hauteur, 2px gap)
3. Person rows : dot coloré + exonyme + endonyme (italique) + meta + % + population

**Éléments conditionnels** :

- **Endonyme** (`.person-endo`) : affiché seulement si différent de l'exonyme
- **Terme péjoratif** (`.warn-colonial`) : barré rouge + note « à éviter »
- **Sous-clans** : ligne `.person-meta` supplémentaire (ex. Somali → Issa, Gadabursi, Isaaq)
- **Bloc "Autres"** : couleur `--demo-other` + note `📋 Données en cours de documentation`
- **Regroupement** : peuples de même % peuvent être groupés (ex. « Bissa · Gourounsi · Senoufo » → 3% ×3)

**Palette bar** : utiliser `--demo-1` à `--demo-10` dans l'ordre, `--demo-other` pour le reste.

---

### 6. KingdomsSection `OBLIGATOIRE` · 2 layouts

| Condition         | Layout                        | Classe             |
| ----------------- | ----------------------------- | ------------------ |
| ≥ 3 kingdom-cards | Scroll horizontal             | `.kingdoms-scroll` |
| < 3 kingdom-cards | Stack vertical pleine largeur | `.kingdoms-stack`  |

**Titre de section adaptatif** : « Royaumes & Civilisations » ou « Sultanats & Chefferies » selon les données.

**kingdom-card** : Period (micro-caps gold) · Name (Fraunces 17px) · People · Tags

---

### 7. LanguagesCloud `OBLIGATOIRE`

**Tailles de bulles** :
| Taille | Classe | Usage |
|---|---|---|
| Big | `.lang-bubble-big` | Langue officielle + principales langues nationales |
| Regular | `.lang-bubble` | Langues secondaires |
| Small | `.lang-bubble-small` | Langues minoritaires |

**Marqueurs** :

- Langue officielle : `.lang-bubble-official` (fond vert, bordure verte, 🏛 prefix)
- Code ISO : `.lang-bubble-code` (monospace, micro-badge)
- Overflow : `.lang-extra` (bordure dashed, « + N autres langues »)

**Règle** : si > 12 langues affichées, utiliser `.lang-extra` pour le surplus.

---

### 8. CultureGrid `OBLIGATOIRE`

Grille 2×2 fixe. 4 slots :

| Slot         | Classe          | Icône type | Couleur        |
| ------------ | --------------- | ---------- | -------------- |
| Religions    | `.ci-religion`  | ☪️ ✝️ 🙏   | `--earth`      |
| Économie     | `.ci-economy`   | 🌾 🛢️ 🚢   | `--green`      |
| Organisation | `.ci-social`    | 👑 🏕️ 🎭   | `--gold`       |
| Relations    | `.ci-relations` | 🌍         | `--terracotta` |

**Contenu** : texte court, séparé par `·`, max ~30 caractères par ligne.

---

### 9. FooterSources `OBLIGATOIRE`

Fond `--bg-warm`, texte compact (10px), sources séparées par `·`.

---

### 10. Micro-composants `CONDITIONNEL`

| Composant             | Classe                 | Usage                                          |
| --------------------- | ---------------------- | ---------------------------------------------- |
| Terme péjoratif barré | `.warn-colonial`       | Dans person-row quand un exonyme est péjoratif |
| Ancien nom colonial   | `.origin-old-name`     | Dans OriginBanner, noms coloniaux précédents   |
| Badge ISO / année     | `.hero-badge`          | Dans HeroCard                                  |
| Tag hypothèse         | `.etym-hypothesis-tag` | Dans EtymologyBlock variant C                  |
| Note documentation    | texte italique + 📋    | Dans "Autres" du PeoplesSection                |

---

## Ordre des sections (page complète)

```
1. HeroCard
2. EtymologyBlock (+ OriginBanner)
3. TimelineVertical
4. PeoplesSection
5. KingdomsSection
6. LanguagesCloud
7. CultureGrid
8. FooterSources
```

Tous les composants sont **obligatoires**. Aucun ne se masque si les données sont pauvres — le template s'adapte (ex. 2 peuples au lieu de 10, étymologie incertaine au lieu de split).

---

## Règles éditoriales

1. **Endonyme d'abord dans l'intention, exonyme dans l'affichage**. L'exonyme est en gras (plus reconnaissable), l'endonyme en italique juste après (mission décoloniale).
2. **Noms coloniaux** : toujours barrés (`line-through`), couleur `--colonial`.
3. **Termes péjoratifs** : barrés + tag `.warn-colonial` + note « à éviter ».
4. **Étymologie incertaine** : honnêteté affichée (bordure dashed, tag ⚠, hypothèses numérotées).
5. **Données manquantes** : jamais cachées, signalées avec `📋 Données en cours de documentation`.
6. **Nombres** avant texte, toujours (23M, 50%, 1984).

---

## Typographie

| Rôle                | Font               | Taille  | Poids          |
| ------------------- | ------------------ | ------- | -------------- |
| Nom pays (hero)     | Fraunces           | 34px    | 900 (black)    |
| Total population    | Fraunces           | 24px    | 900            |
| Meaning quote       | Fraunces           | 22-24px | 700            |
| Sous-titre section  | Fraunces           | 18px    | 700            |
| Étymologie mot      | Fraunces           | 28-32px | 900            |
| Kingdom name        | Fraunces           | 17px    | 700            |
| Timeline item name  | Fraunces           | 16px    | 700            |
| Person %            | Fraunces           | 18px    | 900            |
| Origin name         | Fraunces           | 16px    | 700            |
| Texte courant       | Nunito Sans        | 14px    | 600            |
| Notes, descriptions | Nunito Sans        | 12px    | 400-500        |
| Endonymes           | Nunito Sans        | 11px    | 400 (italic)   |
| Labels, tags        | Nunito Sans        | 10px    | 700-800 (caps) |
| Micro (ère, ISO)    | Nunito Sans / mono | 9px     | 700-800        |

---

## Prochaines étapes

- [ ] **Phase 3** : Responsive (tablet 768px, desktop 1200px)
- [ ] **Phase 4** : Autres pages (page peuple, listing pays, région)
- [ ] **Phase 5** : Intégration Next.js (composants React)
