import { buildMessages, chunk, deadTokens, NOTIFICATION_TEXTS } from "./sendPush";
import type { PushTicket } from "./sendPush";

describe("buildMessages", () => {
  it("sends one message per device", () => {
    const users = [{ pushTokens: [{ token: "ExponentPushToken[phone]" }, { token: "ExponentPushToken[tablet]" }] }];

    const messages = buildMessages(users, "newGrid", NOTIFICATION_TEXTS.newGrid);

    expect(messages.map((message) => message.to)).toEqual(["ExponentPushToken[phone]", "ExponentPushToken[tablet]"]);
    expect(messages[0]).toMatchObject({ ...NOTIFICATION_TEXTS.newGrid, channelId: "default", data: { kind: "newGrid" } });
  });

  it("skips the users who switched this notification off, only this one", () => {
    const users = [
      { pushTokens: [{ token: "ExponentPushToken[off]" }], notifications: { newGrid: false, results: true } },
      { pushTokens: [{ token: "ExponentPushToken[on]" }], notifications: { newGrid: true } },
    ];

    expect(buildMessages(users, "newGrid", NOTIFICATION_TEXTS.newGrid).map((message) => message.to)).toEqual([
      "ExponentPushToken[on]",
    ]);
    expect(buildMessages(users, "results", NOTIFICATION_TEXTS.results)).toHaveLength(2);
  });

  it("counts a missing switch as on (accounts created before the switches)", () => {
    const users = [{ pushTokens: [{ token: "ExponentPushToken[old]" }] }];

    expect(buildMessages(users, "closingSoon", NOTIFICATION_TEXTS.closingSoon)).toHaveLength(1);
  });

  it("sends nothing to users without a device", () => {
    const users = [{ pushTokens: [] }, {}, { pushTokens: [{ token: null }] }];

    expect(buildMessages(users, "results", NOTIFICATION_TEXTS.results)).toEqual([]);
  });

  it("sends chat messages whatever the Profil switches, with the league to open on tap", () => {
    const users = [
      { pushTokens: [{ token: "ExponentPushToken[a]" }], notifications: { newGrid: false, closingSoon: false, results: false } },
    ];

    const messages = buildMessages(users, "message", { title: "COPAINS", body: "Paul : salut" }, { leagueId: "42", leagueName: "COPAINS" });

    expect(messages).toHaveLength(1);
    expect(messages[0].data).toEqual({ kind: "message", leagueId: "42", leagueName: "COPAINS" });
  });
});

describe("chunk", () => {
  it("cuts into groups of the given size", () => {
    const items = Array.from({ length: 250 }, (_, i) => i);

    expect(chunk(items, 100).map((group) => group.length)).toEqual([100, 100, 50]);
    expect(chunk([], 100)).toEqual([]);
  });
});

describe("deadTokens", () => {
  const messages = buildMessages(
    [{ pushTokens: [{ token: "ExponentPushToken[a]" }, { token: "ExponentPushToken[b]" }, { token: "ExponentPushToken[c]" }] }],
    "results",
    NOTIFICATION_TEXTS.results
  );

  it("finds the tokens of uninstalled apps, by position", () => {
    const tickets: PushTicket[] = [
      { status: "ok", id: "1" },
      { status: "error", message: "not registered", details: { error: "DeviceNotRegistered" } },
      { status: "ok", id: "3" },
    ];

    expect(deadTokens(messages, tickets)).toEqual(["ExponentPushToken[b]"]);
  });

  it("keeps the tokens of other errors (they may work next time)", () => {
    const tickets: PushTicket[] = [{ status: "error", message: "too big", details: { error: "MessageTooBig" } }];

    expect(deadTokens(messages, tickets)).toEqual([]);
  });
});
