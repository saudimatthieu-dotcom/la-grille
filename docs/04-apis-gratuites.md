# Sources de données sportives — 100 % gratuites

## Stratégie : 1 interface, N providers
On ne code **jamais** l'app contre une API précise. On définit un **adaptateur** qui renvoie
toujours le même objet `Event` (cf. `02-modele-donnees.md`), et on branche/débranche les sources.

```
routes/ ──> services/sportsService.js ──> providers/mock.js        (dev, hors-ligne)
                                     ├──> providers/thesportsdb.js (multi-sport)
                                     ├──> providers/footballdata.js
                                     └──> providers/jolpicaF1.js
```
**Règle d'or Capsule : on développe toute l'app sur le provider `mock`.** On ne branche les
vraies APIs qu'au sprint 4. Zéro quota brûlé, zéro blocage si une API tombe pendant la démo.

## Le catalogue
| Source | Sports | Clé ? | Quota gratuit | Usage LA GRILLE |
|---|---|---|---|---|
| **TheSportsDB** `v1/json/3/` | Foot, Basket, Rugby, Tennis, F1, **Curling, Fléchettes, Cricket, Badminton** | clé de test `3` (aucune inscription) | ~30 req/min | **Provider principal** — c'est la seule source qui couvre la *Grille Exotique* |
| **football-data.org** | Ligue 1, PL, Liga, Serie A, Bundesliga, LDC | token gratuit par email | 10 req/min | Scores foot fiables + logos |
| **Jolpica-F1** `api.jolpi.ca/ergast/f1/` | F1 (successeur d'Ergast) | aucune | soft limit | Podiums F1 (résultats + calendrier) |
| **OpenF1** `api.openf1.org/v1/` | F1 live | aucune | libre | Bonus : positions en direct |
| **balldontlie.io** | NBA | clé gratuite | 5 req/min | Scores NBA |
| **API-SPORTS** (`v1.rugby`, `v1.handball`, `v1.basketball`) | Rugby, Hand, Basket | clé gratuite | 100 req/jour | Rugby Top 14 + Handball |
| **OpenLigaDB** | Foot allemand | aucune | libre | Filet de sécurité / tests |

> ⚠️ Les quotas bougent. Vérifie la page *pricing* au moment de créer ta clé, et garde le
> provider `mock` comme plan B pour la soutenance.

## Astuce quota : le cache est ton ami
On ne requête pas l'API à chaque ouverture d'écran. Le **cron** (gratuit, cron-job.org) appelle :
- `POST /admin/sync-events` → **1× par semaine** (dimanche 23h) : importe les matchs de la semaine.
- `POST /admin/sync-results` → **toutes les heures** le week-end : récupère les scores finis.
- `POST /admin/score` → juste après : calcule les points.

Résultat : **~50 requêtes API par semaine**, très loin de tous les quotas gratuits.
L'app mobile, elle, ne tape **que ton back** — jamais une API tierce (ta clé reste secrète).

## Exemples d'appels (à tester au curl avant de coder)
```bash
# 10 prochains matchs de Ligue 1 (TheSportsDB, id ligue 4334)
curl "https://www.thesportsdb.com/api/v1/json/3/eventsnextleague.php?id=4334"

# Prochains matchs NBA (id 4387) · Top 14 (4430) · Curling, Darts → cherche l'id
curl "https://www.thesportsdb.com/api/v1/json/3/all_leagues.php"

# Podium du dernier GP de F1
curl "https://api.jolpi.ca/ergast/f1/current/last/results/"

# Ligue 1, journée en cours (football-data, token gratuit)
curl -H "X-Auth-Token: $FOOTBALL_DATA_TOKEN" \
     "https://api.football-data.org/v4/competitions/FL1/matches?status=SCHEDULED"
```

## Mapping par typologie de grille
| Typologie | Composition automatique des 10 matchs |
|---|---|
| **Officielle** | 4 foot + 2 basket + 2 rugby + 1 F1/cyclisme + 1 tennis |
| **Classique** | 6 foot (top 5 européens) + 2 NBA + 1 Top 14 + 1 tennis ATP |
| **Exotique** | curling, fléchettes, cricket, badminton, handball, sports mineurs |
| **Sur-Mesure** | le créateur pioche 10 events dans le catalogue (V2, payant) |

→ implémenté dans `backend/services/gridBuilder.js`.
