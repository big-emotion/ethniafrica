# Guide de déploiement - Migration vers données enrichies

Ce guide explique comment déployer la nouvelle version avec les données enrichies sur staging puis production.

## Prérequis

- Accès à Supabase (staging et production)
- Variables d'environnement configurées
- Scripts de migration disponibles localement

## Étapes de déploiement

### Phase 1 : Staging

#### 1.1 Configuration de la base de données staging

1. **Créer/configurer le projet Supabase staging**
   - Créer un nouveau projet Supabase pour staging (si pas déjà fait)
   - Noter l'URL et les clés API

2. **Appliquer les migrations SQL**

   Exécuter les migrations dans l'ordre :

   ```sql
   -- Migration 001 : Schéma initial
   -- Exécuter le contenu de supabase/migrations/001_initial_schema.sql
   ```

   ```sql
   -- Migration 002 : Champs enrichis
   -- Exécuter le contenu de supabase/migrations/002_add_enriched_fields.sql
   ```

   **Via Supabase Dashboard** :
   - Aller dans SQL Editor
   - Copier/coller le contenu de chaque fichier de migration
   - Exécuter dans l'ordre (001 puis 002)

   **Via Supabase CLI** (si configuré) :

   ```bash
   supabase db push --db-url "postgresql://..."
   ```

3. **Vérifier les migrations**

   Après avoir appliqué les migrations, vérifier que tout est correct :

   ```bash
   tsx scripts/verifyDeployment.ts
   ```

   Ce script vérifie :
   - Que toutes les tables existent
   - Que toutes les colonnes enrichies sont présentes
   - Que les données sont accessibles

#### 1.2 Configuration des variables d'environnement staging

Créer/configurer `.env.local` ou les variables d'environnement de staging :

```env
NEXT_PUBLIC_SITE_URL=https://staging.ethniafrica.com
NEXT_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key]
SUPABASE_SERVICE_ROLE_KEY=[service-role-key]
USE_SUPABASE=true

# Admin authentication
ADMIN_USERNAME=admin
ADMIN_PASSWORD=[secure-password]
```

#### 1.4 Migration des données enrichies

1. **Préparer les fichiers sources**
   - Vérifier que les fichiers CSV enrichis sont dans `dataset/source/{region}/{country}/`
   - Vérifier que les fichiers de description (`.txt`) sont présents

2. **Exécuter les scripts de migration**

   ```bash
   # 1. Parser les CSV enrichis
   tsx scripts/parseEnrichedCountryCSV.ts

   # 2. Parser les descriptions
   tsx scripts/parseCountryDescriptions.ts

   # 3. Matcher CSV et descriptions
   tsx scripts/matchCSVAndDescriptions.ts

   # 4. Migrer vers Supabase staging
   # ⚠️ S'assurer que NEXT_PUBLIC_SUPABASE_URL pointe vers staging
   tsx scripts/migrateEnrichedData.ts
   ```

3. **Vérifier les données**
   - Vérifier dans Supabase Dashboard que les données sont présentes
   - Vérifier les relations parent/sous-groupes
   - Vérifier les descriptions et anciens noms

#### 1.5 Vérification finale

Avant de déployer, vérifier que tout est prêt :

```bash
tsx scripts/verifyDeployment.ts
```

#### 1.6 Déploiement de l'application staging

1. **Build et test local**

   ```bash
   npm run build
   npm start
   ```

2. **Vérifications fonctionnelles**
   - [ ] Page d'accueil : compteur d'ethnies inclut les sous-groupes
   - [ ] Liste des ethnies : sous-groupes visibles
   - [ ] Page pays : top 5 ethnies et langues affichés
   - [ ] Page pays : anciens noms affichés (max 3)
   - [ ] Page ethnie : top 5 langues affichés (si pas sous-groupe)
   - [ ] Page ethnie : anciens noms affichés (max 3)
   - [ ] Page ethnie : tableau des sous-groupes (si groupe parent)
   - [ ] CTAs "Voir plus" fonctionnent
   - [ ] Export CSV/Excel inclut les champs enrichis
   - [ ] API retourne les champs enrichis

3. **Déployer sur Vercel/staging**
   - Configurer les variables d'environnement dans Vercel
   - Déployer la branche staging
   - Vérifier que le site fonctionne

### Phase 2 : Production

⚠️ **IMPORTANT** : Ne déployer en production qu'après validation complète en staging.

#### 2.1 Backup de la base de données production

1. **Sauvegarder la base de données actuelle**
   - Via Supabase Dashboard : Settings → Database → Backups
   - Ou exporter manuellement les données importantes

#### 2.2 Application des migrations SQL en production

1. **Appliquer la migration 001** (si pas déjà fait)
   - Vérifier que le schéma initial existe
   - Si non, appliquer `001_initial_schema.sql`

2. **Appliquer la migration 002**
   - Exécuter `002_add_enriched_fields.sql` en production
   - Vérifier que les colonnes sont ajoutées

#### 2.3 Migration des données enrichies en production

1. **Préparer l'environnement**

   ```bash
   # S'assurer que NEXT_PUBLIC_SUPABASE_URL pointe vers PRODUCTION
   # ⚠️ ATTENTION : Vérifier deux fois avant d'exécuter
   ```

2. **Exécuter les scripts de migration**

   ```bash
   # Les scripts utilisent ON CONFLICT, donc ils mettront à jour les données existantes
   tsx scripts/parseEnrichedCountryCSV.ts
   tsx scripts/parseCountryDescriptions.ts
   tsx scripts/matchCSVAndDescriptions.ts
   tsx scripts/migrateEnrichedData.ts
   ```

3. **Vérifier les données en production**
   - Vérifier dans Supabase Dashboard
   - Comparer avec staging si possible

#### 2.4 Déploiement de l'application production

1. **Mettre à jour les variables d'environnement**
   - Vérifier que `NEXT_PUBLIC_SUPABASE_URL` pointe vers production
   - Vérifier toutes les autres variables

2. **Déployer sur Vercel/production**
   - Déployer depuis la branche main/master
   - Vérifier que le build passe

3. **Tests post-déploiement**
   - [ ] Site accessible
   - [ ] Données chargées depuis Supabase
   - [ ] Toutes les fonctionnalités enrichies fonctionnent
   - [ ] Pas de régression sur les fonctionnalités existantes

## Checklist de déploiement

### Staging

- [ ] Base de données staging créée
- [ ] Migration 001 appliquée
- [ ] Migration 002 appliquée
- [ ] Vérification des migrations (`tsx scripts/verifyDeployment.ts`)
- [ ] Variables d'environnement staging configurées
- [ ] Données enrichies migrées
- [ ] Vérification finale (`tsx scripts/verifyDeployment.ts`)
- [ ] Tests fonctionnels passés
- [ ] Application déployée et testée

### Production

- [ ] Backup de la base de données production effectué
- [ ] Migration 001 vérifiée/appliquée
- [ ] Migration 002 appliquée
- [ ] Vérification des migrations (`tsx scripts/verifyDeployment.ts`)
- [ ] Variables d'environnement production vérifiées
- [ ] Données enrichies migrées
- [ ] Vérification finale (`tsx scripts/verifyDeployment.ts`)
- [ ] Tests fonctionnels passés
- [ ] Application déployée et testée
- [ ] Monitoring activé

## Rollback

En cas de problème en production :

1. **Rollback de l'application**
   - Revenir à la version précédente sur Vercel
   - L'ancienne version fonctionne toujours avec l'ancienne structure de données

2. **Rollback de la base de données** (si nécessaire)
   - Restaurer depuis le backup
   - Ou supprimer les colonnes ajoutées par la migration 002 :
     ```sql
     ALTER TABLE countries DROP COLUMN IF EXISTS description;
     ALTER TABLE countries DROP COLUMN IF EXISTS ancient_names;
     ALTER TABLE ethnic_groups DROP COLUMN IF EXISTS description;
     ALTER TABLE ethnic_groups DROP COLUMN IF EXISTS ancient_name;
     ALTER TABLE ethnic_groups DROP COLUMN IF EXISTS society_type;
     ALTER TABLE ethnic_groups DROP COLUMN IF EXISTS religion;
     ALTER TABLE ethnic_groups DROP COLUMN IF EXISTS linguistic_family;
     ALTER TABLE ethnic_groups DROP COLUMN IF EXISTS historical_status;
     ALTER TABLE ethnic_groups DROP COLUMN IF EXISTS regional_presence;
     ALTER TABLE ethnic_group_presence DROP COLUMN IF EXISTS region;
     ```

## Variables d'environnement requises

### Obligatoires

- `NEXT_PUBLIC_SUPABASE_URL` : URL du projet Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` : Clé anonyme Supabase
- `SUPABASE_SERVICE_ROLE_KEY` : Clé service role (pour migrations)
- `USE_SUPABASE=true` : Activer l'utilisation de Supabase

### Optionnelles

- `ADMIN_USERNAME` : Nom d'utilisateur admin (défaut: "admin")
- `ADMIN_PASSWORD` : Mot de passe admin
- `NEXT_PUBLIC_SITE_URL` : URL du site
- `CORS_ALLOWED_ORIGIN` : Origine CORS autorisée

## Dépannage

### Erreur "Missing Supabase environment variables"

- Vérifier que toutes les variables sont définies
- Vérifier qu'elles sont bien chargées (pas de typo)

### Erreur de migration SQL

- Vérifier que la migration 001 a été appliquée avant la 002
- Vérifier les permissions de la base de données
- Vérifier les logs Supabase

### Données manquantes après migration

- Vérifier les logs des scripts de migration
- Vérifier que les fichiers sources sont au bon format
- Vérifier que les chemins des fichiers sont corrects

### L'application ne charge pas les données enrichies

- Vérifier que `USE_SUPABASE=true`
- Vérifier que les colonnes existent dans la base de données
- Vérifier les logs du serveur Next.js

## Support

En cas de problème :

1. Vérifier les logs Supabase Dashboard
2. Vérifier les logs Vercel
3. Vérifier les logs des scripts de migration
4. Consulter la documentation dans `docs/DATA_MIGRATION.md`
