import mongoose from "mongoose";
import uid2 from "uid2";

import League from "../models/leagues";

//The league open to everyone (official grid, no chat, no bonus)
export function getPublicLeague() {
    return League.findOne({ isPublic: true }).then((league) => {
        if (league) {
            return league;
        }

        const newLeague = new League ({
            name: "Ligue Publique",
            code: uid2(6).toUpperCase(),
            gridType: "officielle",
            isPublic: true,
            members: [],
        });

        // Two players at the same second: the unique index refuses the second one, which then reads the first 
        return newLeague.save().catch(() => League.findOne({ isPublic: true }));
    });
}

// Puts a player in the public league — does nothing if they're already in it. Gives back the public league
export function joinPublicLeague(userId: mongoose.Types.ObjectId) {
    return getPublicLeague().then((league) => {
        if (!league) {
            return null;
        }

        // $ne: only pushed when the player isn't a member yet ($addToSet wouldn't spot it: each joinedAt differs)
        return League.updateOne(
            { _id: league._id, "members.user": { $ne: userId } },
            { $push: { members: { user: userId } } }
        ).then(() => league);
    });
}

// The league a prediction is made in: the one asked for, or the public league (the Grille tab has no league).
// Gives back null if I'm not a member
export function findPlayerLeague(leagueId: unknown, userId: mongoose.Types.ObjectId) {
    // No league: the public one — joined here if needed (an account still logged in from before it existed)
    if (!leagueId) {
        return joinPublicLeague(userId);
    }

    return League.findById(leagueId).then((league) => {
        if (!league || !league.members.some((member) => member.user?.equals(userId))) {
            return null;
        }

        return league;
    });
}