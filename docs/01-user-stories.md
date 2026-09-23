# User stories — LA GRILLE

Format Capsule : `En tant que <rôle>, je veux <action> afin de <bénéfice>.`
Priorité : **P0** = MVP soutenance, **P1** = si le temps le permet, **P2** = V2.

## Épopée 1 — Compte
| # | Story | P | Écran |
|---|---|---|---|
| 1.1 | En tant que visiteur, je veux créer un compte (pseudo, email, mdp) afin de jouer. | P0 | Signup |
| 1.2 | En tant qu'utilisateur, je veux me connecter et rester connecté afin de ne pas ressaisir mes identifiants. | P0 | Signin + redux-persist |
| 1.3 | En tant qu'utilisateur, je veux choisir un avatar afin d'être reconnu au classement. | P1 | Profil |

## Épopée 2 — Ligues
| # | Story | P | Écran |
|---|---|---|---|
| 2.1 | En tant qu'utilisateur, je veux voir toutes mes ligues avec mon rang afin de me situer. | P0 | 2. Mes Ligues |
| 2.2 | En tant que créateur, je veux créer une ligue et choisir sa typologie de grille. | P0 | 3. Créer une ligue |
| 2.3 | En tant qu'utilisateur, je veux rejoindre une ligue via un code reçu sur WhatsApp. | P0 | 3. Créer/Rejoindre |
| 2.4 | En tant que créateur, je veux partager le code d'invitation en un tap. | P1 | Share API Expo |
| 2.5 | En tant que créateur premium, je veux composer moi-même mes 10 matchs. | P2 | Sur-Mesure |

## Épopée 3 — Pronostics
| # | Story | P | Écran |
|---|---|---|---|
| 3.1 | En tant que joueur, je veux voir la grille de 10 matchs de ma ligue et ma progression (7/10). | P0 | 4. Ligue – Grille |
| 3.2 | En tant que joueur, je veux saisir un score exact au foot. | P0 | 5. Prono Foot |
| 3.3 | En tant que joueur, je veux choisir vainqueur + Over/Under au basket et au rugby. | P0 | 6. Prono Basket |
| 3.4 | En tant que joueur, je veux composer un podium F1 dans l'ordre. | P0 | 7. Prono F1 |
| 3.5 | En tant que joueur, je veux désigner vainqueur + finaliste d'un tournoi de tennis. | P1 | Prono Tennis |
| 3.6 | En tant que joueur, je veux modifier mon prono tant que le match n'est pas fermé. | P0 | 5/6/7 |
| 3.7 | En tant que joueur, je veux voir le compte à rebours de fermeture. | P0 | 4/5 |

## Épopée 4 — Outils tactiques
| # | Story | P | Écran |
|---|---|---|---|
| 4.1 | En tant que joueur, je veux activer un Doubleur sur un match (1 offert / semaine). | P0 | 5 |
| 4.2 | En tant que joueur, je veux poser un Bouclier pour annuler un sabotage. | P0 | 5 |
| 4.3 | En tant que joueur, je veux une Assurance pour toucher le max de points d'un prono partiel. | P1 | 6 |
| 4.4 | En tant que Lanterne Rouge, je veux saboter le prono d'un rival le lundi. | P0 | 8. Classement |
| 4.5 | En tant que joueur, je veux voir dans le chat que mon Bouclier a contré une attaque. | P0 | 9. Chambrage |

## Épopée 5 — Classement & social
| # | Story | P | Écran |
|---|---|---|---|
| 5.1 | En tant que joueur, je veux le classement semaine + saison de ma ligue. | P0 | 8 |
| 5.2 | En tant que joueur, je veux voir la couronne du leader et la lanterne rouge. | P0 | 8 |
| 5.3 | En tant que joueur, je veux chambrer mes amis dans le tchat de la ligue. | P0 | 9 |
| 5.4 | En tant que joueur, je veux voir mes points gagnés et mon évolution de rang. | P0 | 10. Résultats |
| 5.5 | En tant que joueur, je veux un dashboard qui me dit ce qu'il me reste à faire. | P0 | 1. Accueil |
