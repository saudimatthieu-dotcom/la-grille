import express from "express";
import uid2 from "uid2";

import League from "../models/leagues";
import User from "../models/users";
import { checkBody } from "../modules/checkBody";

const router = express.Router();

// POST /leagues — create
router.post("/", (req, res) => {
    if (!checkBody(req.body, ["token", "name", "gridType"])) {
        res.json({ result: false, error: "fields missing or empty" });
        return;
    }

    const gridTypes = ["officielle", "classique", "exotique", "surmesure"];

    if (!gridTypes.includes(req.body.gridType)) {
        res.json({ result: false, error: "Type de grille invalide" });
        return;
    }

    User.findOne({ token: req.body.token }).then((user) => {
        if (!user) {
            res.json({ result: false, error: "user not found" });
            return;
        }

        const newLeague = new League({
            name: req.body.name,
            code: uid2(6).toUpperCase(),
            gridType: req.body.gridType,
            owner: user._id,
            members: [{ user: user._id }],
        });

        newLeague.save().then((newDoc) => {
            res.json({ result: true, league: newDoc });
        });
    });
});

export default router;
