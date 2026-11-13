import { useEffect, useState } from "react";

import type { Token } from "./api";
import { loadReports, saveReport } from "./admin";

// A reported chat message, as GET /admin/reports sends it
export type Report = {
  _id: string;
  reason: string;
  createdAt: string;
  reporter: string;
  leagueName: string;
  author: string;
  text: string;
};

// The reports waiting for an admin: loaded when the screen opens, handled one by one
export function useReports(token: Token) {
  const [reports, setReports] = useState<Report[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    loadReports(token)
      .then((data) => {
        if (data.result) {
          setReports(data.reports);
        }
      })
      .catch(() => {});
  }, [token]);

  // "hide": the players no longer see the message — "dismiss": nothing wrong, the report is closed.
  // Either way the server closes every report on that message, so the list is loaded again
  const handle = (reportId: string, action: "hide" | "dismiss") => {
    setError("");

    saveReport(reportId, { token, action })
      .then((data) => {
        if (!data.result) {
          setError(data.error);
          return;
        }

        return loadReports(token).then((fresh) => {
          if (fresh.result) {
            setReports(fresh.reports);
          }
        });
      })
      .catch(() => setError("Impossible de contacter le serveur"));
  };

  return { reports, error, handle };
}
