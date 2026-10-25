import mongoose from "mongoose";

import { chatPushText, chatRecipients } from "./chatPush";

describe("chatRecipients", () => {
  const paul = new mongoose.Types.ObjectId();
  const thomas = new mongoose.Types.ObjectId();
  const julie = new mongoose.Types.ObjectId();

  it("notifies every member but the sender", () => {
    const members = [{ user: paul }, { user: thomas }, { user: julie }];

    expect(chatRecipients(members, paul)).toEqual([thomas, julie]);
  });

  it("skips the members who switched the league's bell off (missing = on)", () => {
    const members = [{ user: paul }, { user: thomas, chatNotifications: false }, { user: julie, chatNotifications: true }];

    expect(chatRecipients(members, paul)).toEqual([julie]);
  });

  it("notifies nobody in a league of one", () => {
    expect(chatRecipients([{ user: paul }], paul)).toEqual([]);
  });
});

describe("chatPushText", () => {
  it("puts the league in the title and the author in the body", () => {
    expect(chatPushText("COPAINS", "Paul", "t'es mort ce week-end")).toEqual({
      title: "COPAINS",
      body: "Paul : t'es mort ce week-end",
    });
  });

  it("cuts long messages to 120 characters", () => {
    const { body } = chatPushText("COPAINS", "Paul", "a".repeat(300));

    expect(body).toHaveLength(120);
    expect(body.endsWith("…")).toBe(true);
  });
});
