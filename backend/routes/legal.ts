import express from "express";

const router = express.Router();

// The address people write to when they can't use the app. To fill in with the clients' real contact
const CONTACT_EMAIL = "contact@example.com";

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

export default router;
