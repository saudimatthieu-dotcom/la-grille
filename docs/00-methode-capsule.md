# Méthode de dev — Projet LA GRILLE
> On applique exactement le déroulé du projet final La Capsule (type *Urgence Santé*) :
> **User stories → Maquettes → MCD → Routes → Découpage composants → Sprints → Déploiement.**

## Étape 0 — Cadrage (FAIT)
- Dossier de cadrage V2.0 ✅
- Maquettes 10 écrans ✅
- **À produire ici :** le périmètre MVP (ce qu'on coupe pour la soutenance).

### Périmètre MVP (2 semaines de dev)
| Dans le MVP | Hors MVP (V2) |
|---|---|
| Auth (signup/signin token) | Boutique / achats in-app |
| Créer / rejoindre une ligue par code | Pub rewarded (AdMob) |
| Grille hebdo de 10 matchs (auto) | Grille Sur-Mesure Premium |
| Pronos Foot / Basket / Rugby / F1 / Tennis | Handball, Cyclisme |
| Calcul auto des points (barème officiel) | Événements spéciaux (Audace, Noël) |
| Classement par ligue | Ligue publique mondiale à 146 joueurs |
| Bonus Doubleur / Bouclier / Assurance / Sabotage | Push notifications |
| Chat + logs système (Coin Chambrage) | Espionnage |

## Étape 1 — User stories → `01-user-stories.md`
## Étape 2 — Maquettes → déjà faites (10 écrans, Figma/image)
## Étape 3 — MCD / Modèle de données → `02-modele-donnees.md`
## Étape 4 — Contrat d'API (routes) → `03-api-routes.md`
## Étape 5 — Sources de données gratuites → `04-apis-gratuites.md`
## Étape 6 — Découpage en composants React Native → `05-decoupage-composants.md`
## Étape 7 — Sprints jour par jour → `06-planning-sprints.md`

## Stack (100 % gratuite)
| Brique | Outil | Coût |
|---|---|---|
| Front mobile | **Expo (React Native)** | 0 € |
| State | **Redux Toolkit + redux-persist** | 0 € |
| Navigation | **React Navigation** (Tabs + Stack) | 0 € |
| Back | **Express** (express-generator) | 0 € |
| BDD | **MongoDB Atlas M0** (512 Mo) | 0 € |
| Hébergement back | **Vercel** (serverless) ou Render free | 0 € |
| Données sport | TheSportsDB / Jolpica-F1 / football-data.org | 0 € |
| Images / avatars | **Cloudinary** free tier | 0 € |
| CRON (résultats) | **cron-job.org** (gratuit) → appelle `/admin/sync` | 0 € |
| Build APK/IPA | **EAS Build** free tier | 0 € |

**Total réel : 0 €** (les 120 € de licences stores ne servent qu'à publier, pas à soutenir le projet).
