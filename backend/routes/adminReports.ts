import express from "express";
import mongoose from "mongoose";

import Message from "../models/messages";
import Report from "../models/reports";
import { findAdminUser } from "../modules/adminAuth";
import { checkBody } from "../modules/checkBody";

// The chat messages reported by the players, seen by the admins — mounted on /admin (app.ts)
const router = express.Router();

// GET /admin/reports/:token — the reports still waiting, oldest first (admin screen)
router.get("/reports/:token", (req, res) => {
  findAdminUser(req.params.token).then((admin) => {
    if (!admin) {
      res.json({ result: false, error: "Forbidden" });
      return;
    }

    Report.find({ status: "open" })
      .sort({ createdAt: 1 })
      .limit(100)
      .populate<{ message: { _id: string; text: string; hidden: boolean; user: { username: string } | null } | null }>({
        path: "message",
        select: "text hidden user",
        populate: { path: "user", select: "username" },
      })
      .populate<{ reporter: { username: string } | null }>("reporter", "username")
      .populate<{ league: { name: string } | null }>("league", "name")
      .then((reports) => {
        res.json({
          result: true,
          reports: reports.map((report) => ({
            _id: report._id,
            reason: report.reason,
            createdAt: report.createdAt,
            reporter: report.reporter?.username ?? "?",
            leagueName: report.league?.name ?? "?",
            author: report.message?.user?.username ?? "?",
            text: report.message?.text ?? "",
          })),
        });
      });
  });
});

// PUT /admin/reports/:reportId — an admin handles a report: hide the message, or dismiss the report.
// Either way every open report on that message is closed with it
router.put("/reports/:reportId", (req, res) => {
  if (!checkBody(req.body, ["token", "action"]) || !["hide", "dismiss"].includes(req.body.action)) {
    res.json({ result: false, error: "Missing or empty fields" });
    return;
  }

  if (!mongoose.isValidObjectId(req.params.reportId)) {
    res.json({ result: false, error: "Invalid report id" });
    return;
  }

  findAdminUser(req.body.token).then((admin) => {
    if (!admin) {
      res.json({ result: false, error: "Forbidden" });
      return;
    }

    Report.findById(req.params.reportId).then((report) => {
      if (!report) {
        res.json({ result: false, error: "Report not found" });
        return;
      }

      const hide = req.body.action === "hide" ? Message.updateOne({ _id: report.message }, { hidden: true }) : Promise.resolve();

      hide
        .then(() => Report.updateMany({ message: report.message, status: "open" }, { status: "handled" }))
        .then(() => {
          res.json({ result: true });
        });
    });
  });
});

export default router;
