import Event from "../models/events";
import { THESPORTSDB_COMPETITIONS } from "../config/competitions";
import { fetchEventsUntil } from "../providers/thesportsdb";
import { fetchRacesUntil } from "../providers/jolpica";

// How far ahead the import goes: a month, so the admins can prepare the next weeks' grids
export const IMPORT_DAYS = 31;

// What the admin screen shows while the import runs, and after it
export type ImportStatus = {
  running: boolean;
  startedAt: Date | null;
  finishedAt: Date | null;
  // The competition being fetched right now
  current: string | null;
  // Competitions finished (fetched and saved, or failed) out of the total
  done: number;
  total: number;
  // Matches saved so far
  imported: number;
  // The competitions that still failed after the retries: nobody should find out three days later
  failed: string[];
};

const idle: ImportStatus = {
  running: false,
  startedAt: null,
  finishedAt: null,
  current: null,
  done: 0,
  total: 0,
  imported: 0,
  failed: [],
};

// One import at a time, kept in memory: a second one would double the calls and go over the API's limit.
// A restart of the server forgets it — the next import simply starts again
let status: ImportStatus = { ...idle };

export function getImportStatus(): ImportStatus {
  return { ...status, failed: [...status.failed] };
}

// upsert on { provider, externalId }: a new match is created, a known one is updated (e.g. rescheduled)
function saveEvents(events: object[]) {
  const saves = events.map((event) => {
    const { provider, externalId } = event as { provider: string; externalId: string };
    return Event.updateOne({ provider, externalId }, event, { upsert: true });
  });

  return Promise.all(saves);
}

// The competitions one after the other (each one already spaces out its own calls), then F1.
// Each one is saved as soon as it is fetched: the matches show up gradually, and a crash loses little
async function importAll() {
  const until = new Date();
  until.setDate(until.getDate() + IMPORT_DAYS);

  const steps = [
    ...THESPORTSDB_COMPETITIONS.map((competition) => ({
      name: competition.competition,
      fetch: () => fetchEventsUntil(competition, until),
    })),
    { name: "Formule 1", fetch: () => fetchRacesUntil(until) },
  ];

  status.total = steps.length;

  for (const step of steps) {
    status.current = step.name;

    try {
      const events = await step.fetch();
      await saveEvents(events);
      status.imported += events.length;
    } catch (error) {
      // One competition failing (API down, unknown round…) doesn't stop the others — but it is reported
      console.log("import failed:", step.name, String(error));
      status.failed.push(step.name);
    }

    status.done++;
  }
}

// Starts the import in the background (a month of matches takes 15 minutes or more on the free key: nobody
// waits for it on one request). Gives back false when one is already running
export function startImport() {
  if (status.running) {
    return false;
  }

  status = { ...idle, running: true, startedAt: new Date() };

  importAll()
    .catch((error) => console.log("import crashed:", String(error)))
    .finally(() => {
      status.running = false;
      status.finishedAt = new Date();
      status.current = null;
    });

  return true;
}
