import { SPORT_ICONS } from "./config/sports";

export type SportEvent = {
  _id: string;
  sport: keyof typeof SPORT_ICONS;
  competition: string;
  homeTeam?: { name: string };
  awayTeam?: { name: string };
  participants?: { name: string }[];
  startsAt: string;
  lockAt: string;
  ouLine?: number;
};

// What the player entered — the shape depends on the sport
export type PredictionPayload = {
  homeScore?: number;
  awayScore?: number;
  winner?: string;
  overUnder?: "over" | "under";
  podium?: string[];
  finalist?: string;
};

export type Prediction = {
  _id: string;
  event: string;
  payload: PredictionPayload;
};
