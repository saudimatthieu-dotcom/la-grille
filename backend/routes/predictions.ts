import express from "express";
import mongoose from "mongoose";

import Event from "../models/events";
import Prediction from "../models/predictions";
import User from "../models/users";
import { checkBody } from "../modules/checkBody";

const router = express.Router();

// POST /predictions — create or update my prediction for one event
router.post("/", (req, res) => {
  if (!checkBody(req.body, ["token", "gridId", "eventId", "payload"])) {
    res.json({ result: false, error: "Missing or empty fields" });
    return;
  }

  if (!mongoose.isValidObjectId(req.body.gridId) || !mongoose.isValidObjectId(req.body.eventId)) {
    res.json({ result: false, error: "Invalid id" });
    return;
  }

  User.findOne({ token: req.body.token }).then((user) => {
    if (!user) {
      res.json({ result: false, error: "User not found" });
      return;
    }

    Event.findById(req.body.eventId).then((event) => {
      if (!event) {
        res.json({ result: false, error: "Event not found" });
        return;
      }

      if (!event.lockAt || event.lockAt <= new Date()) {
        res.json({ result: false, error: "Predictions are closed for this event" });
        return;
      }

      Prediction.findOneAndUpdate(
        { user: user._id, event: event._id },
        { grid: req.body.gridId, payload: req.body.payload },
        { upsert: true, returnDocument: "after" }
      ).then((prediction) => {
        res.json({ result: true, prediction });
      });
    });
  });
});

// GET /predictions/grid/:gridId/:token — my predictions for one grid
router.get("/grid/:gridId/:token", (req, res) => {
  if (!mongoose.isValidObjectId(req.params.gridId)) {
    res.json({ result: false, error: "Invalid id" });
    return;
  }

  User.findOne({ token: req.params.token }).then((user) => {
    if (!user) {
      res.json({ result: false, error: "User not found" });
      return;
    }

    Prediction.find({ user: user._id, grid: req.params.gridId }).then((predictions) => {
      res.json({ result: true, predictions });
    });
  });
});

export default router;
