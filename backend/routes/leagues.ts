import express from "express";
import uid2 from "uid2";

import League from "../models/leagues";
import User from "../models/users";
import { checkBody } from "../modules/checkBody";

const router = express.Router();

// POST /leagues — create
router.post("/", (req, res) => {
    if (!checkBody(req.body, ["token", "name", "gridType"])) {
        res.json({ result: false, error: "Missing or empty fields" });
        return;
    }

    const gridTypes = ["officielle", "classique", "exotique", "surmesure"];

    if (!gridTypes.includes(req.body.gridType)) {
        res.json({ result: false, error: "Invalid grid type" });
        return;
    }

    User.findOne({ token: req.body.token }).then((user) => {
        if (!user) {
            res.json({ result: false, error: "User not found" });
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

// POST /leagues/join — join
router.post("/join", (req, res) => {
    if (!checkBody(req.body, ["token", "code"])) {
        res.json({ result: false, error: "Missing or empty fields" });
        return;
    }

    User.findOne({ token: req.body.token }).then((user) => {
        if (!user) {
            res.json({ result: false, error: "User not found" });
            return;
        }

        League.findOne({ code: req.body.code.toUpperCase() }).then((league) => {
            if (!league) {
                res.json({ result: false, error: "Invalid code" });
                return;
            }

            const isMember = league.members.some((member) => member.user?.equals(user._id));

            if (isMember) {
                res.json({ result: false, error: "Already a member of this league" });
                return;
            }

            league.members.push({ user: user._id });

            league.save().then((updatedLeague) => {
                res.json({ result: true, league: updatedLeague });
            });
        });
    });
});

// GET /leagues/user/:token — my leagues
router.get("/user/:token", (req, res) => {
    User.findOne({ token: req.params.token }).then((user) => {
        if (!user) {
            res.json({ result: false, error: "User not found" });
            return;
        }

        League.find({ "members.user": user._id }).then((leagues) => {
            res.json({ result: true, leagues });
        });
    });
});

export default router;
