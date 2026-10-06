import { maxPoints } from "./scoring";
import type { BonusKind } from "./scoring";

// One of my scored predictions — points = the raw points, without any bonus
export type ScoredPrediction = { id: string; sport: string; points: number };

// One bonus I put on a prediction
export type UsedBonus = { kind: BonusKind; predictionId: string };

// My stats on every scored prediction, in all my leagues (screen Profil > Mes stats):
//   correct = at least 1 point (right winner, right over/under, a driver on the podium…)
//   perfect = the max of the sport (exact score, perfect podium…)
export function computeStats(predictions: ScoredPrediction[], bonuses: UsedBonus[], sabotagedIds: string[]) {
  const isCorrect = (prediction: ScoredPrediction) => prediction.points > 0;

  // One line per sport played, the most played first
  const sports = [...new Set(predictions.map((prediction) => prediction.sport))];
  const bySport = sports
    .map((sport) => {
      const ofSport = predictions.filter((prediction) => prediction.sport === sport);
      return { sport, total: ofSport.length, correct: ofSport.filter(isCorrect).length };
    })
    .sort((a, b) => b.total - a.total);

  // Did the bonus pay off? Only the bonuses on scored predictions count
  const paidOff = (bonus: UsedBonus) => {
    const prediction = predictions.find((item) => item.id === bonus.predictionId);

    if (!prediction) {
      return null;
    }
    if (bonus.kind === "doubleur") {
      // Doubled something: 0 × 2 is still 0
      return prediction.points > 0;
    }
    if (bonus.kind === "assurance") {
      // Raised a partly right prediction to the max
      return prediction.points > 0 && prediction.points < maxPoints(prediction.sport);
    }
    // Bouclier: a sabotage really hit this prediction
    return sabotagedIds.includes(bonus.predictionId);
  };

  const bonusStats = { doubleur: { used: 0, paid: 0 }, assurance: { used: 0, paid: 0 }, bouclier: { used: 0, paid: 0 } };
  bonuses.forEach((bonus) => {
    const result = paidOff(bonus);
    if (result === null) {
      return;
    }
    bonusStats[bonus.kind].used += 1;
    if (result) {
      bonusStats[bonus.kind].paid += 1;
    }
  });

  return {
    total: predictions.length,
    correct: predictions.filter(isCorrect).length,
    perfect: predictions.filter((prediction) => prediction.points > 0 && prediction.points === maxPoints(prediction.sport)).length,
    bySport,
    bonuses: bonusStats,
  };
}
