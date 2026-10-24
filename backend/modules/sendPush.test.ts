import { buildMessages, chunk, deadTokens, NOTIFICATION_TEXTS } from "./sendPush";
import type { PushMessage, PushTicket } from "./sendPush";

describe("buildMessages", () => {
  it("sends one message per device", () => {
    const users = [{ pushTokens: [{ token: "ExponentPushToken[phone]" }, { token: "ExponentPushToken[tablet]" }] }];

    const messages = buildMessages(users, "newGrid");

    expect(messages.map((message) => message.to)).toEqual(["ExponentPushToken[phone]", "ExponentPushToken[tablet]"]);
    expect(messages[0]).toMatchObject({ ...NOTIFICATION_TEXTS.newGrid, channelId: "default", data: { kind: "newGrid" } });
  });

  it("skips the users who switched this notification off, only this one", () => {
    const users = [
      { pushTokens: [{ token: "ExponentPushToken[off]" }], notifications: { newGrid: false, results: true } },
      { pushTokens: [{ token: "ExponentPushToken[on]" }], notifications: { newGrid: true } },
    ];

    expect(buildMessages(users, "newGrid").map((message) => message.to)).toEqual(["ExponentPushToken[on]"]);
    expect(buildMessages(users, "results")).toHaveLength(2);
  });

  it("counts a missing switch as on (accounts created before the switches)", () => {
    expect(buildMessages([{ pushTokens: [{ token: "ExponentPushToken[old]" }] }], "closingSoon")).toHaveLength(1);
  });

  it("sends nothing to users without a device", () => {
    expect(buildMessages([{ pushTokens: [] }, {}, { pushTokens: [{ token: null }] }], "results")).toEqual([]);
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
    "results"
  ) as PushMessage[];

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
