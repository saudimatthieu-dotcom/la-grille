# Planning — 10 jours de dev (rythme projet final La Capsule)

| Jour | Back | Front | Livrable démontrable |
|---|---|---|---|
| **J1** | `npm init`, express-generator, connexion Atlas, modèles Mongoose | Expo init, navigation, thème, écran Welcome | L'app s'ouvre, le back répond `/` |
| **J2** | `/users/signup`, `/users/signin`, middleware auth | SignUp/SignIn + slice `user` + persist | **Je crée un compte et je reste connecté** |
| **J3** | `/leagues` (create/join/list), génération du code | Écrans 2 et 3 | **Je crée une ligue et un ami la rejoint** |
| **J4** | seed 10 events mock, `/grids/.../current` | Écran 4 (grille + countdown) | **Je vois ma grille de 10 matchs** |
| **J5** | `POST /predictions` + verrou `lockAt` | Écrans 5, 6, 7 | **Je pronostique dans les 4 sports** |
| **J6** | `modules/scoring/*` + tests Jest + `/admin/score` | Écran 10 (résultats) | **Les points se calculent tout seuls** |
| **J7** | `/leagues/:id/ranking` | Écran 8 (classement) | **Couronne + lanterne rouge** |
| **J8** | `/tactics/*` (doubleur, bouclier, sabotage) + logs | BonusToggle + raccourci sabotage | **Je sabote, le bouclier me contre** |
| **J9** | `/messages` + providers réels (TheSportsDB…) | Écran 9 (chat) + écran 1 (dashboard) | **Vraies données + chambrage** |
| **J10** | Deploy Vercel + cron-job.org | EAS build, polish, seed de démo | **Soutenance** |

## Rituels quotidiens (comme en bootcamp)
- **9h30 daily** : ce que j'ai fini / ce que je bloque.
- **Git flow** : `main` protégée, 1 branche par feature `feat/leagues-join`, PR + merge.
- **Fin de journée** : `git push` + l'app doit tourner sur `main`. Jamais de commit cassé.

## Checklist soutenance
- [ ] Deux téléphones connectés à la même ligue (effet "waouh" du live).
- [ ] Un jeu de données seed déjà scoré pour montrer le classement plein.
- [ ] Plan B : back en local + provider `mock` si le Wi-Fi lâche.
- [ ] Slide archi : Expo → Express → Atlas, et le cron qui va chercher les scores.
