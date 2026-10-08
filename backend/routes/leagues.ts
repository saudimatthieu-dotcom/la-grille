import express from "express";
import mongoose from "mongoose";
import uid2 from "uid2";

import Event from "../models/events";
import Grid from "../models/grids";
import League from "../models/leagues";
import Message from "../models/messages";
import Prediction from "../models/predictions";
import User from "../models/users";
import { checkBody } from "../modules/checkBody";
import { getMonday, getSeason, getWeek } from "../modules/getWeek";
import { leagueEvents } from "../modules/selections";
import { FREE_LEAGUE_MAX_MEMBERS, isVip } from "../modules/vip";
import { getMonthPoints, monthKey } from "../modules/monthlyPrize";
import { findPlayerLeague } from "../modules/publicLeague";
import {
    MAX_SEASON_WEEKS,
    MIN_SEASON_WEEKS,
    seasonEndsAt,
    seasonLength,
    seasonState,
    seasonWeekIndex,
} from "../modules/seasons";
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

        // 10 weeks — a VIP creator chooses 4 to 30
        const seasonWeeks = seasonLength(req.body.seasonWeeks, isVip(user));

        if (seasonWeeks === null) {
            res.json({ result: false, error: `A season lasts ${MIN_SEASON_WEEKS} to ${MAX_SEASON_WEEKS} weeks` });
            return;
        }

        const newLeague = new League({
            name: req.body.name,
            code: uid2(6).toUpperCase(),
            gridType: req.body.gridType,
            owner: user._id,
            members: [{ user: user._id }],
            // The first season starts this week
            seasonWeeks,
            seasonStartsAt: getMonday(new Date()),
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

    // "month": the public league's month ranking (its monthly prize) — "season": the league's season (the public
    // league's never resets: it's the general ranking)
    const scope = req.query.scope === "week" || req.query.scope === "month" ? req.query.scope : "season";

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
                    // This calendar month's points: only the public league has a month ranking
                    scope === "month" && league.isPublic
                        ? getMonthPoints(league, monthKey(now)).then((data) => data.pointsByUser)
                        : Promise.resolve(null),
                ]).then(([weekPoints, grid, previous, next, monthPoints]) => {
                    let points = scope === "week" ? weekPoints : getSeasonPoints(league);

                    if (monthPoints) {
                        points = monthPoints;
                    }

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
                        // The palmarès: the podiums of past seasons, or the public league's monthly winners
                        pastSeasons: league.pastSeasons,
                        monthlyWinners: league.monthlyWinners,
                    });
                });
            });
        });
    });
});

// What the season banner shows: which season, which week, when it ends, and whether I can start the next one
function seasonInfo(league: InstanceType<typeof League>, user: InstanceType<typeof User>) {
    const isOwner = Boolean(league.owner?.equals(user._id));

    return {
        isPublic: Boolean(league.isPublic),
        number: league.seasonNumber,
        weeks: league.seasonWeeks,
        weekIndex: seasonWeekIndex(league),
        endsAt: seasonEndsAt(league),
        state: seasonState(league),
        isOwner,
        // A VIP creator chooses the next season's length
        canChooseLength: isOwner && isVip(user),
        lastPodium: league.pastSeasons[league.pastSeasons.length - 1]?.podium ?? [],
    };
}

// GET /leagues/:leagueId/season/:token — the league's season (private leagues; null for the public league)
router.get("/:leagueId/season/:token", (req, res) => {
    if (!mongoose.isValidObjectId(req.params.leagueId)) {
        res.json({ result: false, error: "Invalid league id" });
        return;
    }

    User.findOne({ token: req.params.token }).then((user) => {
        if (!user) {
            res.json({ result: false, error: "User not found" });
            return;
        }

        findPlayerLeague(req.params.leagueId, user._id).then((league) => {
            if (!league) {
                res.json({ result: false, error: "Not a member of this league" });
                return;
            }

            res.json({ result: true, season: league.isPublic ? null : seasonInfo(league, user) });
        });
    });
});

// POST /leagues/:leagueId/restart — the creator starts the next season once the last one is closed
router.post("/:leagueId/restart", (req, res) => {
    if (!checkBody(req.body, ["token"]) || !mongoose.isValidObjectId(req.params.leagueId)) {
        res.json({ result: false, error: "Missing or empty fields" });
        return;
    }

    User.findOne({ token: req.body.token }).then((user) => {
        if (!user) {
            res.json({ result: false, error: "User not found" });
            return;
        }

        League.findById(req.params.leagueId).then((league) => {
            if (!league || league.isPublic) {
                res.json({ result: false, error: "League not found" });
                return;
            }

            if (!league.owner?.equals(user._id)) {
                res.json({ result: false, error: "Only the league's creator can start the next season" });
                return;
            }

            if (league.seasonStatus !== "finished") {
                res.json({ result: false, error: "The season isn't over yet" });
                return;
            }

            const seasonWeeks = seasonLength(req.body.seasonWeeks, isVip(user));

            if (seasonWeeks === null) {
                res.json({ result: false, error: `A season lasts ${MIN_SEASON_WEEKS} to ${MAX_SEASON_WEEKS} weeks` });
                return;
            }

            // Starts this week: everyone at 0 (the points were reset when the last season closed)
            league.seasonNumber = (league.seasonNumber ?? 1) + 1;
            league.seasonWeeks = seasonWeeks;
            league.seasonStartsAt = getMonday(new Date());
            league.seasonStatus = "running";

            const endsAt = seasonEndsAt(league) as Date;
            const lastDay = new Date(endsAt.getTime() - 1).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });

            league.save().then((savedLeague) => {
                new Message({
                    league: savedLeague._id,
                    type: "system",
                    text: `🔄 La saison ${savedLeague.seasonNumber} est lancée : ${seasonWeeks} semaines, jusqu'au ${lastDay}. Tout le monde repart de 0 !`,
                    meta: { kind: "season", number: savedLeague.seasonNumber },
                }).save();

                res.json({ result: true, season: seasonInfo(savedLeague, user) });
            });
        });
    });
});

export default router;
