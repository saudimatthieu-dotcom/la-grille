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
