# Contrat d'API — LA GRILLE

Base : `http://localhost:3000` (dev) · `https://la-grille-backend.vercel.app` (prod)
Auth : header `Authorization: Bearer <token>` (token uid2 stocké dans `users.token`).
Réponse Capsule : toujours `{ result: true, ... }` ou `{ result: false, error: "..." }`.

## `/users`
| Méthode | Route | Body | Retour |
|---|---|---|---|
| POST | `/users/signup` | username, email, password | `{result, token, user}` |
| POST | `/users/signin` | email, password | `{result, token, user}` |
| GET | `/users/me` | — | `{result, user}` (inventaire inclus) |
| PUT | `/users/me` | avatar, username | `{result, user}` |

## `/leagues`
| Méthode | Route | Body / Params | Retour |
|---|---|---|---|
| GET | `/leagues` | — | mes ligues + rang + `pendingCount` (écran 2) |
| POST | `/leagues` | name, gridType | `{result, league}` (code généré) |
| POST | `/leagues/join` | code | `{result, league}` |
| GET | `/leagues/:id` | — | détail + typologie + membres |
| GET | `/leagues/:id/ranking?scope=week\|season` | — | `[{rank, user, points, isLeader, isLastPlace}]` (écran 8) |
| DELETE | `/leagues/:id/leave` | — | `{result}` |

## `/grids`
| Méthode | Route | Retour |
|---|---|---|
| GET | `/grids/league/:leagueId/current` | grille de la semaine + mes pronos + `filled: 7/10` (écran 4) |
| POST | `/grids/league/:leagueId/generate` | (admin/cron) génère la grille hebdo selon `gridType` |

## `/predictions`
| Méthode | Route | Body | Retour |
|---|---|---|---|
| POST | `/predictions` | eventId, payload, bonus | upsert, refusé si `lockAt` dépassé |
| GET | `/predictions/grid/:gridId` | — | mes pronos de la grille |
| GET | `/predictions/results/:gridId` | — | pronos + points + delta de rang (écran 10) |

## `/tactics`
| Méthode | Route | Body | Règle métier |
|---|---|---|---|
| POST | `/tactics/doubler` | predictionId | décrémente `inventory.doubleur` |
| POST | `/tactics/shield` | predictionId | décrémente `inventory.bouclier` |
| POST | `/tactics/insurance` | predictionId | décrémente `inventory.assurance` |
| POST | `/tactics/sabotage` | leagueId, targetUserId, eventId | **réservé à la lanterne rouge**, 1×/semaine, lundi |

## `/messages`
| Méthode | Route | Retour |
|---|---|---|
| GET | `/messages/league/:id?limit=50` | fil chat + logs système (écran 9) |
| POST | `/messages/league/:id` | `{text}` |

## `/admin` (protégé par `ADMIN_SECRET`, appelé par cron-job.org)
| Méthode | Route | Rôle |
|---|---|---|
| POST | `/admin/sync-events` | importe les matchs à venir depuis les APIs gratuites |
| POST | `/admin/sync-results` | récupère les scores finaux |
| POST | `/admin/score` | calcule les points, met à jour classements + logs |
| POST | `/admin/weekly-reset` | grilles de la semaine + doubleur offert + sabotage à la lanterne rouge |

## Codes d'erreur métier
`GRID_LOCKED` · `NOT_MEMBER` · `ALREADY_MEMBER` · `NO_BONUS_LEFT` · `NOT_LAST_PLACE` · `SABOTAGE_ALREADY_USED`
