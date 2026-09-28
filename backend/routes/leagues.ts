import express from "express";
import mongoose from "mongoose";
import uid2 from "uid2";

import Grid from "../models/grids";
import League from "../models/leagues";
import Prediction from "../models/predictions";
import User from "../models/users";
import { checkBody } from "../modules/checkBody";
import { getWeek } from "../modules/getWeek";
import { buildRanking } from "../modules/ranking";

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
            // Adds my season points and rank to each league (for the home screen)
            const myLeagues = leagues.map((league) => {
                const me = league.members.find((member) => member.user?.equals(user._id));
                const myPoints = me?.points ?? 0;
                const myRank = league.members.filter((member) => member.points > myPoints).length + 1;

                return { ...league.toObject(), myPoints, myRank };
            });

            res.json({ result: true, leagues: myLeagues });
        });
    });
});

// GET /leagues/:leagueId/ranking/:token?scope=week|season — league ranking (screen 8)
router.get("/:leagueId/ranking/:token", (req, res) => {
    if (!mongoose.isValidObjectId(req.params.leagueId)) {
        res.json({ result: false, error: "Invalid league id" });
        return;
    }

    const scope = req.query.scope === "week" ? "week" : "season";

    User.findOne({ token: req.params.token }).then((user) => {
        if (!user) {
            res.json({ result: false, error: "User not found" });
            return;
        }

        League.findById(req.params.leagueId).then((league) => {
            if (!league) {
                res.json({ result: false, error: "League not found" });
                return;
            }

            const isMember = league.members.some((member) => member.user?.equals(user._id));

            if (!isMember) {
                res.json({ result: false, error: "Not a member of this league" });
                return;
            }

            const memberIds = league.members.map((member) => member.user);

            User.find({ _id: { $in: memberIds } }).then((users) => {
                const members = users.map((member) => ({
                    userId: String(member._id),
                    username: member.username,
                    avatar: member.avatar,
                }));

                const sendRanking = (pointsByUser: Record<string, number>) => {
                    res.json({ result: true, scope, ranking: buildRanking(members, pointsByUser) });
                };

                if (scope === "season") {
                    const pointsByUser: Record<string, number> = {};
                    league.members.forEach((member) => {
                        pointsByUser[String(member.user)] = member.points;
                    });
                    sendRanking(pointsByUser);
                    return;
                }

                Grid.findOne({ league: league._id, season: new Date().getFullYear(), week: getWeek(new Date()) }).then((grid) => {
                    if (!grid) {
                        sendRanking({});
                        return;
                    }

                    Prediction.find({ grid: grid._id }).then((predictions) => {
                        const pointsByUser: Record<string, number> = {};
                        predictions.forEach((prediction) => {
                            const key = String(prediction.user);
                            pointsByUser[key] = (pointsByUser[key] ?? 0) + (prediction.points ?? 0);
                        });
                        sendRanking(pointsByUser);
                    });
                });
            });
        });
    });
});

export default router;
