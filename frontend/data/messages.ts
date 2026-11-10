import { load, send, type Token } from "./api";

// The league chats (backend routes/messages.ts)

// The last message of each of my leagues (home screen)
export function loadLatestMessages(token: Token) {
  return load(`/messages/latest/${token}`);
}

export function loadLeagueMessages(leagueId: string, token: Token) {
  return load(`/messages/league/${leagueId}/${token}`);
}

export function sendMessage(leagueId: string, body: { token: Token; text: string }) {
  return send("POST", `/messages/league/${leagueId}`, body);
}

// The bell of one league's chat
export function saveChatNotifications(leagueId: string, body: { token: Token; enabled: boolean }) {
  return send("PUT", `/messages/league/${leagueId}/notifications`, body);
}
