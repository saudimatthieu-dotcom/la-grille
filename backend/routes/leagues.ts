import express from "express";
import mongoose from "mongoose";
import uid2 from "uid2";

import Event from "../models/events";
import Grid from "../models/grids";
import League from "../models/leagues";
import Prediction from "../models/predictions";
import User from "../models/users";
import { checkBody } from "../modules/checkBody";
import { getSeason, getWeek } from "../modules/getWeek";
import { leagueEvents } from "../modules/selections";
import { FREE_LEAGUE_MAX_MEMBERS, isVip } from "../modules/vip";
import { buildRanking } from "../modules/ranking";
import { getSeasonPoints, getWeekPoints } from "../modules/leaguePoints";

const router = express.Router();

// The closest week before (or after) this one that has a grid — null when there is none
function findOtherWeek(season: number, week: number, direction: "previous" | "next") {
    const filter =
        direction === "previous"
            ? { $or: [{ season, week: { $lt: week } }, { season: { $lt: season } }] }
            : { $or: [{ season, week: { $gt: week } }, { season: { $gt: season } }] };
    const order = direction === "previous" ? -1 : 1;

    return Grid.findOne(filter)
        .sort({ season: order, week: order })
        .then((grid) => (grid ? { season: grid.season, week: grid.week } : null));
}

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

        // Sur-mesure: the owner picks the matches every week — a VIP feature
        if (req.body.gridType === "surmesure" && !isVip(user)) {
            res.json({ result: false, error: "The sur-mesure grid is for VIP members" });
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

            // Full: a private league whose owner isn't VIP stops at FREE_LEAGUE_MAX_MEMBERS players
            User.findById(league.owner).then((owner) => {
                const isFull =
                    !league.isPublic && league.members.length >= FREE_LEAGUE_MAX_MEMBERS && !(owner && isVip(owner));

                if (isFull) {
                    res.json({ result: false, error: "This league is full" });
                    return;
                }

                league.members.push({ user: user._id });

                league.save().then((updatedLeague) => {
                    res.json({ result: true, league: updatedLeague });
                });
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
            // This week's grid (read only: it is created when a player opens it), with each event's sport and
            // competition: a league only counts the matches of its grid type
            Grid.findOne({ season: getSeason(new Date()), week: getWeek(new Date()) })
                .populate<{ events: InstanceType<typeof Event>[] }>("events", "sport competition")
                .then((grid) => {
                Promise.all([
                    // How many matches I predicted in each league: every league has its own predictions
                    Promise.all(
                        leagues.map((league) =>
                            grid
                                ? Prediction.countDocuments({ user: user._id, grid: grid._id, league: league._id })
                                : Promise.resolve(0)
                        )
                    ),
                    Promise.all(leagues.map((league) => getWeekPoints(league))),
                    // The matches each league plays this week: picked by hand, or the ones of its type
                    Promise.all(leagues.map((league) => (grid ? leagueEvents(league, grid) : Promise.resolve(null)))),
                ]).then(([filledByLeague, weekPointsByLeague, eventsByLeague]) => {
                    // Adds my rank, my points and my progress to each league (home screen + Mes Ligues)
                    const myLeagues = leagues.map((league, index) => {
                        const me = league.members.find((member) => member.user?.equals(user._id));
                        const myPoints = me?.points ?? 0;
                        const myRank = league.members.filter((member) => member.points > myPoints).length + 1;

                        return {
                            ...league.toObject(),
                            myPoints,
                            myRank,
                            myWeekPoints: weekPointsByLeague[index][String(user._id)] ?? 0,
                            filled: filledByLeague[index],
                            total: eventsByLeague[index]?.length ?? null,
                        };
                    });

                    res.json({ result: true, leagues: myLeagues });
                });
            });
        });
    });
});

// GET /leagues/:leagueId/ranking/:token?scope=week|season&season=2026&week=39 — league ranking (screen 8)
router.get("/:leagueId/ranking/:token", (req, res) => {
    if (!mongoose.isValidObjectId(req.params.leagueId)) {
        res.json({ result: false, error: "Invalid league id" });
        return;
    }

    const scope = req.query.scope === "week" ? "week" : "season";

    // The week to rank: this week by default, or an older one with ?season=…&week=… (Semaine tab only)
    const now = new Date();
    const thisSeason = getSeason(now);
    const thisWeek = getWeek(now);
    const season = (scope === "week" && Number(req.query.season)) || thisSeason;
    const week = (scope === "week" && Number(req.query.week)) || thisWeek;

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

                Promise.all([
                    getWeekPoints(league, season, week),
                    Grid.findOne({ season, week }),
                    findOtherWeek(season, week, "previous"),
                    findOtherWeek(season, week, "next"),
                ]).then(([weekPoints, grid, previous, next]) => {
                    const points = scope === "season" ? getSeasonPoints(league) : weekPoints;

                    // weekPoints on every row: the "+3 this week" shown next to the season total
                    const ranking = buildRanking(members, points).map((row) => ({
                        ...row,
                        weekPoints: weekPoints[row.userId] ?? 0,
                    }));

                    res.json({
                        result: true,
                        scope,
                        ranking,
                        // The public league has no Chat tab and no sabotage
                        isPublic: Boolean(league.isPublic),
                        // The Semaine tab's arrows: which week this is, its grid (to open my results) and its neighbours
                        season,
                        week,
                        isThisWeek: season === thisSeason && week === thisWeek,
                        gridId: grid?._id ?? null,
                        previous,
                        next,
                    });
                });
            });
        });
    });
});

export default router;
