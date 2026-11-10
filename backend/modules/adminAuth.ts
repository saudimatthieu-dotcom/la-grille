import User from "../models/users";

// Who is asking? The admin routes accept one of two proofs.

// The secret from .env: sent by cron-job.org, and by hand for the one-off calls
export function isAdmin(secret: unknown) {
  return Boolean(process.env.ADMIN_SECRET) && secret === process.env.ADMIN_SECRET;
}

// The admin account behind a token (the app's admin screen) — null when the token isn't an admin's
export function findAdminUser(token: unknown) {
  return User.findOne({ token: String(token), isAdmin: true });
}
