import express from "express";

import { legalPage } from "../modules/legalPage";

const router = express.Router();

// The address people write to when they can't use the app. To fill in with the clients' real contact
const CONTACT_EMAIL = "contact@example.com";

// To fill in with the clients' real details (mentions légales). The texts below use them
const PUBLISHER = "[NOM DE L'ÉDITEUR : personne ou société]";
const PUBLISHER_ADDRESS = "[ADRESSE DE L'ÉDITEUR]";
const HOST = "[HÉBERGEUR DU SERVEUR : nom et pays]";

// GET /legal/delete-account — the page Google Play asks for: how to delete your account and what happens to your data.
// Public, written in French (the app's language)
router.get("/delete-account", (req, res) => {
  res.type("html").send(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Supprimer mon compte — La Grille</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 640px; margin: 0 auto; padding: 24px 16px; line-height: 1.6; color: #1a1a1a; }
    h1 { font-size: 26px; }
    h2 { font-size: 18px; margin-top: 32px; }
  </style>
</head>
<body>
  <h1>Supprimer mon compte La Grille</h1>

  <h2>Depuis l'application</h2>
  <ol>
    <li>Ouvre La Grille et connecte-toi.</li>
    <li>Va dans l'onglet <strong>Profil</strong>.</li>
    <li>Tout en bas, touche <strong>Supprimer mon compte</strong>.</li>
    <li>Confirme, puis entre ton mot de passe.</li>
  </ol>
  <p>La suppression est immédiate et définitive.</p>

  <h2>Ce qui est supprimé</h2>
  <ul>
    <li>Ton compte (pseudo, e-mail, mot de passe, avatar, statut VIP).</li>
    <li>Tous tes pronostics, tes bonus et tes sabotages.</li>
    <li>Tes messages dans le chat des ligues, et les annonces de tes bonus.</li>
    <li>Ton appartenance à toutes les ligues.</li>
  </ul>

  <h2>Ce qui reste</h2>
  <ul>
    <li>Les ligues que tu as créées restent à leurs membres : elles passent au joueur arrivé après toi.
        Si tu étais seul, elles sont supprimées avec leur chat.</li>
    <li>Dans les classements des saisons passées, ta ligne reste (pour que le classement des autres joueurs
        ne change pas), mais ton pseudo est remplacé par « Joueur supprimé ».</li>
    <li>Les données de publicité sont gérées par Google (AdMob), selon ses propres règles.</li>
  </ul>

  <h2>Tu ne peux plus ouvrir l'application ?</h2>
  <p>Écris-nous à <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a> depuis l'adresse e-mail de ton compte.
     Nous supprimons ton compte sous 30 jours.</p>
</body>
</html>`);
});

// GET /legal/cgu — the terms of use the sign-up box links to
router.get("/cgu", (req, res) => {
  res.type("html").send(
    legalPage(
      "Conditions générales d'utilisation",
      `
  <h2>1. Qui sommes-nous ?</h2>
  <p>La Grille est une application de pronostics sportifs entre amis, éditée par ${PUBLISHER}, ${PUBLISHER_ADDRESS}.
     Contact : <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.</p>

  <h2>2. À quoi sert La Grille ?</h2>
  <p>Tu pronostiques des matchs et des courses, seul ou dans des ligues avec tes amis, et tu marques des points
     selon tes résultats. La Grille n'est pas un site de paris : aucune somme d'argent n'est demandée pour jouer
     ni pour gagner des points.</p>
  <p><strong>La Grille ne propose aucun lot</strong> (ni argent, ni cadeau, ni bon d'achat) : les classements, les
     podiums et le titre de gagnant du mois n'ont qu'une valeur honorifique, entre amis.</p>

  <h2>3. Ton compte</h2>
  <ul>
    <li>Tu dois avoir <strong>15 ans ou plus</strong>.</li>
    <li>Un compte par personne, avec des informations exactes.</li>
    <li>Ton mot de passe est personnel : ne le partage pas.</li>
  </ul>

  <h2>4. Les règles du jeu</h2>
  <p>Les pronostics se font avant le début de chaque match. Les points, les bonus et les classements sont
     calculés automatiquement, selon les règles expliquées dans l'application.</p>

  <h2>5. Le pass VIP</h2>
  <p>Le pass VIP donne des fonctionnalités en plus : la grille sur-mesure, les statistiques, des ligues sans
     limite de joueurs et le choix de la durée des saisons. <strong>Il ne donne jamais de points ni de
     bonus</strong> : payer ne change pas tes chances de gagner.</p>
  <p>[À COMPLÉTER quand le paiement existera : prix, durée, renouvellement, résiliation, droit de rétractation.]</p>

  <h2>6. La publicité</h2>
  <p>L'application affiche des publicités. Tu peux aussi regarder une vidéo, si tu le souhaites, pour obtenir un
     Doubleur supplémentaire par semaine et par ligue. Les publicités sont fournies par Google (AdMob) ; tu peux
     modifier tes choix à tout moment dans Profil.</p>

  <h2>7. Le comportement dans les ligues</h2>
  <p>Le chat et les pseudos doivent rester respectueux : pas d'insultes, de haine, de harcèlement ni de contenu
     illégal. Nous pouvons supprimer un message ou un compte qui ne respecte pas cette règle. Pour signaler un
     contenu : <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.</p>

  <h2>8. Tes données</h2>
  <p>Elles sont expliquées dans la <a href="/legal/confidentialite">politique de confidentialité</a>.</p>

  <h2>9. Supprimer ton compte</h2>
  <p>Tu peux le faire à tout moment dans Profil → Supprimer mon compte
     (<a href="/legal/delete-account">comment faire</a>). Nous pouvons suspendre un compte qui ne respecte pas
     ces conditions.</p>

  <h2>10. Responsabilité</h2>
  <p>Les résultats sportifs viennent de sources externes et peuvent contenir des erreurs ou des retards.
     L'application est fournie telle quelle, sans garantie qu'elle soit toujours disponible.</p>

  <h2>11. Propriété intellectuelle</h2>
  <p>L'application et son nom appartiennent à ${PUBLISHER}. Les noms d'équipes, de joueurs et de compétitions
     appartiennent à leurs titulaires et ne sont cités que pour le jeu.</p>

  <h2>12. Changements</h2>
  <p>Ces conditions peuvent évoluer. Les changements importants sont annoncés dans l'application.</p>

  <h2>13. Droit applicable</h2>
  <p>Le droit français s'applique. [À COMPLÉTER : le médiateur de la consommation, obligatoire dès qu'il y a un
     service payant comme le pass VIP.]</p>`
    )
  );
});

// GET /legal/confidentialite — the privacy policy the sign-up box links to
router.get("/confidentialite", (req, res) => {
  res.type("html").send(
    legalPage(
      "Politique de confidentialité",
      `
  <h2>Qui est responsable de tes données ?</h2>
  <p>${PUBLISHER}, ${PUBLISHER_ADDRESS}. Contact : <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.</p>

  <h2>Quelles données collectons-nous ?</h2>
  <ul>
    <li>Ton pseudo, ton e-mail et ton avatar.</li>
    <li>Ton mot de passe, <strong>chiffré</strong> : nous ne pouvons pas le lire.</li>
    <li>Ton jeu : tes pronostics, tes ligues, tes points, tes bonus.</li>
    <li>Tes messages dans le chat des ligues.</li>
    <li>Un identifiant de ton téléphone pour t'envoyer les notifications, si tu les acceptes.</li>
    <li>La date à laquelle tu as accepté les conditions d'utilisation.</li>
    <li>Pour la publicité : un identifiant géré par Google, selon ton choix dans le formulaire de consentement.</li>
  </ul>

  <h2>Pourquoi, et sur quelle base ?</h2>
  <ul>
    <li><strong>Faire fonctionner le jeu</strong> (compte, ligues, classements) : c'est le contrat entre toi et nous.</li>
    <li><strong>Les notifications</strong> : ton consentement, que tu peux retirer dans Profil.</li>
    <li><strong>La publicité personnalisée</strong> : ton consentement, demandé par le formulaire de Google.</li>
    <li><strong>La sécurité</strong> (éviter les abus) : notre intérêt légitime.</li>
  </ul>

  <h2>Qui reçoit tes données ?</h2>
  <ul>
    <li>Notre hébergeur : ${HOST}, et la base de données MongoDB Atlas.</li>
    <li>Brevo : pour envoyer l'e-mail du code de réinitialisation du mot de passe.</li>
    <li>Expo : pour envoyer les notifications sur ton téléphone.</li>
    <li>Google (AdMob) : pour la publicité.</li>
  </ul>
  <p>[À VÉRIFIER : certains de ces services peuvent traiter des données hors de l'Union européenne. Si c'est le
     cas, le préciser ici.]</p>

  <h2>Combien de temps ?</h2>
  <p>Tant que ton compte existe. Si tu le supprimes, tes données sont effacées tout de suite.
     [À FIXER : la durée avant suppression d'un compte inactif.]</p>

  <h2>Tes droits</h2>
  <p>Tu peux demander à accéder à tes données, à les corriger (pseudo et avatar dans Profil), à les supprimer
     (Profil → Supprimer mon compte), à les récupérer, ou t'opposer à un usage. Écris-nous :
     <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>. Tu peux aussi faire une réclamation auprès de la
     CNIL (www.cnil.fr).</p>

  <h2>Les moins de 15 ans</h2>
  <p>La Grille est réservée aux personnes de 15 ans ou plus.</p>

  <h2>Changements</h2>
  <p>Cette politique peut évoluer. Les changements importants sont annoncés dans l'application.</p>`
    )
  );
});

export default router;
