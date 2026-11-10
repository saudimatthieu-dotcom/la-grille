import { useEffect, useState } from "react";

import type { Token } from "./api";
import { importMatches, loadImportStatus } from "./admin";

// How the month import is going, as the server keeps it (modules/importEvents.ts)
export type ImportStatus = {
  running: boolean;
  startedAt: string | null;
  finishedAt: string | null;
  // The competition being fetched right now
  current: string | null;
  done: number;
  total: number;
  imported: number;
  // The competitions that failed even after the retries
  failed: string[];
};

const POLL_MS = 5000;

// The import of the month's matches: starts it, and follows it while it runs in the background on the server
export function useImport(token: Token) {
  const [status, setStatus] = useState<ImportStatus | null>(null);
  const [error, setError] = useState("");

  // Where is the import? Asked when the screen opens (one started earlier may still run),
  // then every few seconds as long as it runs
  useEffect(() => {
    const refresh = () =>
      loadImportStatus(token)
        .then((data) => {
          if (data.result) {
            setStatus(data.status);
          }
        })
        .catch(() => {});

    if (!status) {
      refresh();
      return;
    }

    if (!status.running) {
      return;
    }

    const timer = setInterval(refresh, POLL_MS);
    return () => clearInterval(timer);
  }, [token, status]);

  // "Already running" also gives the status: the screen then just follows that import
  const start = () => {
    setError("");

    importMatches({ token })
      .then((data) => {
        if (data.status) {
          setStatus(data.status);
        } else {
          setError(data.error);
        }
      })
      .catch(() => setError("Impossible de contacter le serveur"));
  };

  return { status, error, start };
}
