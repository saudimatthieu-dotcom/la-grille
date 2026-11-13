import request from "supertest";

import app from "../app";

// The app opens its MongoDB connection when it is imported: not here, these tests need no database
jest.mock("../models/connection", () => ({}));

// What the API answers before it ever touches the database: the health check, the legal pages and the checks on what is sent
describe("API, without a database", () => {
  it("answers the health check", async () => {
    const response = await request(app).get("/");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ result: true, name: "La Grille API" });
  });

  it("serves the legal pages as HTML", async () => {
    for (const page of ["cgu", "confidentialite", "delete-account"]) {
      const response = await request(app).get(`/legal/${page}`);

      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toContain("text/html");
    }
  });

  it("explains in the CGU how to report a message", async () => {
    const response = await request(app).get("/legal/cgu");

    expect(response.text).toContain("signaler");
  });

  describe("POST /messages/report/:messageId", () => {
    const messageId = "6af6d43ab44d982bd6af71d1";

    it("refuses a report without a token or a reason", async () => {
      const response = await request(app).post(`/messages/report/${messageId}`).send({});

      expect(response.body).toEqual({ result: false, error: "Missing or empty fields" });
    });

    it("refuses a message id that is not an id", async () => {
      const response = await request(app).post("/messages/report/abc").send({ token: "t", reason: "spam" });

      expect(response.body).toEqual({ result: false, error: "Invalid message id" });
    });

    it("refuses a reason that is not in the list", async () => {
      const response = await request(app).post(`/messages/report/${messageId}`).send({ token: "t", reason: "nope" });

      expect(response.body).toEqual({ result: false, error: "Invalid reason" });
    });
  });

  describe("admin routes", () => {
    it("refuses the cron routes without the secret", async () => {
      for (const path of ["/admin/sync-events", "/admin/sync-results", "/admin/score", "/admin/notify"]) {
        const response = await request(app).post(path).send({});

        expect(response.body).toEqual({ result: false, error: "Forbidden" });
      }
    });

    it("refuses a report review without an action", async () => {
      const response = await request(app).put("/admin/reports/6af6d43ab44d982bd6af71d1").send({ token: "t" });

      expect(response.body).toEqual({ result: false, error: "Missing or empty fields" });
    });
  });

  describe("POST /users/signup", () => {
    it("refuses a sign-up that did not accept the terms", async () => {
      const response = await request(app)
        .post("/users/signup")
        .send({ username: "someone", email: "someone@example.com", password: "a-long-enough-password" });

      expect(response.body.result).toBe(false);
    });
  });
});
