# Découpage en composants (React Native / Expo)

## Navigation
```
App
└─ NavigationContainer
   ├─ (non connecté)  AuthStack : WelcomeScreen · SignUpScreen · SignInScreen
   └─ (connecté)      TabNavigator  ← barre du bas des maquettes
      ├─ Accueil   → HomeScreen                       (écran 1)
      ├─ Mes Ligues→ LeaguesStack
      │              ├─ LeaguesListScreen             (écran 2)
      │              ├─ CreateLeagueScreen            (écran 3)
      │              └─ LeagueScreen (Top tabs)       (écran 4/8/9)
      │                 ├─ GridTab      (écran 4)
      │                 ├─ RankingTab   (écran 8)
      │                 └─ ChatTab      (écran 9)
      ├─ Grille    → PredictionStack
      │              ├─ FootballPredictionScreen      (écran 5)
      │              ├─ OverUnderPredictionScreen     (écran 6 — basket ET rugby)
      │              ├─ PodiumPredictionScreen        (écran 7 — F1 ET cyclisme)
      │              ├─ TennisPredictionScreen
      │              └─ ResultScreen                  (écran 10)
      └─ Profil    → ProfileScreen
```

## Composants réutilisables (`/components`)
| Composant | Utilisé sur | Props |
|---|---|---|
| `LeagueCard` | 1, 2 | league, rank, total, filled, alert |
| `ProgressBar` | 1, 2, 10 | value, max |
| `AlertDot` | 1, 2 | type `red\|green\|info` |
| `MatchRow` | 4 | event, prediction, onPress |
| `Countdown` | 4, 5 | lockAt → "01:43:21" (hook `useCountdown`) |
| `SportIcon` | partout | sport |
| `BonusToggle` | 5, 6, 7 | kind, available, value, onChange |
| `ScoreInput` | 5 | value, onChange (gros champ jaune) |
| `OverUnderSelect` | 6 | line, value, onChange |
| `PodiumPicker` | 7 | participants, value (3 slots) |
| `RankingRow` | 8 | rank, user, points, delta, isLeader, isLast |
| `ChatBubble` | 9 | message (variantes `chat` / `system` / `sabotage`) |
| `PrimaryButton` | partout | title, onPress, disabled |

## Design tokens (`/config/theme.js`)
Repris des maquettes : fond `#0B0F14`, cartes `#121821`, **accent lime `#D7F540`**, texte `#F2F5F7`,
danger `#FF4D4D`, or `#FFC43D`. Police : *Inter* / *Archivo* en Black pour les titres.

## Store Redux (`/reducers`)
| Slice | State |
|---|---|
| `user` | `{ token, username, avatar, inventory }` — **persisté** |
| `leagues` | `{ list, currentLeagueId }` |
| `grid` | `{ events, predictions, filled, lockAt }` — brouillon local avant `POST` |

> Règle Capsule : **seul `user` est persisté**. Le reste vient du back à chaque montage d'écran.
