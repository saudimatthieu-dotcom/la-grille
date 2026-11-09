// The common frame of the public legal pages (CGU, confidentialité, suppression de compte): one place for the look.
// While the texts are a draft for the clients to validate, a yellow banner says so — set to false once they signed off
const IS_DRAFT = true;

export function legalPage(title: string, body: string) {
  const banner = IS_DRAFT
    ? `<p style="background: #fff3cd; padding: 12px; border-radius: 8px"><strong>Brouillon</strong> — texte à valider avant publication.</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title} — La Grille</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 640px; margin: 0 auto; padding: 24px 16px; line-height: 1.6; color: #1a1a1a; }
    h1 { font-size: 26px; }
    h2 { font-size: 18px; margin-top: 32px; }
  </style>
</head>
<body>
  ${banner}
  <h1>${title}</h1>
  ${body}
</body>
</html>`;
}
