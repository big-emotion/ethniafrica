# Guide de migration des données

Ce guide explique comment mettre à jour les données de l'application Ethniafrique Atlas.

## Structure des fichiers

### Organisation

Les fichiers sources doivent être organisés par région puis par pays :

```
dataset/
  source/
    {region}/
      {country}/
        {country}_ethnies_complet.csv
        {country}.txt
```

Exemple :

```
dataset/
  source/
    afrique_de_l_ouest/
      benin/
        benin_ethnies_complet.csv
        benin.txt
      senegal/
        senegal_ethnies_complet.csv
        senegal.txt
```

### Formats CSV supportés

Le système supporte deux formats de fichiers CSV :

#### Format enrichi (recommandé)

Le fichier doit être nommé `{country}_ethnies_complet.csv` et contenir les colonnes suivantes :

- `Group` : Nom du groupe ethnique principal
- `Sub_group` : Sous-groupes séparés par des virgules (optionnel)
- `Population_2025` : Population en 2025
- `Percentage_in_country` : Pourcentage dans le pays
- `Percentage_in_Africa` : Pourcentage en Afrique
- `Language` : Langues parlées (séparées par des virgules)
- `Region` : Région géographique précise du pays
- `Sources` : Sources de données (séparées par des virgules)
- `Ancient_Name` : Ancien nom du groupe (max 3, séparés par des virgules)
- `Description` : Description du groupe ethnique
- `Type_de_societe` : Type de société
- `Religion` : Religion(s)
- `Famille_linguistique` : Famille linguistique
- `Statut_historique` : Statut historique
- `Presence_regionale` : Présence régionale (pays, séparés par des virgules)

#### Format legacy (ancien format)

Le fichier doit être nommé `groupes_ethniques.csv` et contenir les colonnes suivantes :

- `Ethnicity_or_Subgroup` : Nom du groupe ethnique ou sous-groupe
- `pourcentage dans la population du pays` : Pourcentage dans le pays
- `population de l'ethnie estimée dans le pays` : Population estimée
- `pourcentage dans la population totale d'Afrique` : Pourcentage en Afrique

**Note** : Le format legacy ne contient pas les informations enrichies (langues, descriptions, etc.). Ces champs seront vides dans la base de données. Il est recommandé de migrer vers le format enrichi pour bénéficier de toutes les fonctionnalités.

### Détection automatique du format

Le script de parsing détecte automatiquement le format du fichier CSV en analysant les en-têtes :

1. **Priorité 1** : Si un fichier `*_ethnies_complet.csv` existe, il est utilisé (format enrichi)
2. **Priorité 2** : Sinon, si un fichier `groupes_ethniques.csv` existe, il est utilisé (format legacy)
3. **Priorité 3** : Sinon, n'importe quel autre fichier CSV est utilisé (format détecté automatiquement)

Le format est détecté en analysant les colonnes présentes dans le fichier.

### Format du fichier de description

Le fichier `.txt` ou `{Country}_format.txt` doit suivre cette structure :

```markdown
{NOM_DU_PAYS} — FORMAT OFFICIEL ETHNIAFRICA (Version enrichie)

1. NOM DU PAYS
   {Nom du pays}

2. ANCIENNES APPELLATIONS ET HISTOIRE DES NOMS

- Période 1 : Nom1, Nom2, Nom3
- Période 2 : Nom4, Nom5

3. RÉSUMÉ HISTORIQUE (PRÉCOLONIAL → COLONIAL → MODERNE)
   Description historique complète du pays...

4. RÉSUMÉ DÉTAILLÉ DES GROUPES ETHNIQUES

- Groupe 1 : Description...
- Groupe 2 : Description...

5. POPULATIONS ESTIMÉES 2025

- Groupe 1 : ~X millions
- Groupe 2 : ~Y millions

6. NOTES / POINTS IMPORTANTS

- Note 1
- Note 2
```

**Sections extraites** :

- **Section 2** : Anciennes appellations (format structuré avec périodes)
- **Section 3** : Résumé historique (description du pays)
- **Section 4** : Résumé détaillé des groupes ethniques
- **Section 6** : Notes et points importants

## Détection des sous-groupes

Le système détecte automatiquement les sous-groupes selon le format CSV utilisé :

### Format enrichi

1. **Pattern avec parenthèses** : `"Berbères (Amazigh, etc)"` → groupe "Berbères", sous-groupes ["Amazigh", "etc"]
2. **Pattern avec virgules dans Sub_group** : `Sub_group: "Fon, Gun, Maxi"` → sous-groupes séparés

### Format legacy

1. **Pattern avec slash** : `"Basarwa/San"` → groupe "Basarwa", sous-groupe "San"

Les populations des sous-groupes sont calculées automatiquement :

- Si des pourcentages sont disponibles, ils sont utilisés
- Sinon, la population est répartie équitablement entre les sous-groupes
- Pour le format legacy, la population totale est répartie proportionnellement entre les sous-groupes

## Processus de migration

### 1. Préparer les fichiers

1. Placer le fichier CSV dans `dataset/source/{region}/{country}/` :
   - **Format enrichi (recommandé)** : `{country}_ethnies_complet.csv`
   - **Format legacy** : `groupes_ethniques.csv`
2. Placer le fichier de description dans `dataset/source/{region}/{country}/{country}.txt` (optionnel, recommandé pour le format enrichi)

### 2. Parser les données CSV

```bash
tsx scripts/parseEnrichedCountryCSV.ts
```

Ce script :

- Détecte automatiquement le format de chaque fichier CSV (enrichi ou legacy)
- Parse tous les fichiers CSV (format enrichi et legacy)
- Détecte les sous-groupes selon le format
- Calcule les populations
- Normalise les données vers la même structure (champs enrichis vides pour le format legacy)
- Génère des fichiers JSON dans `dataset/parsed/`

**Note** : Les fichiers au format legacy produiront des données normalisées avec les champs enrichis (langues, descriptions, etc.) vides. Ces données seront migrées vers la base de données mais n'afficheront pas les informations enrichies dans l'interface.

### 3. Parser les descriptions

```bash
tsx scripts/parseCountryDescriptions.ts
```

Ce script :

- Parse tous les fichiers `.txt` ou `{Country}_format.txt`
- Extrait les sections suivantes :
  - **Section 2** : Anciennes appellations et histoire des noms
  - **Section 3** : Résumé historique (précolonial → colonial → moderne)
  - **Section 4** : Résumé détaillé des groupes ethniques
  - **Section 6** : Notes / Points importants
- Génère des fichiers JSON dans `dataset/parsed/`

### 4. Matcher CSV et descriptions

```bash
tsx scripts/matchCSVAndDescriptions.ts
```

Ce script :

- Fait correspondre les données CSV avec les descriptions
- Utilise un matching flexible (normalisation, matching partiel)
- Génère des fichiers JSON fusionnés dans `dataset/matched/`

### 5. Migrer vers Supabase

```bash
tsx scripts/migrateEnrichedData.ts
```

Ce script :

- Charge les données fusionnées
- Crée/met à jour les régions
- Crée/met à jour les pays avec descriptions et anciens noms
- Crée/met à jour les ethnies (groupes parents d'abord, puis sous-groupes)
- Crée/met à jour les langues et relations
- Crée/met à jour les sources et relations
- Crée/met à jour les presences avec région géographique
- **Invalide automatiquement le cache Next.js** pour que les nouvelles données soient immédiatement disponibles

**Note** : Pour que l'invalidation automatique du cache fonctionne, vous devez :

1. Configurer `REVALIDATE_SECRET` dans `.env.local` (voir `env.dist`)
2. Configurer `NEXT_PUBLIC_SITE_URL` dans `.env.local` (URL de votre application)
3. S'assurer que le serveur Next.js est en cours d'exécution lors de la migration

## Ajouter un nouveau pays

1. Créer le dossier `dataset/source/{region}/{country}/`
2. Ajouter le fichier CSV :
   - **Format enrichi (recommandé)** : `{country}_ethnies_complet.csv`
   - **Format legacy** : `groupes_ethniques.csv`
3. Ajouter le fichier de description : `{country}.txt` (optionnel, uniquement pour le format enrichi)
4. Exécuter les scripts de migration (étapes 2-5 ci-dessus)

**Note** : Le fichier de description est optionnel pour le format legacy, mais recommandé pour le format enrichi afin d'ajouter les descriptions et anciens noms.

## Mettre à jour un pays existant

1. Modifier le fichier CSV enrichi dans `dataset/source/{region}/{country}/`
2. Modifier le fichier de description si nécessaire
3. Exécuter les scripts de migration (étapes 2-5 ci-dessus)

Les scripts utilisent `ON CONFLICT` pour mettre à jour les données existantes.

## Réinitialiser complètement la base de données

Si vous souhaitez réinitialiser complètement la base de données avec de nouvelles données :

1. **Supprimer les dossiers générés** :

   ```bash
   rm -rf dataset/matched dataset/parsed
   mkdir -p dataset/matched dataset/parsed
   ```

2. **Réinitialiser la base de données** (supprime toutes les données existantes) :

   Exécutez cette requête SQL via Supabase ou via MCP :

   ```sql
   TRUNCATE TABLE ethnic_group_sources CASCADE;
   TRUNCATE TABLE ethnic_group_languages CASCADE;
   TRUNCATE TABLE ethnic_group_presence CASCADE;
   TRUNCATE TABLE ethnic_groups CASCADE;
   TRUNCATE TABLE countries CASCADE;
   TRUNCATE TABLE african_regions CASCADE;
   TRUNCATE TABLE languages CASCADE;
   TRUNCATE TABLE sources CASCADE;
   ```

   ⚠️ **ATTENTION** : Cette opération supprime TOUTES les données de la base de données !

3. **Puis exécuter les scripts de migration** :
   ```bash
   tsx scripts/parseEnrichedCountryCSV.ts
   tsx scripts/parseCountryDescriptions.ts
   tsx scripts/matchCSVAndDescriptions.ts
   tsx scripts/migrateEnrichedData.ts
   ```

Cette approche est recommandée lorsque vous avez ajouté de nouveaux fichiers ou modifié significativement la structure des données.

**Note** : Les dossiers `dataset/matched/` et `dataset/parsed/` sont ignorés par git (voir `.gitignore`). Ils contiennent des fichiers générés automatiquement et ne doivent pas être versionnés.

## Notes importantes

- Les anciens noms sont limités à 3 maximum (pour les pays uniquement, pas pour les ethnies)
- Les sous-groupes apparaissent dans la liste des ethnies et sont accessibles individuellement
- Les groupes et sous-groupes sont comptés séparément dans les statistiques
- Les descriptions peuvent être en texte libre (markdown supporté)
- Le format legacy est supporté pour la compatibilité, mais le format enrichi est recommandé pour bénéficier de toutes les fonctionnalités
- Les données au format legacy seront normalisées vers la même structure, mais les champs enrichis resteront vides

## Structure de la base de données

### Tables principales

- `african_regions` : Régions africaines
- `countries` : Pays avec description et anciens noms
- `ethnic_groups` : Groupes ethniques avec toutes les informations enrichies
- `ethnic_group_presence` : Présence des ethnies dans les pays
- `languages` : Langues
- `ethnic_group_languages` : Relation entre ethnies et langues
- `sources` : Sources de données
- `ethnic_group_sources` : Relation entre ethnies et sources

### Relations hiérarchiques

Les sous-groupes sont liés aux groupes parents via `parent_id` dans la table `ethnic_groups`.

## Invalidation du cache

Le système utilise un mécanisme de **versioning automatique** pour invalider le cache client (localStorage) et serveur (Next.js) lorsque les données changent.

### Comment ça fonctionne

1. **Versioning des données** : Chaque type de données (régions, pays, ethnies, population) a un numéro de version qui est incrémenté lors des migrations.

2. **Cache serveur (Next.js)** : Invalidé automatiquement via `revalidateTag()` lors de la migration.

3. **Cache client (localStorage)** : Invalidé automatiquement en comparant la version du cache avec celle du serveur. Si les versions diffèrent, le cache est automatiquement vidé et les nouvelles données sont chargées.

### Configuration

Pour activer l'invalidation automatique du cache, ajoutez ces variables dans `.env.local` :

```bash
# Secret token pour sécuriser l'endpoint d'invalidation
REVALIDATE_SECRET=your_secret_token_here

# URL de l'application Next.js
NEXT_PUBLIC_SITE_URL=http://localhost:3000  # ou votre URL de staging/production
```

### Processus d'invalidation

Lors d'une migration AFRIK :

1. Le script de migration appelle automatiquement `/api/admin/revalidate` avec les tags AFRIK appropriés
2. L'endpoint invalide le cache serveur Next.js via `revalidateTag()` pour chaque tag :
   - `afrik-language-families` : Invalide le cache des familles linguistiques
   - `afrik-peoples` : Invalide le cache des peuples
   - `afrik-countries` : Invalide le cache des pays
3. L'endpoint incrémente automatiquement les versions des données correspondantes
4. Les prochaines requêtes API incluront la nouvelle version dans la réponse
5. Le client compare la version du cache avec celle du serveur
6. Si les versions diffèrent, le cache est automatiquement vidé et les nouvelles données sont chargées

**Note** : Le système utilise `fetch` avec tags de revalidation Next.js au lieu de `unstable_cache`, ce qui permet une invalidation ciblée et automatique après chaque migration.

### Invalidation manuelle

Si l'invalidation automatique ne fonctionne pas, vous pouvez invalider le cache manuellement :

1. **Via l'API** (si le serveur est en cours d'exécution) :

   ```bash
   # Pour les données legacy (API v1)
   curl -X POST http://localhost:3000/api/admin/revalidate \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_REVALIDATE_SECRET" \
     -d '{"tags": ["regions", "countries", "ethnicities", "population", "africa"]}'

   # Pour les données AFRIK (API v2)
   curl -X POST http://localhost:3000/api/admin/revalidate \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_REVALIDATE_SECRET" \
     -d '{"tags": ["afrik-language-families", "afrik-peoples", "afrik-countries"]}'
   ```

2. **En redémarrant le serveur** : Le cache serveur est automatiquement vidé au redémarrage (mais les versions restent en mémoire)

3. **En vidant le cache côté client** : Dans la console du navigateur :
   ```javascript
   localStorage.removeItem("app:regions");
   localStorage.removeItem("app:countries");
   localStorage.removeItem("app:ethnicities");
   ```

## Dépannage

### Erreurs de matching

Si certaines ethnies ne sont pas matchées avec leurs descriptions :

- Vérifier la normalisation des noms
- Vérifier les variations d'orthographe
- Ajouter des alias si nécessaire

### Erreurs de migration

- Vérifier les logs pour identifier les erreurs spécifiques
- Vérifier que la migration SQL `002_add_enriched_fields.sql` a été appliquée
- Vérifier les variables d'environnement Supabase

### Cache non invalidé

Si les nouvelles données n'apparaissent pas après la migration :

1. Vérifier que `REVALIDATE_SECRET` est configuré dans `.env.local`
2. Vérifier que `NEXT_PUBLIC_SITE_URL` pointe vers la bonne URL
3. Vérifier que le serveur Next.js est en cours d'exécution
4. Vérifier les logs de migration pour voir si l'invalidation a réussi
5. Vérifier la console du navigateur pour voir si le cache a été invalidé automatiquement (message `🔄 Cache invalidé automatiquement`)
6. Si nécessaire, invalider manuellement le cache (voir section ci-dessus)

#### Versions perdues après redémarrage

⚠️ **Important** : Les versions sont stockées en mémoire et sont perdues lors du redémarrage du serveur. Pour persister les versions entre les redémarrages, vous pouvez :

1. Stocker les versions dans la base de données (table `data_versions`)
2. Utiliser une variable d'environnement pour forcer une version minimale
3. Redémarrer le serveur après chaque migration pour réinitialiser les versions

**Note** : En production, les versions sont généralement réinitialisées à chaque déploiement, ce qui force une invalidation complète du cache.
