import "dotenv/config";
import "./models/connection";

import express from "express";
import cookieParser from "cookie-parser";
import logger from "morgan";
import cors from "cors";

import usersRouter from "./routes/users";
import profileRouter from "./routes/profile";
import leaguesRouter from "./routes/leagues";
import rankingsRouter from "./routes/rankings";
import seasonsRouter from "./routes/seasons";
import gridsRouter from "./routes/grids";
import adminRouter from "./routes/admin";
import adminPlayersRouter from "./routes/adminPlayers";
import predictionsRouter from "./routes/predictions";
import resultsRouter from "./routes/results";
import tacticsRouter from "./routes/tactics";
import messagesRouter from "./routes/messages";
import picksRouter from "./routes/picks";
import adsRouter from "./routes/ads";
import legalRouter from "./routes/legal";

const app = express();

app.use(cors());
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Health check: lets the host (and you) see that the server is up
app.get("/", (req, res) => {
  res.json({ result: true, name: "La Grille API" });
});

// Several routers can share a path: each file holds one part of it
app.use("/users", usersRouter);
app.use("/users", profileRouter);
app.use("/leagues", leaguesRouter);
app.use("/leagues", rankingsRouter);
app.use("/leagues", seasonsRouter);
app.use("/grids", gridsRouter);
app.use("/predictions", predictionsRouter);
app.use("/predictions", resultsRouter);
app.use("/admin", adminRouter);
app.use("/admin", adminPlayersRouter);
app.use("/tactics", tacticsRouter);
app.use("/messages", messagesRouter);
app.use("/picks", picksRouter);
app.use("/ads", adsRouter);
app.use("/legal", legalRouter);

export default app;
