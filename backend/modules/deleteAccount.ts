import mongoose from "mongoose";

import AdReward from "../models/adRewards";
import League from "../models/leagues";
import Message from "../models/messages";
import Prediction from "../models/predictions";
import Selection from "../models/selections";
import Tactic from "../models/tactics";

// Deletes everything a user leaves behind in the other collections (RGPD: their data goes with their account).
// Called by DELETE /users/me before the user itself is deleted. Leagues are handled separately (members, owner, podium)
export async function deleteUserData(userId: mongoose.Types.ObjectId) {
  // 1. My predictions' ids first: the chat's bonus announcements ("⚡ X a utilisé un Doubleur…") point to them,
  //    not to me — once the predictions are gone, we couldn't find those messages anymore
  const predictionIds = await Prediction.distinct("_id", { user: userId });

  // 2. My chat messages + the system messages announcing my bonuses (they contain my username)
  await Message.deleteMany({
    $or: [{ user: userId }, { type: "system", "meta.prediction": { $in: predictionIds } }],
  });

  // 3. My bonuses and sabotages (actor), and the sabotages aimed at me (target)
  await Tactic.deleteMany({ $or: [{ actor: userId }, { target: userId }] });

  // 4. The extra doubleurs I earned with ads
  await AdReward.deleteMany({ user: userId });

  // 5. My predictions, last: step 1 needed them
  await Prediction.deleteMany({ user: userId });

  // 6. The private leagues I created: handed to the member who joined first after me, or deleted if I was alone
  const ownedLeagues = await League.find({ owner: userId, isPublic: false });

  for (const league of ownedLeagues) {
    const others = league.members
      .filter((member) => !member.user?.equals(userId))
      .sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime());

    if (others.length === 0) {
      // Nobody left to play: the league goes, with its chat and its sur-mesure match picks
      await Message.deleteMany({ league: league._id });
      await Selection.deleteMany({ league: league._id });
      await League.deleteOne({ _id: league._id });
    } else {
      league.owner = others[0].user;
      await league.save();
    }
  }

  // 7. Out of every league I'm still a member of (the public one included)
  await League.updateMany({ "members.user": userId }, { $pull: { members: { user: userId } } });

  // 8. The old podiums and monthly winners keep a copy of my username: the rows stay (the others' ranking
  //    needs them), but my name goes
  await League.updateMany(
    { "pastSeasons.podium.user": userId },
    {
      $set: {
        "pastSeasons.$[].podium.$[row].user": null,
        "pastSeasons.$[].podium.$[row].username": "Joueur supprimé",
      },
    },
    { arrayFilters: [{ "row.user": userId }] }
  );

  await League.updateMany(
    { "monthlyWinners.winners.user": userId },
    {
      $set: {
        "monthlyWinners.$[].winners.$[row].user": null,
        "monthlyWinners.$[].winners.$[row].username": "Joueur supprimé",
      },
    },
    { arrayFilters: [{ "row.user": userId }] }
  );

  // 9. The sur-mesure picks I made: they stay for the league, but no longer point to me
  await Selection.updateMany({ updatedBy: userId }, { $set: { updatedBy: null } });
}