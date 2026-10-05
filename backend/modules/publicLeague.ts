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

// Puts a player in the public league — does nothing if they're already in it
export function joinPublicLeague(userId: mongoose.Types.ObjectId) {
    return getPublicLeague().then((league) => {
        if (!league) {
            return null;
        }

        // $ne: only pushed when the player isn't a member yet ($addToSet wouldn't spot it: each joinedAt differs)
        return League.updateOne(
            { _id: league._id, "members.user": { $ne: userId } },
            { $push: { members: { user: userId } } }
        );
    });
}