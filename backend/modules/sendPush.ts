import User from "../models/users";

export type NotificationKind = "newGrid" | "closingSoon" | "results";

// What each notification says — the same sentences as the Profil switches (the client's wording)
export const NOTIFICATION_TEXTS: Record<NotificationKind, { title: string; body: string }> = {
  newGrid: { title: "Nouvelle grille", body: "Les matchs de la semaine sont choisis : à tes pronos !" },
  closingSoon: { title: "La grille va bientôt se fermer", body: "Il te reste des matchs à pronostiquer." },
  results: { title: "Les résultats sont arrivés", body: "Viens voir tes points de la semaine." },
};

// Expo's push service: it passes each message to Firebase (Android) or Apple (iOS) for us
const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
// Expo accepts at most 100 messages per request
const BATCH_SIZE = 100;

// What sendPush reads from a user (the switches can be missing on accounts created before they existed)
type Recipient = {
  pushTokens?: { token?: string | null }[] | null;
  notifications?: Partial<Record<NotificationKind, boolean | null>> | null;
};

export type PushMessage = {
  to: string;
  title: string;
  body: string;
  sound: "default";
  // The channel registerPush creates on Android (iOS ignores it)
  channelId: "default";
  // Read by the app when the notification is tapped
  data: { kind: NotificationKind };
};

// Expo's answer for one message, in the same order as the messages sent
export type PushTicket =
  | { status: "ok"; id: string }
  | { status: "error"; message: string; details?: { error?: string } };

// One message per device of every user who left this notification on (no switch saved = on, the default)
export function buildMessages(
  users: Recipient[],
  kind: NotificationKind,
  text = NOTIFICATION_TEXTS[kind]
): PushMessage[] {
  return users
    .filter((user) => user.notifications?.[kind] !== false)
    .flatMap((user) => user.pushTokens ?? [])
    .filter((device): device is { token: string } => Boolean(device.token))
    .map((device) => ({
      to: device.token,
      title: text.title,
      body: text.body,
      sound: "default",
      channelId: "default",
      data: { kind },
    }));
}

// [1..250] in groups of 100 → [100, 100, 50]
export function chunk<T>(items: T[], size: number): T[][] {
  const groups: T[][] = [];

  for (let i = 0; i < items.length; i += size) {
    groups.push(items.slice(i, i + size));
  }

  return groups;
}

// The tokens Expo says are dead (app uninstalled, notifications refused since) — they're removed from the accounts
export function deadTokens(messages: PushMessage[], tickets: PushTicket[]): string[] {
  return tickets
    .map((ticket, i) => (ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered" ? messages[i]?.to : null))
    .filter((token): token is string => Boolean(token));
}

// Sends a notification to every user matching the filter (e.g. {} for everyone, { _id: { $in: ids } })
// Answers how many messages were sent and how many dead tokens were removed
export async function sendPush(filter: Record<string, unknown>, kind: NotificationKind, text = NOTIFICATION_TEXTS[kind]) {
  const users = await User.find(filter).select("pushTokens notifications").lean();
  const messages = buildMessages(users, kind, text);
  const dead: string[] = [];

  for (const batch of chunk(messages, BATCH_SIZE)) {
    const response = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify(batch),
    });
    const json = await response.json();

    // A refused request (bad format, too many messages…) answers { errors } instead of { data }
    if (!Array.isArray(json.data)) {
      console.log("Expo push refused:", json.errors);
      continue;
    }

    dead.push(...deadTokens(batch, json.data));
  }

  if (dead.length > 0) {
    await User.updateMany({ "pushTokens.token": { $in: dead } }, { $pull: { pushTokens: { token: { $in: dead } } } });
  }

  return { sent: messages.length, removed: dead.length };
}
