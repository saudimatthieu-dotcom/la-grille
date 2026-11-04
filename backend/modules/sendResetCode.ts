// Sends the "forgot password" code by email, through Brevo (free: 300 emails a day — https://www.brevo.com).
// .env: BREVO_API_KEY = the API key (Brevo → SMTP & API → API keys), MAIL_FROM = a sender address verified in Brevo.
// Without them (local development), the code is printed in the server terminal instead.

const BREVO_URL = "https://api.brevo.com/v3/smtp/email";

// What the email says — in French, like the app
export function resetEmail(code: string) {
  const subject = `${code} est ton code La Grille`;
  const text = [
    "Salut !",
    "",
    `Voici ton code pour choisir un nouveau mot de passe : ${code}`,
    "Il est valable 15 minutes.",
    "",
    "Si tu n'as rien demandé, ignore ce message : ton mot de passe ne change pas.",
    "",
    "— La Grille",
  ].join("\n");

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; color: #111">
      <h2 style="margin-bottom: 4px">La Grille</h2>
      <p>Salut !</p>
      <p>Voici ton code pour choisir un nouveau mot de passe :</p>
      <p style="font-size: 32px; font-weight: bold; letter-spacing: 6px; margin: 24px 0">${code}</p>
      <p>Il est valable <strong>15 minutes</strong>.</p>
      <p style="color: #666; font-size: 13px">Si tu n'as rien demandé, ignore ce message : ton mot de passe ne change pas.</p>
    </div>`;

  return { subject, text, html };
}

export async function sendResetCode(email: string, code: string) {
  const apiKey = process.env.BREVO_API_KEY;
  const from = process.env.MAIL_FROM;

  if (!apiKey || !from) {
    console.log(`🔑 Reset code for ${email}: ${code} (valid 15 minutes) — no BREVO_API_KEY / MAIL_FROM: not emailed`);
    return;
  }

  const { subject, text, html } = resetEmail(code);

  const response = await fetch(BREVO_URL, {
    method: "POST",
    headers: { "api-key": apiKey, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      sender: { name: "La Grille", email: from },
      to: [{ email }],
      subject,
      textContent: text,
      htmlContent: html,
    }),
  });

  if (!response.ok) {
    // Brevo explains why in its answer (bad key, sender not verified…): kept in the server logs
    console.log("Brevo refused the email:", response.status, await response.text());
    throw new Error(`Brevo answered ${response.status}`);
  }
}
