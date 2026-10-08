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

// Every Grand Prix from now to "until", with the drivers of the last race as participants
export function fetchRacesUntil(until: Date) {
  return Promise.all([getRaces("current/"), getRaces("current/last/results/")]).then(([races, lastRaces]) => {
    const now = new Date();
    const drivers = lastRaces[0]?.Results ?? [];

    return (
      races
        .map((race) => ({
          sport: "f1",
          provider: "jolpica",
          externalId: `${race.season}-${race.round}`,
          competition: race.raceName,
          participants: drivers.map((result) => ({ name: result.Driver.familyName })),
          // No start time published yet → midnight UTC, so predictions close early rather than late
          startsAt: new Date(`${race.date}T${race.time ?? "00:00:00Z"}`),
          lockAt: new Date(`${race.date}T${race.time ?? "00:00:00Z"}`),
        }))
        .filter((race) => race.startsAt >= now && race.startsAt <= until)
    );
  });
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
