# DIRECTIVES AFRIK — Format JSON v2

Ces directives garantissent un parsing fiable et une cohérence entre toutes les fiches.
Consultez les fichiers `modele-peuple.json`, `modele-pays.json`, `modele-linguistique.json` pour les structures complètes.

---

## 1. Format général

- Chaque fiche est un fichier `.json` valide
- Les clés sont en **camelCase anglais** (correspondant aux types TypeScript)
- L'encodage est **UTF-8**
- Pas de commentaires (JSON standard)

---

## 2. Identifiants (IMMUABLES après création)

| Type                 | Format              | Exemple                  |
| -------------------- | ------------------- | ------------------------ |
| Peuple               | `PPL_` + majuscules | `PPL_YORUBA`, `PPL_ZULU` |
| Famille linguistique | `FLG_` + majuscules | `FLG_BANTU`, `FLG_MANDE` |
| Pays                 | ISO 3166-1 alpha-3  | `NGA`, `ZAF`, `BEN`      |
| Langue               | ISO 639-3           | `yor`, `swa`, `fra`      |

> ⚠️ Un identifiant attribué ne doit JAMAIS être modifié — il sert de clé primaire en base de données.

---

## 3. Valeurs nulles et tableaux vides

- Champ non renseigné / non applicable : `null` (PAS la chaîne `"N/A"`)
- Liste vide : `[]` (PAS `["N/A"]` ou `["À compléter"]`)
- Nombre inconnu : `null` (PAS `0` sauf si vraiment zéro)

```json
✅  "whyProblematic": null
❌  "whyProblematic": "N/A"
❌  "whyProblematic": "À compléter"

✅  "dialects": []
❌  "dialects": ["N/A"]
```

---

## 4. Approximations numériques (population, locuteurs)

Utiliser des nombres entiers précis quand disponibles.
Pour les estimations, utiliser des nombres ronds et documenter la source.

```json
✅  "totalPopulation": 2500000
✅  "totalSpeakers": 350000000
❌  "totalSpeakers": "environ 350 millions"   ← chaîne de texte, non parseable
```

Si la précision est faible, noter dans le champ `source` : `"UNFPA 2025 (estimation)"`

---

## 5. Pays actuels (`currentCountries`)

Toujours un **tableau de codes ISO 3166-1 alpha-3**.

```json
✅  "currentCountries": ["NGA"]
✅  "currentCountries": ["NGA", "BEN", "TGO"]
❌  "currentCountries": ["Nigeria"]
❌  "currentCountries": ["NGA (principal), BEN"]
❌  "currentCountries": "NGA, BEN"
```

---

## 6. Famille linguistique (`languageFamilyId`)

Toujours un identifiant `FLG_` valide. Ne jamais mettre un nom humain.

```json
✅  "languageFamilyId": "FLG_BENOUECONGO"
❌  "languageFamilyId": "Niger-Congo – Bénoué-Congo"
❌  "languageFamilyId": "Bénoué-Congo (Nigéro-Congo)"
```

Si la famille n'est pas encore créée dans le système, utiliser `"FLG_UNKNOWN"` temporairement
et créer le ticket correspondant.

---

## 7. Aires géographiques

Liste séparée par virgules, SANS tirets initiaux.

```json
✅  "geographicArea": "Afrique centrale, Afrique orientale, Afrique australe"
❌  "geographicArea": "- Afrique centrale\n- Afrique orientale"
```

---

## 8. Liste des peuples associés (familles linguistiques)

Lister 5 à 10 exemples représentatifs. Ne pas lister exhaustivement.
Chaque entrée doit avoir un `peopleId` valide.

```json
✅  { "name": "Kongo", "peopleId": "PPL_KONGO" }
✅  { "name": "Zoulou", "peopleId": "PPL_ZULU" }
❌  { "name": "Kongo", "peopleId": null }
```

---

## 9. Sources

Tableau de chaînes. Format recommandé : `"Titre – Auteur, Année (URL si disponible)"`

```json
✅  "sources": [
      "Ethnologue – SIL International, 2025 (https://www.ethnologue.com)",
      "Glottolog – Hammarström et al., 2024 (https://glottolog.org)"
    ]
❌  "sources": "Ethnologue"
```

---

## 10. Textes libres (origines, culture, histoire)

- Texte brut sans formatage Markdown (`**`, `*`, `` ` ``)
- Pas de symboles : `~`, `>`, `<`, `±`
- Phrases complètes en français
- Paragraphes séparés par `\n\n` si nécessaire

```json
✅  "ancientOrigins": "Les Bantous seraient originaires de la région des Grassfields..."
❌  "ancientOrigins": "**Origines** : ~3000 ans av. J.-C. > migration vers le sud"
```

---

## 11. Format de fichier — peuple étendu (culture détaillée)

La section `culture` peut contenir soit le format simplifié (4 champs texte),
soit le format étendu (`DetailedCultureSection` — sous-sections A à F).

**Format simplifié (96% des fiches) :**

```json
"culture": {
  "majorRites": null,
  "symbols": null,
  "artsAndMusic": null,
  "spiritualities": null
}
```

**Format étendu (fiches riches — Bambara, Kabyle, Sawa, etc.) :**

```json
"culture": {
  "divinitiesAndSpirits": { ... },
  "cosmology": { ... },
  "personAndNature": { ... },
  "ritesAndPractices": { ... },
  "symbolsAndArts": { ... },
  "contemporarySpirituality": { ... }
}
```

Les deux formats sont valides. Choisir selon la richesse des données disponibles.
