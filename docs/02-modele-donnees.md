# MCD / Modèle de données (MongoDB + Mongoose)

7 collections. Règle Capsule : on référence par `ObjectId` + `populate`, on ne duplique pas.

```
users ──< leagueMembers >── leagues ──< grids >── gridEvents >── events
                                │                    │
                                └──< messages         └──< predictions >── users
```

## 1. `users`
| Champ | Type | Note |
|---|---|---|
| username | String, unique | pseudo affiché |
| email | String, unique | |
| password | String | hash bcrypt |
| token | String | uid2(32), envoyé au front |
| avatar | String | URL Cloudinary |
| inventory | { doubleur, assurance, bouclier, sabotage } Number | stock de bonus |
| createdAt | Date | |

## 2. `leagues`
| Champ | Type | Note |
|---|---|---|
| name | String | "Les Copains" |
| code | String, unique | code d'invit 6 caractères |
| gridType | Enum `officielle\|classique\|exotique\|surmesure` | typologie |
| owner | ObjectId→users | créateur |
| members | [{ user: ObjectId→users, points: Number, joinedAt: Date }] | sous-document |
| isPublic | Boolean | ligue mondiale |
| createdAt | Date | |

> **Pourquoi `members` en sous-document ?** Le classement est toujours lu *par ligue* : 1 requête, 0 jointure.

## 3. `events` (les rencontres)
| Champ | Type | Note |
|---|---|---|
| sport | Enum `football\|basket\|rugby\|handball\|f1\|cyclisme\|tennis` | |
| provider / externalId | String | pour ne pas importer 2× le même match |
| competition | String | "Ligue 1", "NBA", "GP d'Italie" |
| homeTeam / awayTeam | { name, logo } | null pour F1/Tennis |
| participants | [{ name, photo }] | pilotes / joueurs |
| startsAt | Date | sert au compte à rebours |
| lockAt | Date | = startsAt (fermeture des pronos) |
| status | Enum `scheduled\|live\|finished\|cancelled` | |
| ouLine | Number | 227.5 (basket) / 42.5 (rugby) |
| result | Mixte selon sport | voir ci-dessous |
| popularity | Number | sert au choix "classique / exotique" |

### Formes de `result` par sport
```js
football : { homeScore: 2, awayScore: 1 }
basket   : { homeScore: 110, awayScore: 104 }      // total = 214 → Under
rugby    : { homeScore: 24,  awayScore: 21 }
handball : { homeScore: 31,  awayScore: 27 }       // écart = 4
f1       : { podium: ["Verstappen", "Leclerc", "Norris"] }
tennis   : { winner: "Alcaraz", finalist: "Djokovic" }
```

## 4. `grids` (la grille d'une ligue pour une semaine)
| Champ | Type |
|---|---|
| league | ObjectId→leagues |
| season / week | Number (ex 2026 / 38) |
| events | [ObjectId→events] (10) |
| lockAt | Date (= min des lockAt) |
| status | `open\|locked\|scored` |

> Clé unique composée `{league, season, week}`.

## 5. `predictions`
| Champ | Type | Note |
|---|---|---|
| user | ObjectId→users | |
| grid | ObjectId→grids | |
| event | ObjectId→events | |
| payload | Mixte | ce que le joueur a saisi (même forme que `result`) |
| bonus | { doubleur, assurance, bouclier } Boolean | |
| sabotagedBy | ObjectId→users \| null | |
| shieldTriggered | Boolean | pour le log de chambrage |
| points | Number (null tant que non calculé) | |
| scoredAt | Date | |

> Index unique `{user, event}` : 1 seul prono par joueur par match.

## 6. `messages` (Coin Chambrage)
| Champ | Type |
|---|---|
| league | ObjectId→leagues |
| user | ObjectId→users (null si système) |
| type | `chat\|system` |
| text | String |
| meta | Mixte (icône sabotage / bouclier) |
| createdAt | Date |

## 7. `tactics` (journal des actions, anti-triche)
| Champ | Type |
|---|---|
| league / week / actor / target / kind / prediction / resolved | |

## Seed de dev
`backend/data/seed.js` crée : 6 users, 2 ligues, 10 events (1 semaine), pronos aléatoires.
