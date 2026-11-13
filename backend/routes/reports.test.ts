import mongoose from "mongoose";
import request from "supertest";

import app from "../app";
import League from "../models/leagues";
import Message from "../models/messages";
import Report from "../models/reports";
import User from "../models/users";

// These tests write to a real MongoDB: they run only when CONNECTION_STRING points at a database named "…test"
// (CI starts a throwaway MongoDB; on your machine: CONNECTION_STRING=mongodb://localhost:27017/lagrille-test npm test)
const connectionString = process.env.CONNECTION_STRING ?? "";
const isTestDatabase = /test/i.test(connectionString.split("?")[0].split("/").pop() ?? "");
const describeWithDatabase = isTestDatabase ? describe : describe.skip;

describeWithDatabase("reporting a chat message", () => {
  // Everything this file creates carries this tag, so it can be removed without touching anything else
  const tag = `zz-reports-${Date.now()}`;

  let author: InstanceType<typeof User>;
  let reporter: InstanceType<typeof User>;
  let secondReporter: InstanceType<typeof User>;
  let outsider: InstanceType<typeof User>;
  let admin: InstanceType<typeof User>;
  let league: InstanceType<typeof League>;
  let chatMessage: InstanceType<typeof Message>;
  let systemMessage: InstanceType<typeof Message>;
  let otherMessage: InstanceType<typeof Message>;

  const makeUser = (name: string, isAdmin = false) =>
    User.create({
      username: `${tag}-${name}`,
      email: `${tag}-${name}@example.com`,
      password: "not-a-real-hash",
      token: `${tag}-${name}-token`,
      isAdmin,
    });

  beforeAll(async () => {
    // The connection opened by app.ts (models/connection.ts) must be ready before the first query
    await mongoose.connection.asPromise();

    [author, reporter, secondReporter, outsider, admin] = await Promise.all([
      makeUser("author"),
      makeUser("reporter"),
      makeUser("second"),
      makeUser("outsider"),
      makeUser("admin", true),
    ]);

    league = await League.create({
      name: tag,
      code: tag,
      owner: author._id,
      members: [{ user: author._id }, { user: reporter._id }, { user: secondReporter._id }],
    });

    chatMessage = await Message.create({ league: league._id, user: author._id, type: "chat", text: "bad words here" });
    otherMessage = await Message.create({ league: league._id, user: author._id, type: "chat", text: "a fine message" });
    systemMessage = await Message.create({ league: league._id, type: "system", text: "a game log" });
  });

  afterAll(async () => {
    await Report.deleteMany({ league: league?._id });
    await Message.deleteMany({ league: league?._id });
    await League.deleteOne({ _id: league?._id });
    await User.deleteMany({ username: new RegExp(`^${tag}`) });
    await mongoose.disconnect();
  });

  const report = (messageId: unknown, body: object) => request(app).post(`/messages/report/${messageId}`).send(body);

  describe("POST /messages/report/:messageId", () => {
    it("refuses a player who is not in the league", async () => {
      const response = await report(chatMessage._id, { token: outsider.token, reason: "spam" });

      expect(response.body).toEqual({ result: false, error: "Not a member of this league" });
    });

    it("refuses a report on a game log", async () => {
      const response = await report(systemMessage._id, { token: reporter.token, reason: "spam" });

      expect(response.body).toEqual({ result: false, error: "Message not found" });
    });

    it("refuses a report on your own message", async () => {
      const response = await report(chatMessage._id, { token: author.token, reason: "spam" });

      expect(response.body).toEqual({ result: false, error: "You can't report your own message" });
    });

    it("keeps one report per player, even when pressed twice", async () => {
      const first = await report(chatMessage._id, { token: reporter.token, reason: "harcelement" });
      const again = await report(chatMessage._id, { token: reporter.token, reason: "haine" });

      expect(first.body).toEqual({ result: true });
      expect(again.body).toEqual({ result: true });

      const stored = await Report.find({ message: chatMessage._id, reporter: reporter._id });

      expect(stored).toHaveLength(1);
      expect(stored[0].reason).toBe("harcelement");
      expect(stored[0].status).toBe("open");
    });
  });

  describe("the admin side", () => {
    it("shows the open reports to an admin only", async () => {
      await report(chatMessage._id, { token: secondReporter.token, reason: "spam" });
      await report(otherMessage._id, { token: reporter.token, reason: "autre" });

      const refused = await request(app).get(`/admin/reports/${reporter.token}`);
      const allowed = await request(app).get(`/admin/reports/${admin.token}`);

      expect(refused.body).toEqual({ result: false, error: "Forbidden" });
      expect(allowed.body.result).toBe(true);

      const mine = allowed.body.reports.filter((item: { leagueName: string }) => item.leagueName === tag);

      expect(mine).toHaveLength(3);
      expect(mine.map((item: { text: string }) => item.text)).toContain("bad words here");
    });

    it("refuses a review from a player who is not an admin", async () => {
      const stored = await Report.findOne({ message: chatMessage._id });
      const response = await request(app)
        .put(`/admin/reports/${stored?._id}`)
        .send({ token: reporter.token, action: "hide" });

      expect(response.body).toEqual({ result: false, error: "Forbidden" });
    });

    it("hides a message: the text is kept, the players see a notice, every report on it is closed", async () => {
      const stored = await Report.findOne({ message: chatMessage._id });
      const response = await request(app)
        .put(`/admin/reports/${stored?._id}`)
        .send({ token: admin.token, action: "hide" });

      expect(response.body).toEqual({ result: true });

      expect((await Message.findById(chatMessage._id))?.text).toBe("bad words here");
      expect((await Message.findById(chatMessage._id))?.hidden).toBe(true);
      expect(await Report.countDocuments({ message: chatMessage._id, status: "open" })).toBe(0);

      const chat = await request(app).get(`/messages/league/${league._id}/${reporter.token}`);
      const texts = chat.body.messages.map((message: { text: string }) => message.text);

      expect(texts).toContain("Message supprimé par la modération.");
      expect(texts).not.toContain("bad words here");
      expect(texts).toContain("a fine message");
    });

    it("dismisses a report: the message stays visible", async () => {
      const stored = await Report.findOne({ message: otherMessage._id });
      const response = await request(app)
        .put(`/admin/reports/${stored?._id}`)
        .send({ token: admin.token, action: "dismiss" });

      expect(response.body).toEqual({ result: true });
      expect((await Message.findById(otherMessage._id))?.hidden).toBe(false);
      expect((await Report.findById(stored?._id))?.status).toBe("handled");
    });
  });
});
