import { load, send, type Token } from "./api";

// The account: sign-up, login, password reset, profile, notifications, deletion (backend routes/users.ts)

export function signUp(body: { username: string; email: string; password: string; acceptedTerms: boolean }) {
  return send("POST", "/users/signup", body);
}

export function signIn(body: { email: string; password: string }) {
  return send("POST", "/users/signin", body);
}

// Emails a 6-digit code
export function askResetCode(body: { email: string }) {
  return send("POST", "/users/forgot-password", body);
}

export function resetPassword(body: { email: string; code: string; password: string }) {
  return send("POST", "/users/reset-password", body);
}

// My profile, with the VIP and admin status
export function loadMe(token: Token) {
  return load(`/users/me/${token}`);
}

export function loadMyStats(token: Token) {
  return load(`/users/me/stats/${token}`);
}

export function saveProfile(body: { token: Token; username?: string; avatar?: string }) {
  return send("PUT", "/users/me", body);
}

// One switch at a time: { token, newGrid: false }
export function saveNotifications(body: { token: Token } & Record<string, unknown>) {
  return send("PUT", "/users/me/notifications", body);
}

export function savePushToken(body: { token: Token; pushToken: string; platform: string }) {
  return send("PUT", "/users/me/push-token", body);
}

// The password is asked again by the server
export function deleteMyAccount(body: { token: Token; password: string }) {
  return send("DELETE", "/users/me", body);
}
