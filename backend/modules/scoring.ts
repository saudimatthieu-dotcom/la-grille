// Official scoring rules — dossier de cadrage, section 3 "Règles de Pronostics & Barème Officiel"

// What the player predicted (same shapes as the frontend PredictionPayload)
export type Payload = {
  homeScore?: number;
  awayScore?: number;
  winner?: string;
  overUnder?: "over" | "under";
  podium?: string[];
  finalist?: string;
};

// The real outcome of the event
export type Result = {
  homeScore?: number;
  awayScore?: number;
  podium?: string[];
  winner?: string;
  finalist?: string;
};

// "home", "away" or "draw" from a score
function outcome(homeScore: number, awayScore: number) {
  if (homeScore > awayScore) {
    return "home";
  }
  if (homeScore < awayScore) {
    return "away";
  }
  return "draw";
}

// Football — exact score: 3 pts, right winner or draw: 1 pt (not cumulative)
export function scoreFootball(payload: Payload, result: Result) {
  if (
    payload.homeScore === undefined ||
    payload.awayScore === undefined ||
    result.homeScore === undefined ||
    result.awayScore === undefined
  ) {
    return 0;
  }

  if (payload.homeScore === result.homeScore && payload.awayScore === result.awayScore) {
    return 3;
  }

  if (outcome(payload.homeScore, payload.awayScore) === outcome(result.homeScore, result.awayScore)) {
    return 1;
  }

  return 0;
}

// Basket & rugby — right winner: 1 pt, right over/under: 1 pt (max 2)
export function scoreOverUnder(payload: Payload, result: Result, ouLine: number) {
  if (result.homeScore === undefined || result.awayScore === undefined) {
    return 0;
  }

  let points = 0;

  if (payload.winner === outcome(result.homeScore, result.awayScore)) {
    points += 1;
  }

  const total = result.homeScore + result.awayScore;
  const realOverUnder = total > ouLine ? "over" : "under";

  if (payload.overUnder === realOverUnder) {
    points += 1;
  }

  return points;
}

// F1 & cycling — right place: 2 pts, on the podium but wrong place: 1 pt (max 6)
export function scorePodium(payload: Payload, result: Result) {
  if (!payload.podium || !result.podium) {
    return 0;
  }

  const realPodium = result.podium;
  let points = 0;

  payload.podium.forEach((name, index) => {
    if (realPodium[index] === name) {
      points += 2;
    } else if (realPodium.includes(name)) {
      points += 1;
    }
  });

  return points;
}

// Tennis — each predicted player who reached the final: 1 pt, exact winner: +1 pt (max 3)
export function scoreTennis(payload: Payload, result: Result) {
  const finalists = [result.winner, result.finalist];
  let points = 0;

  if (payload.winner && finalists.includes(payload.winner)) {
    points += 1;
  }

  if (payload.finalist && finalists.includes(payload.finalist)) {
    points += 1;
  }

  if (payload.winner && payload.winner === result.winner) {
    points += 1;
  }

  return points;
}

// Picks the right rule for the sport
export function scorePrediction(sport: string, payload: Payload, result: Result, ouLine = 0) {
  if (sport === "football") {
    return scoreFootball(payload, result);
  }
  if (sport === "basket" || sport === "rugby") {
    return scoreOverUnder(payload, result, ouLine);
  }
  if (sport === "f1" || sport === "cyclisme") {
    return scorePodium(payload, result);
  }
  if (sport === "tennis") {
    return scoreTennis(payload, result);
  }
  return 0;
}

// Best possible score per sport — the Assurance gives this
export function maxPoints(sport: string) {
  if (sport === "football" || sport === "tennis") {
    return 3;
  }
  if (sport === "basket" || sport === "rugby") {
    return 2;
  }
  if (sport === "f1" || sport === "cyclisme") {
    return 6;
  }
  return 0;
}

export type Bonus = {
  doubleur?: boolean;
  assurance?: boolean;
  bouclier?: boolean;
};

// Applies the bonuses to the raw points of one prediction — the real points, the same in every ranking
export function applyTactics(points: number, sport: string, bonus: Bonus) {
  let finalPoints = points;

  if (bonus.assurance && finalPoints > 0) {
    finalPoints = maxPoints(sport);
  }

  if (bonus.doubleur) {
    finalPoints = finalPoints * 2;
  }

  return finalPoints;
}

// What a prediction is worth in one league: a sabotage there sets it to 0, unless the Bouclier blocks it
export function pointsInLeague(points: number, bonus: Bonus, isSabotagedHere: boolean) {
  if (isSabotagedHere && !bonus.bouclier) {
    return 0;
  }

  return points;
}
