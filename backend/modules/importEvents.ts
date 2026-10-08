import Event from "../models/events";
import { THESPORTSDB_COMPETITIONS } from "../config/competitions";
import { fetchEventsUntil } from "../providers/thesportsdb";
import { fetchRacesUntil } from "../providers/jolpica";

// How far ahead the import goes: a month, so the admins can prepare the next weeks' grids
export const IMPORT_DAYS = 31;

// One import at a time: a second one would double the calls and go over the free key's limit
let isImporting = false;

// Imports every match of the next IMPORT_DAYS days (about 1 to 2 minutes: the calls are spaced out).
// Gives back how many matches were saved — or null when an import is already running
export function importUpcomingEvents() {
  if (isImporting) {
    return Promise.resolve(null);
  }

  isImporting = true;

  const until = new Date();
  until.setDate(until.getDate() + IMPORT_DAYS);

  // The competitions one after the other (each one already spaces out its own calls), then F1
  const fetchAll = THESPORTSDB_COMPETITIONS.reduce(
    (previous, competition) =>
      previous.then((collected) =>
        fetchEventsUntil(competition, until)
          .then((events) => [...collected, ...events])
          // One competition failing (API down, unknown round…) doesn't stop the others
          .catch(() => collected)
      ),
    Promise.resolve([] as object[])
  ).then((events) =>
    fetchRacesUntil(until)
      .then((races) => [...events, ...races])
      .catch(() => events)
  );

  return fetchAll
    .then((events) => {
      // upsert on { provider, externalId }: a new match is created, a known one is updated (e.g. rescheduled)
      const saves = events.map((event) => {
        const { provider, externalId } = event as { provider: string; externalId: string };
        return Event.updateOne({ provider, externalId }, event, { upsert: true });
      });

      return Promise.all(saves).then(() => events.length);
    })
    .finally(() => {
      isImporting = false;
    });
}
