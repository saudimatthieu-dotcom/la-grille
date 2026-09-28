// Jolpica — Formula 1 (https://github.com/jolpica/jolpica-f1), no key needed
// ⚠️ Data is CC BY-NC-SA 4.0: commercial use needs their permission (admin@jolpi.ca)

const BASE_URL = "https://api.jolpi.ca/ergast/f1";

type ApiRace = {
  season: string;
  round: string;
  raceName: string;
  date: string;
  time?: string;
  Results?: { position: string; Driver: { familyName: string } }[];
};

type ApiResponse = {
  MRData: { RaceTable: { Races: ApiRace[] } };
};

function getRaces(path: string) {
  return fetch(`${BASE_URL}/${path}`)
    .then((response) => response.json() as Promise<ApiResponse>)
    .then((data) => data.MRData.RaceTable.Races);
}

// The next Grand Prix, with the drivers of the last race as participants
export function fetchNextRace() {
  return Promise.all([getRaces("current/next/"), getRaces("current/last/results/")]).then(
    ([nextRaces, lastRaces]) => {
      const race = nextRaces[0];

      if (!race) {
        return null;
      }

      // No start time published yet → midnight UTC, so predictions close early rather than late
      const startsAt = new Date(`${race.date}T${race.time ?? "00:00:00Z"}`);
      const drivers = lastRaces[0]?.Results ?? [];

      return {
        sport: "f1",
        provider: "jolpica",
        externalId: `${race.season}-${race.round}`,
        competition: race.raceName,
        participants: drivers.map((result) => ({ name: result.Driver.familyName })),
        startsAt,
        lockAt: startsAt,
      };
    }
  );
}

// The real podium of a race, or null if it hasn't been run yet
export function fetchRacePodium(externalId: string) {
  const [season, round] = externalId.split("-");

  return getRaces(`${season}/${round}/results/`).then((races) => {
    const results = races[0]?.Results ?? [];

    if (results.length < 3) {
      return null;
    }

    return { podium: results.slice(0, 3).map((result) => result.Driver.familyName) };
  });
}
