import { SPORT_ICONS } from "./config/sports";

export type SportEvent = {
  _id: string;
  sport: keyof typeof SPORT_ICONS;
  competition: string;
  homeTeam?: { name: string; logo?: string };
  awayTeam?: { name: string; logo?: string };
  participants?: { name: string }[];
  startsAt: string;
  lockAt: string;
  ouLine?: number;
  status: "scheduled" | "live" | "finished" | "cancelled";
  result?: {
    homeScore?: number;
    awayScore?: number;
    podium?: string[];
    winner?: string;
    finalist?: string;
  };
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

export type BonusKind = "doubleur" | "assurance" | "bouclier";

// The bonus put on one prediction in one league (one at most: bonuses don't stack)
export type Bonus = {
  doubleur?: boolean;
  assurance?: boolean;
  bouclier?: boolean;
};

export type Prediction = {
  _id: string;
  event: string;
  payload: PredictionPayload;
  // Raw points, without any bonus — the bonuses count per league
  points: number | null;
};

// The 3 tabs of a league screen
export type LeagueTab = "grid" | "ranking" | "chat";

// One line of the league chat — user is null for system logs (sabotage, bouclier)
export type ChatMessage = {
  _id: string;
  type: "chat" | "system";
  text: string;
  user: { _id: string; username: string; avatar?: string | null } | null;
  createdAt: string;
};
