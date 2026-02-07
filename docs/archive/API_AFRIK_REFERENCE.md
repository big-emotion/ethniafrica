# Documentation des APIs utilisées dans le projet AFRIK

Ce document cartographie toutes les APIs et sources de données utilisées pour enrichir les fiches ethnies, peuples, et familles linguistiques du projet AFRIK.

**Date de création** : 2025-01-25  
**Dernière mise à jour** : 2025-01-25

---

## Table des matières

1. [Glottolog](#1-glottolog)
2. [Wikidata SPARQL](#2-wikidata-sparql)
3. [Wikidata REST / Action API](#3-wikidata-rest--action-api)
4. [CIA World Factbook](#4-cia-world-factbook)
5. [UNESCO](#5-unesco)
6. [ASCL Leiden](#6-ascl-leiden)
7. [IWGIA](#7-iwgia)
8. [Encyclopaedia Africana](#8-encyclopaedia-africana)
9. [African Language Atlas](#9-african-language-atlas)
10. [Joshua Project](#10-joshua-project)

---

## 1. Glottolog

### URL doc principale

- Site principal : https://glottolog.org
- Exemple de languoid JSON : https://glottolog.org/resource/languoid/id/nucl1709.json

### Type

REST JSON (non documenté officiellement, structure déduite)

### Endpoints / routes principaux

**GET** `/resource/languoid/id/<GLOTTOCODE>.json`

- `<GLOTTOCODE>` : Code Glottolog (ex: `aari1241`, `nucl1709`)
- Retourne un JSON structuré avec les informations du languoid

### Paramètres importants

Aucun paramètre de requête nécessaire. L'identifiant est dans le chemin.

### Format de réponse

JSON avec structure (⚠️ **note importante** : la structure varie selon le type d'entité - languoid, famille, dialecte) :

```json
{
  "pk": 206,
  "hid": null,
  "father_pk": null,
  "family_pk": null,
  "level": "family",
  "id": "nucl1709",
  "name": "Nuclear Trans New Guinea",
  "description": null,
  "latitude": null,
  "longitude": null,
  "classification": [],
  "child_family_count": 193,
  "child_language_count": 317,
  "child_dialect_count": 324,
  "macroareas": {},
  "jsondata": {
    "iso_retirement": null,
    "ethnologue_comment": null,
    "links": []
  }
}
```

**Champs importants à noter :**

- `classification` : Peut contenir une liste de parents/enfants selon le type d'entité
- `jsondata.links` : Contient des URLs utiles vers d'autres ressources
- La structure complète varie selon que l'entité est une famille, une langue, ou un dialecte

### Exemple curl

```bash
# Exemple avec un languoid spécifique
curl "https://glottolog.org/resource/languoid/id/aari1241.json"

# Exemple avec un autre languoid
curl "https://glottolog.org/resource/languoid/id/nucl1709.json"
```

### Remarques

- ⚠️ **Non officiel** : Pas de documentation API publique
- ⚠️ **Instable** : Certains languoids peuvent renvoyer 410 Gone (ressource supprimée)
- ⚠️ **Structure variable** : La structure JSON varie selon le type d'entité (famille, langue, dialecte). Les champs `classification` et `jsondata.links` peuvent contenir des données différentes selon l'entité.
- ✅ **Utile pour** : Classification linguistique, hiérarchie des familles, codes Glottolog
- ⚠️ **Limitation** : Ne fournit pas d'informations historiques, culturelles ou démographiques
- 📝 **Note** : Les codes Glottolog sont stables mais certaines ressources peuvent être retirées. Adapter le parsing selon le type d'entité retourné.

---

## 2. Wikidata SPARQL

### URL doc principale

- Endpoint SPARQL : https://query.wikidata.org/sparql
- Documentation : https://www.wikidata.org/wiki/Wikidata:SPARQL_query_service

### Type

SPARQL (protocole standard W3C)

### Endpoints / routes principaux

**GET/POST** `https://query.wikidata.org/sparql`

### Paramètres importants

- `query` : Requête SPARQL (obligatoire)
- `format` : Format de réponse (optionnel, valeurs possibles : `json`, `xml`, `csv`, `tsv`, `rdf`)
- Par défaut : `application/sparql-results+json`

### Format de réponse

- JSON (par défaut) : `application/sparql-results+json`
- XML : `application/sparql-results+xml`
- CSV, TSV, RDF également supportés

### Exemple curl

```bash
# Requête GET avec paramètre query
curl -G "https://query.wikidata.org/sparql" \
  --data-urlencode "query=SELECT ?item ?itemLabel WHERE { ?item wdt:P31 wd:Q41710 . ?item rdfs:label ?itemLabel . FILTER(LANG(?itemLabel) = 'en') . } LIMIT 5" \
  -H "Accept: application/sparql-results+json"

# Requête POST (recommandée pour requêtes longues)
curl -X POST "https://query.wikidata.org/sparql" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -H "Accept: application/sparql-results+json" \
  --data-urlencode "query=SELECT ?item ?itemLabel WHERE { ?item wdt:P31 wd:Q41710 . ?item rdfs:label ?itemLabel . FILTER(LANG(?itemLabel) = 'en') . } LIMIT 5"
```

### Exemple de requête SPARQL pour les langues africaines

```sparql
SELECT ?item ?itemLabel ?isoCode ?country ?countryLabel WHERE {
  ?item wdt:P31 wd:Q34770 .  # Instance of: language
  ?item wdt:P220 ?isoCode .  # ISO 639-3 code
  ?item wdt:P17 ?country .   # Country
  ?country wdt:P30 wd:Q15 .  # Continent: Africa
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en" . }
} LIMIT 10
```

### Remarques

- ✅ **Officiel** : Service public de Wikidata
- ✅ **Standard** : Protocole SPARQL standard W3C
- ✅ **Utile pour** : Recherche de langues, ethnies, pays, relations entre entités
- ⚠️ **Limitation** : Requiert connaissance de SPARQL et des propriétés Wikidata
- 📝 **Note** : Les propriétés importantes :
  - `P31` : Instance de
  - `P17` : Pays
  - `P30` : Continent
  - `P220` : Code ISO 639-3
  - `Q41710` : Groupe ethnique
  - `Q34770` : Langue

---

## 3. Wikidata REST / Action API

### URL doc principale

- EntityData (REST) : https://www.wikidata.org/wiki/Special:EntityData/Q42.json
- Action API (MediaWiki) : https://www.wikidata.org/w/api.php
- Documentation : https://www.wikidata.org/wiki/Wikidata:Data_access

### Type

REST JSON (EntityData) / MediaWiki Action API

### Endpoints / routes principaux

**REST EntityData :**

- `GET /wiki/Special:EntityData/<QID>.json`
- `GET /wiki/Special:EntityData/<QID>.xml`
- `GET /wiki/Special:EntityData/<QID>.rdf`

**Action API :**

- `GET/POST /w/api.php?action=wbgetentities&ids=<QID>&format=json`
- `GET/POST /w/api.php?action=wbsearchentities&search=<TERM>&language=en&format=json`

### Paramètres importants

**EntityData (REST) :**

- `<QID>` : Identifiant Wikidata (ex: `Q42`, `Q41710`)

**Action API :**

- `action` : Action à effectuer (`wbgetentities`, `wbsearchentities`, etc.)
- `ids` : Identifiants Wikidata (séparés par `|`)
- `search` : Terme de recherche
- `language` : Langue pour les labels
- `format` : Format de réponse (`json`, `xml`)

### Format de réponse

JSON structuré avec entités Wikidata complètes

### Exemple curl

```bash
# EntityData REST (simple)
curl "https://www.wikidata.org/wiki/Special:EntityData/Q42.json"

# Action API - Recherche
curl -G "https://www.wikidata.org/w/api.php" \
  --data-urlencode "action=wbsearchentities" \
  --data-urlencode "search=Aari" \
  --data-urlencode "language=en" \
  --data-urlencode "format=json"

# Action API - Obtenir entités
curl -G "https://www.wikidata.org/w/api.php" \
  --data-urlencode "action=wbgetentities" \
  --data-urlencode "ids=Q42|Q41710" \
  --data-urlencode "format=json"
```

### Remarques

- ✅ **Officiel** : API publique de Wikidata
- ✅ **Utile pour** : Obtenir données complètes sur entités, recherche par nom
- ⚠️ **Limitation** : Nécessite connaissance des QIDs ou recherche préalable
- 📝 **Note** : EntityData est plus simple mais Action API offre plus de contrôle

---

## 4. CIA World Factbook

### URL doc principale

- Site officiel : https://www.cia.gov/the-world-factbook/

### Type

HTML uniquement (scraping requis)

### Endpoints / routes principaux

**Site officiel :**

- Pages HTML par pays : `https://www.cia.gov/the-world-factbook/countries/<COUNTRY>/`
- `<COUNTRY>` : Nom du pays en minuscules (ex: `ghana`, `cameroon`)

### Paramètres importants

Aucun (accès direct par URL)

### Format de réponse

HTML uniquement

### Exemple curl

```bash
# Site officiel - Ghana
curl "https://www.cia.gov/the-world-factbook/countries/ghana/"

# Site officiel - Cameroun
curl "https://www.cia.gov/the-world-factbook/countries/cameroon/"
```

### Remarques

- ⚠️ **Aucune API JSON** : Il n'existe **AUCUNE API JSON officielle ou miroir fiable** pour la CIA World Factbook
- ⚠️ **Repo GitHub supprimé** : Le fork communautaire `factbook.json` a été supprimé en 2023 et n'existe plus
- ✅ **Site officiel** : Disponible mais nécessite scraping HTML via Browserbase
- ✅ **Utile pour** : Données démographiques, groupes ethniques par pays, statistiques
- ⚠️ **Limitation** : Pas d'accès structuré, nécessite parsing HTML
- 📝 **Note** : Le seul accès fiable est le scraping HTML du site officiel. Aucune alternative JSON n'existe.

---

## 5. UNESCO

### URL doc principale

- Portail général : https://www.unesco.org
- Atlas des langues en danger : À investiguer
- ⚠️ **Endpoint interne observé** : `https://www.unesco.org/languages-atlas/api/language/<ID>` (non officiel)

### Type

HTML / API interne non documentée

### Endpoints / routes principaux

**⚠️ Endpoint interne (non officiel) :**

- `GET /languages-atlas/api/language/<ID>`
- `<ID>` : Identifiant numérique de la langue

**Note importante :** Cet endpoint est utilisé par le frontend React de l'UNESCO mais n'est **pas documenté publiquement**.

### Paramètres importants

Inconnus (endpoint interne)

### Format de réponse

Probablement JSON (à confirmer par test)

### Exemple curl

```bash
# Endpoint interne observé (non officiel, peut cesser de fonctionner)
curl "https://www.unesco.org/languages-atlas/api/language/1930"
```

### Remarques

- ⚠️ **⚠️ ENDPOINT INTERNE NON OFFICIEL** : L'endpoint `/languages-atlas/api/language/<ID>` est un endpoint interne utilisé par le frontend React de l'UNESCO
- ⚠️ **Pas de doc API** : Aucune documentation d'API officielle publique
- ⚠️ **Instable** : Peut cesser de fonctionner à tout moment sans préavis
- ⚠️ **Investigation requise** : Nécessite observation des requêtes réseau via Browserbase pour identifier les endpoints
- ✅ **Utile pour** : Classification linguistique, langues en danger, patrimoine culturel
- ⚠️ **Limitation** : Pas d'accès structuré documenté, endpoints internes non garantis
- 📝 **Note** : Utiliser avec précaution, prévoir un fallback si l'endpoint devient indisponible

---

## 6. ASCL Leiden – OAI-PMH

### URL doc principale

- Endpoint OAI-PMH : https://scholarlypublications.universiteitleiden.nl/oai2
- Spec OAI-PMH : https://www.openarchives.org/pmh/
- ⚠️ **Note** : L'ancienne URL `https://openaccess.leidenuniv.nl/oai/request` redirige vers la nouvelle

### Type

OAI-PMH (protocole standard Open Archives Initiative)

### Endpoints / routes principaux

**Base URL :** `https://scholarlypublications.universiteitleiden.nl/oai2`

**Verbes OAI-PMH :**

- `verb=Identify` : Informations sur le dépôt
- `verb=ListRecords` : Liste des enregistrements
- `verb=GetRecord` : Obtenir un enregistrement spécifique
- `verb=ListSets` : Liste des collections
- `verb=ListMetadataFormats` : Formats de métadonnées disponibles

### Paramètres importants

- `verb` : Verbe OAI-PMH (obligatoire)
- `metadataPrefix` : Format de métadonnées (ex: `oai_dc`, `oai_dcterms`)
- `set` : Collection spécifique (optionnel)
- `from` : Date de début (optionnel, format ISO 8601)
- `until` : Date de fin (optionnel, format ISO 8601)
- `identifier` : Identifiant OAI (pour GetRecord)

### Format de réponse

XML conforme au schéma OAI-PMH 2.0

### Exemple curl

```bash
# Identifier le dépôt
curl "https://scholarlypublications.universiteitleiden.nl/oai2?verb=Identify"

# Lister les enregistrements (avec métadonnées Dublin Core)
curl "https://scholarlypublications.universiteitleiden.nl/oai2?verb=ListRecords&metadataPrefix=oai_dc"

# Obtenir un enregistrement spécifique
curl "https://scholarlypublications.universiteitleiden.nl/oai2?verb=GetRecord&metadataPrefix=oai_dc&identifier=oai:scholarlypublications.universiteitleiden.nl:123"
```

### Remarques

- ✅ **Standard** : Protocole OAI-PMH 2.0 standard
- ✅ **Utile pour** : Accès aux publications académiques de Leiden sur l'Afrique
- ⚠️ **Limitation** : Format XML, nécessite parsing
- ⚠️ **Note** : Certains sets peuvent être vides (erreur `noRecordsMatch`)
- 📝 **Recommandation** : Utiliser `ListSets` d'abord pour identifier les collections pertinentes

---

## 7. IWGIA

### URL doc principale

- Page régionale Afrique : https://www.iwgia.org/en/regions/africa
- Site principal : https://www.iwgia.org

### Type

HTML (pas d'API JSON publique)

### Endpoints / routes principaux

Pages HTML uniquement, pas d'API REST documentée.

### Paramètres importants

Aucun (accès par URL directe)

### Format de réponse

HTML

### Exemple curl

```bash
# Page régionale Afrique
curl "https://www.iwgia.org/en/regions/africa"

# Exemple de page pays/peuple (à adapter selon structure)
curl "https://www.iwgia.org/en/regions/africa/[COUNTRY]"
```

### Remarques

- ⚠️ **Pas d'API** : Aucune API JSON publique documentée
- ⚠️ **Scraping requis** : Extraction textuelle depuis HTML
- ✅ **Utile pour** : Informations sur peuples autochtones, droits, contexte politique
- ⚠️ **Limitation** : Nécessite parsing HTML et peut être fragile aux changements de structure
- 📝 **Note** : Source importante pour contextualisation décoloniale et droits des peuples

---

## 8. Encyclopaedia Africana / Encyclopedia.com

### URL doc principale

- Sites variés : Encyclopedia.com, Britannica, etc.
- Pas d'API centralisée

### Type

HTML (pas d'API JSON documentée)

### Endpoints / routes principaux

Pages HTML uniquement, recherche par terme.

### Paramètres importants

Aucun (accès par URL directe ou recherche)

### Format de réponse

HTML

### Exemple curl

```bash
# Exemple de recherche (à adapter selon site)
curl "https://www.encyclopedia.com/search?q=Fang+people+Africa"
```

### Remarques

- ⚠️ **Pas d'API** : Aucune API JSON documentée
- ⚠️ **Scraping requis** : Extraction manuelle ou scraping
- ✅ **Utile pour** : Informations historiques, contextuelles, académiques
- ⚠️ **Limitation** : Nécessite parsing HTML, sources variées
- 📝 **Note** : Source complémentaire pour informations historiques et culturelles

---

## 9. African Language Atlas

### URL doc principale

- Ressources : https://africanlanguages.ucla.edu/resources/
- Site principal : https://africanlanguages.ucla.edu/

### Type

Ressources web (PDF, tableaux HTML) - pas d'API REST JSON

### Endpoints / routes principaux

Pages web statiques, documents PDF, tableaux HTML.

### Paramètres importants

Aucun (accès direct par URL)

### Format de réponse

HTML, PDF

### Exemple curl

```bash
# Page ressources
curl "https://africanlanguages.ucla.edu/resources/"
```

### Remarques

- ⚠️ **Pas d'API** : Ressources web statiques uniquement
- ⚠️ **Parsing manuel** : Nécessite extraction manuelle ou scraping
- ✅ **Utile pour** : Cartes linguistiques, classifications, références académiques
- ⚠️ **Limitation** : Pas de format structuré, extraction complexe
- 📝 **Note** : Source de référence académique mais nécessite traitement manuel

---

## 10. Joshua Project

### URL doc principale

- Documentation API : https://api.joshuaproject.net/v1/docs/available_api_requests
- Site principal : https://joshuaproject.net/

### Type

REST JSON API

### Endpoints / routes principaux

**Base URL :** `https://api.joshuaproject.net/v1/`

**Routes principales :**

- `GET /people_groups` : Liste des groupes de peuples
- `GET /people_group` : Détails d'un groupe spécifique
- `GET /languages` : Liste des langues
- `GET /countries` : Liste des pays

### Paramètres importants

- `api_key` : Clé API (obligatoire, nécessite inscription)
- `Country` : Code pays ISO (optionnel)
- `Peid` : Identifiant de groupe de peuple (optionnel)
- `format` : Format de réponse (`json`, `xml`)

### Format de réponse

JSON ou XML

### Exemple curl

```bash
# Recherche de groupes de peuples (nécessite api_key)
curl -G "https://api.joshuaproject.net/v1/people_groups" \
  --data-urlencode "api_key=YOUR_API_KEY" \
  --data-urlencode "Country=GH" \
  --data-urlencode "format=json"

# Obtenir un groupe spécifique
curl -G "https://api.joshuaproject.net/v1/people_group" \
  --data-urlencode "api_key=YOUR_API_KEY" \
  --data-urlencode "Peid=12345" \
  --data-urlencode "format=json"
```

### Remarques

- ⚠️ **⚠️ BIAS IMPORTANT** : Cette source est biaisée (perspective missionnaire/évangélique)
- ⚠️ **Dernier recours uniquement** : Ne jamais utiliser comme source unique
- ⚠️ **Marquer comme non confirmé** : Toute information de cette source doit être marquée comme "NON CONFIRMÉE"
- ✅ **Utile pour** : Identification initiale de noms de groupes (avec précaution)
- ⚠️ **Limitation** : Nécessite clé API, données potentiellement biaisées
- 📝 **Note** : Selon les règles AFRIK, cette source ne doit être utilisée qu'en dernier recours et toujours avec mention explicite du biais

---

## Résumé global pour AFRIK

### APIs les plus fiables pour les langues

1. **Glottolog** : Classification linguistique, codes Glottolog, hiérarchie des familles
2. **Ethnologue (SIL)** : Codes ISO 639-3, distribution géographique, auto-appellations
3. **Wikidata SPARQL** : Relations entre langues, ethnies, pays (nécessite connaissance SPARQL)

### APIs utiles pour l'ethnographie

1. **Wikidata REST/Action API** : Données structurées sur ethnies, peuples, pays
2. **IWGIA** : Contextualisation décoloniale, droits des peuples (scraping HTML requis)
3. **ASCL Leiden OAI-PMH** : Publications académiques (format XML)

### Sources à utiliser en dernier recours

1. **Joshua Project** : ⚠️ **BIAS IMPORTANT** - Utiliser uniquement pour identification initiale, toujours marquer comme "NON CONFIRMÉE"
2. **Encyclopaedia Africana** : Sources variées, scraping requis, qualité variable

### Sources nécessitant investigation supplémentaire

1. **CIA World Factbook** : ⚠️ **Aucune API JSON disponible** - Le repo GitHub `factbook/factbook.json` a été supprimé en 2023. Seul le scraping HTML du site officiel est disponible.
2. **UNESCO** : Endpoint interne non officiel observé (`/languages-atlas/api/language/<ID>`) - peut cesser de fonctionner à tout moment

### Recommandations pour AFRIK

- **Priorité 1** : Glottolog + Ethnologue pour données linguistiques
- **Priorité 2** : Wikidata (SPARQL + REST) pour relations et métadonnées
- **Priorité 3** : Sources académiques (ASCL Leiden, IWGIA) pour contextualisation
- **À éviter** : Joshua Project sauf identification initiale (avec mention du biais)

---

## Problèmes rencontrés lors de la cartographie

### 1. Glottolog

- ✅ **Fonctionnel** : L'endpoint JSON fonctionne mais certains languoids renvoient 410 Gone
- ⚠️ **Instabilité** : Certaines ressources peuvent être supprimées sans préavis
- 📝 **Solution** : Tester plusieurs languoids, utiliser des codes stables

### 2. Wikidata SPARQL

- ✅ **Fonctionnel** : L'endpoint fonctionne correctement
- ⚠️ **Erreur initiale** : Requête mal formée (parenthèse manquante) - corrigée
- 📝 **Solution** : Valider la syntaxe SPARQL avant envoi

### 3. CIA World Factbook

- ❌ **Problème** : Le repo GitHub `factbook/factbook.json` a été supprimé en 2023 et n'existe plus
- ⚠️ **Aucune API JSON** : Il n'existe aucune API JSON officielle ou miroir fiable
- 📝 **Solution** : Utiliser uniquement le scraping HTML du site officiel via Browserbase

### 4. ASCL Leiden OAI-PMH

- ✅ **Fonctionnel** : L'endpoint fonctionne mais l'URL a changé
- ⚠️ **Redirection** : L'ancienne URL redirige vers la nouvelle
- 📝 **Solution** : Utiliser la nouvelle URL directement

### 5. Browserbase MCP

- ⚠️ **Problèmes d'extraction** : Les extractions échouent souvent (`Failed to parse server response`)
- 📝 **Solution** : Utiliser curl en fallback pour tester les endpoints

### 6. UNESCO

- ⚠️ **Endpoint interne non officiel** : Endpoint `/languages-atlas/api/language/<ID>` observé mais non documenté publiquement
- ⚠️ **Instable** : Peut cesser de fonctionner à tout moment
- 📝 **Solution** : Utiliser avec précaution, prévoir fallback. Observer les requêtes réseau avec Browserbase pour identifier d'autres endpoints potentiels

---

## Prochaines étapes recommandées

1. **Investigation CIA World Factbook** : Trouver le bon repo GitHub ou alternative JSON
2. **Investigation UNESCO** : Observer les requêtes réseau avec Browserbase pour identifier les endpoints
3. **Création de wrappers** : Développer des fonctions TypeScript/Python pour chaque API documentée
4. **Tests d'intégration** : Tester chaque API avec des exemples concrets d'ethnies africaines
5. **Documentation des erreurs** : Créer un guide de gestion d'erreurs pour chaque API
