# Restore Drill — 2025-07-14

**Operator:** Platform operator  
**Date:** 2025-07-14  
**Drill type:** Quarterly restore drill (first drill)  
**Status:** ✅ Completed

---

## Summary

| Item                  | Value                                            |
| --------------------- | ------------------------------------------------ |
| Backup source         | Most recent daily logical backup (2025-07-13)    |
| Recovery method       | Logical restore via pg_restore                   |
| Throwaway project     | `restore-drill-2025-07-14` (deleted after drill) |
| Validation script     | `scripts/validateAfrikData.ts`                   |
| Total wall-clock time | ~45 minutes                                      |
| RTO target            | ≤ 4 hours                                        |
| RPO target            | ≤ 24 hours                                       |
| RTO met               | ✅ Yes                                           |
| RPO met               | ✅ Yes                                           |

---

## Steps Executed

### 1. Create throwaway project

```bash
supabase projects create "restore-drill-2025-07-14" \
  --region eu-central-1 \
  --db-password "<redacted>"
# Project ref: <throwaway-ref>
# Duration: ~3 minutes
```

### 2. Restore backup

```bash
pg_restore --verbose --no-acl --no-owner \
  -d "postgresql://postgres:<redacted>@db.<throwaway-ref>.supabase.co:5432/postgres" \
  ./backup-2025-07-13.dump
# Duration: ~30 minutes
```

### 3. Run validation script

```bash
NEXT_PUBLIC_SUPABASE_URL="https://<throwaway-ref>.supabase.co" \
NEXT_PUBLIC_SUPABASE_ANON_KEY="<redacted>" \
npx tsx scripts/validateAfrikData.ts
```

**Validation output:**

```
🔍 Validation des données AFRIK - Étape 6

============================================================

1️⃣ Validation des IDs cohérents...
2️⃣ Validation Langue → famille linguistique...
3️⃣ Validation Peuple → pays...
4️⃣ Validation termes coloniaux contextualisés...
5️⃣ Validation sections TXT complètes...
6️⃣ Validation origines et appellations enrichies...

============================================================

📊 RÉSULTATS DE LA VALIDATION

✅ IDs cohérents: Tous les IDs sont cohérents
✅ Langue → famille linguistique: Toutes les langues sont correctement liées à leur famille linguistique
✅ Peuple → pays: Tous les peuples sont correctement liés aux pays
✅ Termes coloniaux contextualisés: Tous les termes coloniaux sont correctement contextualisés
⚠️  Sections TXT complètes: Sections à compléter (non-bloquant)
⚠️  Origines et appellations enrichies: Enrichissement en cours (non-bloquant)

============================================================

📈 RÉSUMÉ:
   ✅ Succès: 4
   ⚠️  Avertissements: 2
   ❌ Erreurs: 0

📄 Rapport détaillé sauvegardé: dataset/source/afrik/logs/validation_report.json
✅ workflow_status.csv mis à jour
Exit code: 0
```

### 4. Delete throwaway project

```bash
supabase projects delete "<throwaway-ref>"
# Confirmed deleted in dashboard
# Duration: ~1 minute
```

---

## Timeline

| Step                      | Start         | End           | Duration    |
| ------------------------- | ------------- | ------------- | ----------- |
| Throwaway project created | 09:00 UTC     | 09:03 UTC     | 3 min       |
| Backup downloaded         | 09:03 UTC     | 09:08 UTC     | 5 min       |
| pg_restore                | 09:08 UTC     | 09:38 UTC     | 30 min      |
| Validation script         | 09:38 UTC     | 09:44 UTC     | 6 min       |
| Cleanup                   | 09:44 UTC     | 09:45 UTC     | 1 min       |
| **Total**                 | **09:00 UTC** | **09:45 UTC** | **~45 min** |

---

## Issues Encountered

None. Drill completed within RTO target.

---

## Next Drill

Scheduled: **2025-10-14** (quarterly)  
Reminder: Automated via `.github/workflows/backup-drill-reminder.yml`
