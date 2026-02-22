# EthnAfrica — Compte-rendu de projet

## Refonte de la page pays · Février 2026

---

## Contexte

**Site** : EthnAfrica.com — Encyclopédie décoloniale des peuples d'Afrique  
**URL actuelle** : `https://ethniafrica.com/fr/pays?country=burkinaFaso`  
**Stack** : Next.js (pages dynamiques)  
**Mission** : Priorité aux endonymes sur les exonymes, histoire racontée du point de vue des peuples  
**Source de données** : Fichiers `.txt` structurés par pays (BFA.txt, NGA.txt, TGO.txt, DJI.txt…)

---

## Résumé des phases

| Phase                             | Statut      | Description                                                           |
| --------------------------------- | ----------- | --------------------------------------------------------------------- |
| **Phase 1** — Stress-test         | ✅ Terminée | 3 variants design → choix Variante C → stress-test sur 3 profils data |
| **Phase 2** — Design System       | ✅ Terminée | Tokens CSS, catalogue de composants, documentation                    |
| **Phase 3** — Responsive          | ✅ Terminée | 3 breakpoints (390 → 768 → 1200+)                                     |
| **Phase 4** — Pages écosystème    | 🔜 À venir  | Pages peuple, listing pays, région                                    |
| **Phase 5** — Intégration Next.js | 🔜 À venir  | Composants React, parser TXT, SSR/SSG                                 |

---

## Phase 1 — Exploration & Stress-test

### 1.1 Exploration design (3 variants sur Burkina Faso)

Trois directions visuelles testées sur les données BFA :

| Variant | Nom           | Fonts                  | Ambiance                         | Fichier                         |
| ------- | ------------- | ---------------------- | -------------------------------- | ------------------------------- |
| **A**   | Éditorial     | Playfair + DM Sans     | Cream, aéré, colonne unique      | `variante-a-editorial.html`     |
| **B**   | Dashboard     | Space Mono + Outfit    | Dark mode, data-dense, monospace | `variante-b-dashboard.html`     |
| **C**   | Carte vivante | Fraunces + Nunito Sans | Warm cream, cards rondes, coloré | `variante-c-carte-vivante.html` |

Un **mix A+C** a été testé (`mix-a-c-final.html`) mais finalement écarté.

**Décision** : **Variante C "Carte vivante"** retenue comme base.

### 1.2 Stress-test sur 3 profils de données

La Variante C a été testée sur 3 cas extrêmes :

| Pays               | Profil    | Peuples                           | Langues | Royaumes | Étymologie             | Fichier                  |
| ------------------ | --------- | --------------------------------- | ------- | -------- | ---------------------- | ------------------------ |
| **Nigeria** (NGA)  | Data-rich | 10 documentés + 240+ autres (21%) | 500+    | 6        | Coloniale (Flora Shaw) | `nga-carte-vivante.html` |
| **Togo** (TGO)     | Medium    | 3 documentés + 34% autres         | 4       | 2        | Mot unique (Ewe)       | `tgo-carte-vivante.html` |
| **Djibouti** (DJI) | Data-poor | 2 principaux                      | 4       | 2        | Incertaine (débattue)  | `dji-carte-vivante.html` |

### 1.3 Décisions validées durant le stress-test

**Étymologie — 3 variants formalisés :**

| Variant        | Classe CSS        | Condition de sélection        | Visuel                                     |
| -------------- | ----------------- | ----------------------------- | ------------------------------------------ |
| Split bilingue | `.etym-split`     | Nom composé de 2+ langues     | 2 colonnes (gold-bg / green-bg)            |
| Mot unique     | `.etym-single`    | Nom issu d'un seul mot/lieu   | Bloc centré, gold-bg, border solid         |
| Incertain      | `.etym-uncertain` | Origine débattue / hypothèses | Border **dashed**, bg-warm, tags numérotés |

**Royaumes — layout adaptatif :**

| Condition | Layout                                        | Classe CSS         |
| --------- | --------------------------------------------- | ------------------ |
| ≥ 3 cards | Scroll horizontal (mobile) / Grille (tablet+) | `.kingdoms-scroll` |
| < 3 cards | Stack vertical pleine largeur                 | `.kingdoms-stack`  |

**Timeline — verticale retenue** (vs horizontale) :  
Ligne colorée par ère (or → rouge → vert), dots typés, noms coloniaux barrés, ère souveraine = dot plein + glow.

**Termes péjoratifs** : `.warn-colonial` — barré rouge + note « à éviter »

**Noms coloniaux** : toujours `text-decoration: line-through` + couleur `--colonial`

**Bloc "Autres peuples"** : couleur `--demo-other` + `📋 Données en cours de documentation`

**Regroupement** : peuples de même % peuvent être condensés (ex. « Bissa · Gourounsi · Senoufo » → 3% ×3)

---

## Phase 2 — Design System

### 2.1 Livrables

| Fichier                  | Rôle                                                                         |
| ------------------------ | ---------------------------------------------------------------------------- |
| `design-tokens.css`      | 70+ variables CSS (couleurs, typo, spacing, rayons, palette demo)            |
| `component-catalog.html` | Storybook visuel : 10 composants, tous variants                              |
| `DESIGN-SYSTEM.md`       | Documentation : règles, variants, logique conditionnelle, ordre              |
| `template-generic.html`  | Template annoté : tous les variants, placeholders `{{}}`, responsive complet |

### 2.2 Palette sémantique

| Token          | Hex       | Usage sémantique                                        |
| -------------- | --------- | ------------------------------------------------------- |
| `--gold`       | `#B8860B` | Royaumes, précolonial, tradition, étymologie autochtone |
| `--green`      | `#2B6B42` | Souveraineté, indépendance, langues officielles         |
| `--terracotta` | `#C2532A` | Accent chaud, données démo, révolution                  |
| `--earth`      | `#8B6B47` | Culture, sources, neutre chaud                          |
| `--colonial`   | `#9B3030` | Colonisation, termes péjoratifs, noms coloniaux         |

### 2.3 Composants (10)

| #   | Composant            | Obligatoire  | Variants                                                        |
| --- | -------------------- | ------------ | --------------------------------------------------------------- |
| 1   | **HeroCard**         | ✅           | — (1 seul, adapte le bloc meaning selon certitude étymologie)   |
| 2   | **EtymologyBlock**   | ✅           | 3 : split bilingue / mot unique / incertain                     |
| 3   | **OriginBanner**     | ✅           | 3 tonalités : révolution / colonial / neutre                    |
| 4   | **TimelineVertical** | ✅           | — (items typés : kingdom / colonial / sovereign)                |
| 5   | **PeoplesSection**   | ✅           | — (barre proportionnelle + person-rows)                         |
| 6   | **KingdomsSection**  | ✅           | 2 layouts : scroll (≥3) / stack (<3)                            |
| 7   | **LanguagesCloud**   | ✅           | — (3 tailles de bulles + overflow pill)                         |
| 8   | **CultureGrid**      | ✅           | — (grille 2×2 fixe)                                             |
| 9   | **FooterSources**    | ✅           | —                                                               |
| 10  | **Micro-composants** | Conditionnel | warn-colonial, origin-old-name, hero-badge, etym-hypothesis-tag |

### 2.4 Ordre des sections (page pays)

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

---

## Phase 3 — Responsive

### 3.1 Livrable

| Fichier               | Description                                              |
| --------------------- | -------------------------------------------------------- |
| `bfa-responsive.html` | Burkina Faso avec les 3 breakpoints + indicateur de mode |

### 3.2 Comportements par breakpoint

| Élément                 | 📱 Mobile (≤767)      | 📋 Tablet (768-1199)     | 🖥️ Desktop (1200+)                  |
| ----------------------- | --------------------- | ------------------------ | ----------------------------------- |
| **Page max-width**      | 430px                 | 720px                    | 800px (éditorial centré)            |
| **Hero nom pays**       | 34px                  | 42px                     | 50px                                |
| **Drapeau emoji**       | 48px                  | 56px                     | 64px                                |
| **Étymologie + Origin** | Empilés verticalement | Côte à côte (grid 2 col) | Côte à côte, plus large             |
| **Royaumes**            | Scroll horizontal     | Grille 3 colonnes        | Grille 3 col, cards plus spacieuses |
| **Barre démo**          | 12px hauteur          | 16px                     | 18px                                |
| **Cards padding**       | 18px                  | 24px                     | 28px                                |
| **Cards border-radius** | 16px                  | 20px                     | 22px                                |
| **Page padding**        | 12px                  | 16px                     | 20px                                |

**Choix éditorial desktop** : max-width 800px centré (style Medium/Substack) plutôt que pleine largeur — lisibilité optimale pour du contenu encyclopédique.

---

## Mapping données TXT → Composants UI

### Structure du fichier source (BFA.txt)

Le fichier est structuré en sections `# Titre` avec des champs `- Clé : Valeur`. Voici le mapping complet :

### Composant 1 — HeroCard

| Champ TXT               | Chemin dans le fichier                                    | Ce qui est extrait                                          | Affichage UI                       |
| ----------------------- | --------------------------------------------------------- | ----------------------------------------------------------- | ---------------------------------- |
| **Nom officiel actuel** | `# Nom du pays` → `Nom officiel actuel`                   | Le nom avant les parenthèses                                | `.hero-name` (Fraunces 34px black) |
| **ISO**                 | `# Nom du pays` → `Identifiant pays (ISO 3166-1 alpha-3)` | Code 3 lettres (ex: `BFA`)                                  | `.hero-badge`                      |
| **Année du nom**        | Extraite de `Étymologie du nom`                           | Année dans "adopté en XXXX"                                 | `.hero-badge`                      |
| **Signification**       | `# Nom du pays` → `Étymologie du nom`                     | La phrase entre guillemets (ex: "Pays des hommes intègres") | `.hero-meaning-quote`              |
| **Langues d'origine**   | `# Nom du pays` → `Étymologie du nom`                     | Langues mentionnées (mooré, dioula)                         | `.hero-meaning-langs`              |
| **Région**              | Déduite de la position géographique                       | Ex: "Afrique de l'Ouest"                                    | `.hero-back` lien                  |
| **Drapeau**             | Code ISO → emoji drapeau                                  | 🇧🇫 (généré par code)                                        | `.hero-flag-big`                   |

**Champs ignorés** : Le contenu descriptif de `Nom officiel actuel` après les parenthèses.

### Composant 2 — EtymologyBlock

| Champ TXT | Chemin              | Extraction                                         | Affichage                                             |
| --------- | ------------------- | -------------------------------------------------- | ----------------------------------------------------- |
| **Mot 1** | `Étymologie du nom` | Regex : `"Mot" vient du LANGUE et signifie "SENS"` | `.etym-word` + `.etym-lang` + `.etym-def` (colonne 1) |
| **Mot 2** | `Étymologie du nom` | Idem, 2e occurrence                                | `.etym-word` + `.etym-lang` + `.etym-def` (colonne 2) |

**Logique de sélection du variant :**

```
SI le texte contient 2+ patterns "vient du [LANGUE]" → variant SPLIT BILINGUE
SI le texte contient 1 seul pattern → variant MOT UNIQUE
SI le texte contient "débattu", "incertain", "hypothèse" → variant INCERTAIN
SI le texte contient un nom de personne étrangère → ajouter flag COLONIAL sur OriginBanner
```

**Transformation pour BFA :**

- Texte source : `"Burkina" vient du mooré et signifie "intègres" ou "honnêtes", tandis que "Faso" vient du dioula et signifie "pays" ou "patrie"`
- Extraction mot 1 : `Burkina` / `Mooré (Mossi)` / `« Intègres »`
- Extraction mot 2 : `Faso` / `Dioula (Mandé)` / `« Pays »`
- On retient le **premier sens** uniquement quand il y a "ou" (ex : "intègres" ou "honnêtes" → on garde "Intègres")

### Composant 3 — OriginBanner

| Champ TXT       | Chemin                                                  | Extraction                                                    | Affichage                  |
| --------------- | ------------------------------------------------------- | ------------------------------------------------------------- | -------------------------- |
| **Personne**    | `Personne / peuple / administration à l'origine du nom` | Nom propre (ex: Thomas Sankara)                               | `.origin-name`             |
| **Date**        | Même champ                                              | Année + contexte (ex: "1984 lors de la révolution burkinabè") | `.origin-date`             |
| **Description** | Même champ                                              | Phrase résumée manuellement                                   | `.origin-desc`             |
| **Ancien nom**  | `Étymologie du nom`                                     | Nom qu'il remplace (ex: "Haute-Volta")                        | `.origin-old-name` (barré) |

**Logique de tonalité :**

```
SI "révolution", "indépendance", "émancipation" → tonalité REVOLUTION (terracotta)
SI "colonial", "britannique", "français", "allemand" + nom étranger → tonalité COLONIAL (rouge)
SI nom local repris par administration → tonalité NEUTRE (earth)
```

**Initiales avatar** : Extraites du nom (Thomas Sankara → "TS"). Si c'est une administration → emoji drapeau du colonisateur.

### Composant 4 — TimelineVertical

| Champ TXT           | Chemin                                                                 | Extraction                     | Affichage                         |
| ------------------- | ---------------------------------------------------------------------- | ------------------------------ | --------------------------------- |
| **Items royaumes**  | `# 1. Appellations historiques` → `Moyen Âge` et `Époque précoloniale` | Noms des royaumes + période    | `.tl-item[data-type="kingdom"]`   |
| **Items coloniaux** | `# 1. Appellations historiques` → `Colonisation`                       | Nom colonial + dates + détails | `.tl-item[data-type="colonial"]`  |
| **Item souverain**  | `# 1. Appellations historiques` → `Période contemporaine`              | Nom actuel + date changement   | `.tl-item[data-type="sovereign"]` |

**Logique de construction des items :**

La section `# 1. Appellations historiques` contient des paragraphes par ère. Pour chaque ère :

```
POUR chaque sous-section (Antiquité, Moyen Âge, ..., Période contemporaine) :
  - Extraire les DATES (regex: \d{4} ou "XIe siècle")
  - Extraire les NOMS D'ENTITÉS (mots en majuscule ou entre guillemets)
  - Extraire les LIEUX CLÉS (après ":" dans les listes)
  - Classifier le type : kingdom | colonial | sovereign
  - Formater en .tl-item-era / .tl-item-name / .tl-item-note
```

**Règles de classification :**

```
SI la sous-section est "Colonisation" → data-type="colonial"
SI la sous-section est "Période contemporaine" ET date >= indépendance → data-type="sovereign"
SINON → data-type="kingdom"
```

**Champs ignorés** :

- `Antiquité` : ignoré si "sans nom unifié" (pas d'entité à afficher)
- `# 6. Faits historiques majeurs` : section entièrement ignorée (trop dense, pas de valeur ajoutée visuelle sur cette page — à exploiter potentiellement en Phase 4)

**Dégradé de la ligne** : les % du `linear-gradient` sont calculés proportionnellement au nombre d'items par type.

### Composant 5 — PeoplesSection

**Source primaire** : `# DONNÉES DÉMOGRAPHIQUES` (fin du fichier)  
**Source complémentaire** : `# 3. Peuples majeurs` (pour les endonymes et termes péjoratifs)

| Champ TXT (DONNÉES DÉMO)                 | Extraction             | Affichage                                     |
| ---------------------------------------- | ---------------------- | --------------------------------------------- |
| `Population` (dernière ligne du fichier) | Total (ex: 23 000 000) | `.demo-total` → formaté "23M"                 |
| **Par peuple :**                         |                        |                                               |
| `### Peuple : Nom`                       | Nom du peuple          | `.person-exo`                                 |
| `Population`                             | Nombre brut            | `.person-pop` → formaté "11,5M" ou "920K"     |
| `Pourcentage dans le pays`               | Pourcentage            | `.person-pct` + `flex` de `.visual-seg`       |
| `Région`                                 | Texte raccourci        | `.person-meta` (1re partie)                   |
| `Famille linguistique`                   | Texte raccourci        | `.person-meta` (2e partie)                    |
| `Code ISO 639-3`                         | Code                   | Pas affiché ici (utilisé dans LanguagesCloud) |

| Champ TXT (PEUPLES MAJEURS)     | Extraction                                 | Affichage                      |
| ------------------------------- | ------------------------------------------ | ------------------------------ |
| `Auto-appellation (endonyme)`   | Termes entre parenthèses                   | `.person-endo` (italique)      |
| `Remarque sur les appellations` | Si mention "péjoratif" → extraire le terme | `.warn-colonial` (barré rouge) |

**Champs ignorés** :

- `Identifiant peuple (PPL_)` : usage interne, pas affiché
- `Pourcentage en Afrique` : toujours N/A dans les données actuelles
- `Exonymes / appellations historiques` : pas affiché sauf si péjoratif (filtré dans Remarque)
- `Langues parlées` (section 3) : redondant avec la section Langues

**Logique de transformation :**

```python
# Formatage population
def format_pop(n):
    if n >= 1_000_000:
        return f"{n/1_000_000:.1f}M".replace('.0M', 'M')
    elif n >= 1_000:
        return f"{n/1_000:.0f}K"
    return str(n)

# Extraction endonyme
# Source: "Moaga (singulier), Moose (pluriel)"
# Résultat: "Moaga · Moose"
def extract_endonym(text):
    # Retirer les parenthèses descriptives
    parts = re.findall(r'(\w+)\s*\(', text)
    return ' · '.join(parts)

# Extraction terme péjoratif
# Source: "Pas de terme péjoratif connu." → None
# Source: '"Fellata" peut avoir une connotation péjorative' → "Fellata"
def extract_pejorative(text):
    if "péjoratif" in text.lower() and "pas de" not in text.lower():
        match = re.search(r'"([^"]+)".*péjoratif', text)
        return match.group(1) if match else None
    return None

# Raccourcir la région
# Source: "Plateau central du Burkina Faso (Ouagadougou, Yatenga, Tenkodogo)"
# Résultat: "Plateau central"
def shorten_region(text):
    return text.split(' du ')[0].split(' de ')[0].strip()

# Raccourcir la famille linguistique
# Source: "Niger-Congo – Gur (FLG_GUR)"
# Résultat: "Niger-Congo Gur"
def shorten_family(text):
    return re.sub(r'\s*\(FLG_\w+\)', '', text).replace(' – ', ' ')
```

**Regroupement des peuples à même % :**

```
SI 3+ peuples consécutifs (triés par %) ont le même pourcentage :
  → Les regrouper sur une seule ligne : "Bissa · Gourounsi · Senoufo"
  → person-pop = "×3"
  → person-meta = "3 peuples · 690K chacun"
```

**Tri** : les peuples sont affichés par **pourcentage décroissant**.

**Attribution des couleurs** : `--demo-1` au peuple dominant, `--demo-2` au suivant, etc. `--demo-other` toujours au bloc "Autres".

**Comptage** : Le nombre de peuples affiché dans le header (`10+ peuples`) = nombre d'entrées `### Peuple` dans la section DONNÉES DÉMOGRAPHIQUES (sans compter "Autres").

### Composant 6 — KingdomsSection

**Source** : `# 2. Civilisations, royaumes et entités politiques historiques`

| Champ TXT            | Extraction           | Affichage              |
| -------------------- | -------------------- | ---------------------- |
| `[Nom du royaume]`   | Titre entre crochets | `.kingdom-card-name`   |
| `Période`            | Dates/ères           | `.kingdom-card-period` |
| `Peuples dominants`  | Noms de peuples      | `.kingdom-card-people` |
| `Centres politiques` | Villes clés (max 3)  | `.kingdom-card-tag`    |

**Champs ignorés** :

- `Rôle historique` : trop long pour une card, non affiché (potentiel Phase 4 sur page détaillée)
- `[Colonie de Haute-Volta]` : **exclue** du composant Royaumes — déjà couverte par la Timeline. Le filtre est : `SI "colonie" dans le nom → exclure de KingdomsSection`.

**Mots-clés pour les tags** :

```
Extraire de Centres politiques : les 2-3 premiers noms de villes
Extraire de Rôle historique : 1-2 mots-clés (ex: "Résistance", "Artisanat", "Commerce")
```

**Titre de section adaptatif** :

```
SI majorité d'items contient "Royaume" → "Royaumes & Civilisations"
SI majorité contient "Sultanat" → "Sultanats & Chefferies"
SI majorité contient "Chefferie" → "Chefferies & Entités"
SI mix → "Entités politiques historiques"
```

### Composant 7 — LanguagesCloud

**Source** : `# 5. Culture...` → `Langues principales (avec ISO 639-3)`

| Champ TXT             | Extraction   | Affichage                   |
| --------------------- | ------------ | --------------------------- |
| `Langues principales` | Liste parsée | Ensemble des `.lang-bubble` |

**Logique de parsing :**

Le champ contient : `Français (langue officielle, fra), Mooré (mos), Fulfulde (ful), ...`

```python
def parse_languages(text):
    langs = []
    for item in text.split('), '):
        item = item.strip().rstrip(')')
        parts = item.split(' (')
        name = parts[0]
        meta = parts[1] if len(parts) > 1 else ''

        is_official = 'officielle' in meta.lower()
        iso_code = re.search(r'[a-z]{3}', meta)  # 3 lettres minuscules

        langs.append({
            'name': name,
            'code': iso_code.group() if iso_code else None,
            'official': is_official
        })
    return langs
```

**Attribution des tailles :**

```
Langue officielle → .lang-bubble-big + .lang-bubble-official
2-3 langues les plus parlées (premiers items) → .lang-bubble-big
Langues suivantes → .lang-bubble (regular)
Langues en fin de liste → .lang-bubble-small
SI total > 12 → ajouter .lang-extra "+" N-12 "autres langues"
```

**Champs ignorés** :

- `Traditions culturelles` : pas dans ce composant (→ CultureGrid)

### Composant 8 — CultureGrid

**Source** : `# 5. Culture, modes de vie, langues, spiritualités, organisation traditionnelle`

| Slot             | Champ TXT source       | Extraction                                                                           |
| ---------------- | ---------------------- | ------------------------------------------------------------------------------------ |
| **Religions**    | `Religions dominantes` | Termes avant les parenthèses : "Islam", "Christianisme", "Religions traditionnelles" |
| **Économie**     | `Modes de vie`         | Mots-clés économiques : "Agriculture", "Élevage", "Or", "Coton"                      |
| **Organisation** | `Organisation sociale` | Mots-clés : "Royaumes", "Chefferies", "Lignages patrilinéaires"                      |
| **Relations**    | `Relations régionales` | Noms de pays + organisations : "Mali", "Côte d'Ivoire", "CEDEAO"                     |

**Logique d'extraction (résumé → mots-clés) :**

Les champs source sont des paragraphes longs. On en extrait **4-6 mots-clés** séparés par `·` :

```python
def extract_keywords(text, max_keywords=5):
    # Retirer les parenthèses et leur contenu descriptif
    clean = re.sub(r'\([^)]+\)', '', text)
    # Séparer par virgules
    items = [i.strip() for i in clean.split(',')]
    # Garder les 2-3 premiers mots de chaque item
    keywords = []
    for item in items:
        words = item.split()[:3]
        keyword = ' '.join(words).strip('. ')
        if keyword and keyword not in keywords:
            keywords.append(keyword)
    return keywords[:max_keywords]
```

Pour **Économie** spécifiquement, on filtre les termes qui évoquent des activités économiques (agriculture, élevage, mining, commerce) vs les détails descriptifs.

Pour **Relations**, on extrait les noms de pays (mots commençant par une majuscule qui sont des pays) + les organisations (CEDEAO, UEMOA).

**Champs ignorés** :

- Le détail descriptif de chaque paragraphe (parenthèses, listes longues, contexte historique)

### Composant 9 — FooterSources

**Source** : `# 7. Sources`

| Champ TXT        | Extraction        | Affichage                    |
| ---------------- | ----------------- | ---------------------------- |
| Liste de sources | Chaque `- Source` | Texte compact séparé par `·` |

**Transformation** : retirer les tirets, joindre avec `·`, raccourcir les titres trop longs.

### Récapitulatif : champs TXT utilisés vs ignorés

**Sections du TXT utilisées :**

| Section TXT                     | Composants alimentés                   |
| ------------------------------- | -------------------------------------- |
| `# Nom du pays`                 | HeroCard, EtymologyBlock, OriginBanner |
| `# 1. Appellations historiques` | TimelineVertical                       |
| `# 2. Civilisations, royaumes`  | KingdomsSection                        |
| `# 3. Peuples majeurs`          | PeoplesSection (endonymes, péjoratifs) |
| `# 5. Culture, modes de vie`    | LanguagesCloud, CultureGrid            |
| `# 7. Sources`                  | FooterSources                          |
| `# DONNÉES DÉMOGRAPHIQUES`      | PeoplesSection (population, %)         |

**Sections du TXT ignorées :**

| Section TXT                      | Raison                                                                                                                                     |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `# 6. Faits historiques majeurs` | Trop dense pour la page pays. Contenu redondant avec la Timeline et les Royaumes. Exploitable en Phase 4 (page détaillée peuple/histoire). |

**Champs systématiquement ignorés :**

| Champ                                      | Raison                                                          |
| ------------------------------------------ | --------------------------------------------------------------- |
| `Identifiant peuple (PPL_)`                | Usage interne/technique, pas de valeur visuelle                 |
| `Pourcentage en Afrique`                   | Toujours N/A dans les données actuelles                         |
| `Exonymes / appellations historiques`      | Affiché seulement si péjoratif (filtré via Remarque)            |
| `Rôle historique` (section 2)              | Trop long pour une card kingdom — exploitable en Phase 4        |
| Parenthèses descriptives dans les champs   | Ex: "(pasteurs nomades et sédentaires)" — retiré pour concision |
| Détails dans `Langues parlées` (section 3) | Redondant avec la section 5 Langues principales                 |

---

## Fichiers livrés

### Prototypes HTML

| Fichier                         | Description                                           | Phase |
| ------------------------------- | ----------------------------------------------------- | ----- |
| `variante-a-editorial.html`     | Variant A — Éditorial (écarté)                        | 1     |
| `variante-b-dashboard.html`     | Variant B — Dashboard (écarté)                        | 1     |
| `variante-c-carte-vivante.html` | Variant C — Carte vivante (BFA, retenu)               | 1     |
| `mix-a-c-final.html`            | Hybride A+C (écarté)                                  | 1     |
| `nga-carte-vivante.html`        | Nigeria — stress-test data-rich + timeline verticale  | 1     |
| `tgo-carte-vivante.html`        | Togo — stress-test medium + timeline verticale        | 1     |
| `dji-carte-vivante.html`        | Djibouti — stress-test data-poor + timeline verticale | 1     |
| `nga-timeline-vertical.html`    | Nigeria — variant exploratoire timeline verticale     | 1     |

### Design System

| Fichier                  | Description                                               | Phase |
| ------------------------ | --------------------------------------------------------- | ----- |
| `design-tokens.css`      | Variables CSS centralisées (70+ tokens)                   | 2     |
| `component-catalog.html` | Storybook visuel — 10 composants, tous variants           | 2     |
| `DESIGN-SYSTEM.md`       | Documentation complète du système                         | 2     |
| `template-generic.html`  | Template annoté tous variants + responsive + placeholders | 2-3   |

### Template générique

| Fichier                 | Description                                                                                                 | Phase |
| ----------------------- | ----------------------------------------------------------------------------------------------------------- | ----- |
| `template-generic.html` | Template annoté avec TOUS les variants, placeholders `{{}}`, commentaires conditionnels, responsive complet | 3     |

### Responsive

| Fichier               | Description                                  | Phase |
| --------------------- | -------------------------------------------- | ----- |
| `bfa-responsive.html` | Burkina Faso — 3 breakpoints (390/768/1200+) | 3     |

---

## Phases restantes

### Phase 4 — Pages écosystème `À VENIR`

**Objectif** : Créer les templates pour les autres pages du site.

**Pages à designer :**

| Page                  | Description                                             | Données source                                                        |
| --------------------- | ------------------------------------------------------- | --------------------------------------------------------------------- |
| **Page peuple**       | Page dédiée à un peuple (Mossi, Peul…)                  | Section `# 3. Peuples majeurs` (un peuple) + données démo             |
| **Page listing pays** | Grille/liste de tous les pays avec mini-cards           | Agrégation des fichiers TXT                                           |
| **Page région**       | Vue régionale (Afrique de l'Ouest, Corne de l'Afrique…) | Agrégation par zone géographique                                      |
| **Page histoire**     | Timeline détaillée d'un pays                            | Section `# 6. Faits historiques majeurs` (actuellement non exploitée) |

**Données actuellement non exploitées qui trouveraient leur place ici :**

- `# 6. Faits historiques majeurs` → Page histoire détaillée
- `Rôle historique` (section 2) → Page royaume/civilisation détaillée
- `Exonymes / appellations historiques` → Page peuple détaillée
- `Traditions culturelles` (détail) → Page peuple ou page culture

### Phase 5 — Intégration Next.js `À VENIR`

**Objectif** : Transformer les prototypes HTML en composants React et intégrer dans le site existant.

**Étapes prévues :**

| Étape                      | Description                                                                                               |
| -------------------------- | --------------------------------------------------------------------------------------------------------- |
| **5.1 — Parser TXT**       | Écrire un parser qui lit les fichiers `.txt` et produit un objet JSON structuré par composant             |
| **5.2 — Types TypeScript** | Définir les interfaces pour chaque composant (`HeroCardProps`, `EtymologyBlockProps`, etc.)               |
| **5.3 — Composants React** | Créer les 10 composants React avec la logique conditionnelle (variants étymologie, layout royaumes, etc.) |
| **5.4 — Tokens CSS-in-JS** | Migrer `design-tokens.css` vers CSS Modules ou Tailwind config                                            |
| **5.5 — Responsive**       | Intégrer les media queries dans les composants                                                            |
| **5.6 — SSR/SSG**          | Configurer le rendu statique pour les pages pays (getStaticProps/getStaticPaths)                          |
| **5.7 — i18n**             | Préparer la structure multilingue (fr/en au minimum)                                                      |
| **5.8 — Accessibilité**    | Audit ARIA, contraste, navigation clavier                                                                 |
| **5.9 — SEO**              | Balises meta, structured data (JSON-LD), Open Graph                                                       |

**Dépendances** :

- Phase 5.1 dépend du format final stabilisé des fichiers TXT (V2 actuel)
- Phase 5.3 peut démarrer en parallèle avec des données mockées
- Phase 5.6-5.9 sont des passes finales après intégration fonctionnelle

---

_Document généré le 21 février 2026 · EthnAfrica Design Sprint_
