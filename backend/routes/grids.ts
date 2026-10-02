import express from "express";

import User from "../models/users";
import { getCurrentGrid } from "../modules/currentGrid";

const router = express.Router();

// GET /grids/current/:token — this week's grid, the same for every player (created on first visit)
router.get("/current/:token", (req, res) => {
  User.findOne({ token: req.params.token }).then((user) => {
    if (!user) {
      res.json({ result: false, error: "User not found" });
      return;
    }

    getCurrentGrid().then((grid) => {
      if (!grid) {
        res.json({ result: false, error: "No upcoming events" });
        return;
      }

      res.json({ result: true, grid });
    });
  });
});

export default router;
