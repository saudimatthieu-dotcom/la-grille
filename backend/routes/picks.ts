import express from "express";
import mongoose from "mongoose";

import Event from "../models/events";
import League from "../models/leagues";
import Prediction from "../models/predictions";
import Selection from "../models/selections";
import User from "../models/users";
import { checkBody } from "../modules/checkBody";
import { ADMIN_GRID_TYPES, isInGrid } from "../modules/gridTypes";
import type { AdminGridType } from "../modules/gridTypes";
import { findWeekEvents, weekFromNow } from "../modules/selections";
import { isVip } from "../modules/vip";

const router = express.Router();

// This week and the 3 next ones can be prepared
const MAX_OFFSET = 3;

type EventDoc = InstanceType<typeof Event>;

// Who picks for what: an admin for a grid type, or the VIP owner for their sur-mesure league
type PickerContext =
  | { error: string }
  | {
      // The selection's key, without the week
      owner: { gridType: AdminGridType; league: null } | { gridType: null; league: mongoose.Types.ObjectId };
      // Which of the week's matches can be picked
      canPick: (event: EventDoc) => boolean;
      // The leagues that play this selection: a match they already predicted can't be taken out
      leagueIds: mongoose.Types.ObjectId[];
      userId: mongoose.Types.ObjectId;
    };

function loadPicker(token: unknown, gridType: unknown, leagueId: unknown) {
  return User.findOne({ token: String(token) }).then<PickerContext>((user) => {
    if (!user) {
      return { error: "User not found" };
    }

    if (gridType) {
      if (!user.isAdmin) {
        return { error: "Forbidden" };
      }

      const type = String(gridType) as AdminGridType;

      if (!ADMIN_GRID_TYPES.includes(type)) {
        return { error: "Invalid grid type" };
      }

      // Leagues without a type play the officielle grid
      const types: (AdminGridType | null)[] = type === "officielle" ? ["officielle", null] : [type];

      return League.find({ gridType: { $in: types } }, "_id").then((leagues) => ({
        owner: { gridType: type, league: null as null },
        // An admin picks among the matches of the type (exotique: no foot, no rugby, no NBA…)
        canPick: (event: EventDoc) => isInGrid(type, event),
        leagueIds: leagues.map((league) => league._id),
        userId: user._id,
      }));
    }

    if (!leagueId || !mongoose.isValidObjectId(leagueId)) {
      return { error: "Invalid league id" };
    }

    return League.findById(leagueId).then<PickerContext>((league) => {
      if (!league || league.gridType !== "surmesure") {
        return { error: "League not found" };
      }

      if (!league.owner?.equals(user._id)) {
        return { error: "Only the league's owner picks its matches" };
      }

      if (!isVip(user)) {
        return { error: "The sur-mesure grid is for VIP members" };
      }

      return {
        owner: { gridType: null as null, league: league._id },
        // Sur-mesure: any match of the week
        canPick: () => true,
        leagueIds: [league._id],
        userId: user._id,
      };
    });
  });
}

// The week's matches that can be picked, and which ones are
function loadWeek(context: Exclude<PickerContext, { error: string }>, offset: number) {
  const { season, week, start, end } = weekFromNow(offset);

  return Promise.all([findWeekEvents(start, end), Selection.findOne({ season, week, ...context.owner })]).then(
    ([weekEvents, selection]) => {
      const events = weekEvents.filter(context.canPick);
      const picked = (selection?.events ?? []).map(String);

      return { season, week, events, picked };
    }
  );
}

// What the picks screen shows for one week
function weekResponse(data: Awaited<ReturnType<typeof loadWeek>>, offset: number) {
  const now = new Date();

  return {
    result: true,
    season: data.season,
    week: data.week,
    offset,
    maxOffset: MAX_OFFSET,
    events: data.events.map((event) => ({
      ...event.toObject(),
      // Already locked: can't be added any more
      isLocked: !event.lockAt || event.lockAt <= now,
    })),
    // Nothing picked = no match in the grid that week
    picked: data.picked,
  };
}

function readOffset(value: unknown) {
  const offset = Number(value ?? 0);
  return Number.isInteger(offset) && offset >= 0 && offset <= MAX_OFFSET ? offset : null;
}

// GET /picks/:token?gridType=…|leagueId=…&offset=0 — a week's matches and the ones picked (admin or sur-mesure owner)
router.get("/:token", (req, res) => {
  const offset = readOffset(req.query.offset);

  if (offset === null) {
    res.json({ result: false, error: "Invalid week" });
    return;
  }

  loadPicker(req.params.token, req.query.gridType, req.query.leagueId).then((context) => {
    if ("error" in context) {
      res.json({ result: false, error: context.error });
      return;
    }

    loadWeek(context, offset).then((data) => {
      res.json(weekResponse(data, offset));
    });
  });
});

// PUT /picks — saves the matches picked for a week (an empty list: no match that week)
router.put("/", (req, res) => {
  if (!checkBody(req.body, ["token"]) || !Array.isArray(req.body.eventIds)) {
    res.json({ result: false, error: "Missing or empty fields" });
    return;
  }

  const offset = readOffset(req.body.offset);
  const eventIds: string[] = req.body.eventIds.map(String);

  if (offset === null || !eventIds.every((id) => mongoose.isValidObjectId(id))) {
    res.json({ result: false, error: "Invalid week or id" });
    return;
  }

  loadPicker(req.body.token, req.body.gridType, req.body.leagueId).then((context) => {
    if ("error" in context) {
      res.json({ result: false, error: context.error });
      return;
    }

    loadWeek(context, offset).then((data) => {
      const now = new Date();
      const eventOf = (id: string) => data.events.find((event) => String(event._id) === id);

      if (!eventIds.every((id) => eventOf(id))) {
        res.json({ result: false, error: "This match can't be picked for this grid" });
        return;
      }

      // What the grid shows before and after: only the picked matches (nothing picked = no match)
      const shownBefore = data.picked;
      const shownAfter = eventIds;

      // A match that has started can't join the grid any more
      const added = shownAfter.filter((id) => !shownBefore.includes(id));
      const lateEvent = added.map(eventOf).find((event) => !event?.lockAt || event.lockAt <= now);

      if (lateEvent) {
        res.json({ result: false, error: "This match has already started" });
        return;
      }

      // A match players already predicted stays: taking it out would hide their prediction (and its points)
      const removed = shownBefore.filter((id) => !shownAfter.includes(id));

      Prediction.distinct("event", { event: { $in: removed }, league: { $in: context.leagueIds } }).then(
        (predictedIds: unknown[]) => {
          if (predictedIds.length > 0) {
            const names = predictedIds
              .map((id) => eventOf(String(id)))
              .map((event) => (event?.homeTeam?.name ? `${event.homeTeam.name}-${event.awayTeam?.name}` : event?.competition))
              .join(", ");

            res.json({ result: false, error: `Already predicted by players, can't be removed: ${names}` });
            return;
          }

          const key = { season: data.season, week: data.week, ...context.owner };

          // Nothing picked: the selection goes, the grid is empty
          const save =
            eventIds.length === 0
              ? Selection.deleteOne(key)
              : Selection.updateOne(
                  key,
                  { events: eventIds, updatedBy: context.userId, updatedAt: now },
                  { upsert: true }
                );

          save.then(() => {
            res.json(weekResponse({ ...data, picked: eventIds }, offset));
          });
        }
      );
    });
  });
});

export default router;
