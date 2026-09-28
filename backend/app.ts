import "dotenv/config";
import "./models/connection";

import express from "express";
import cookieParser from "cookie-parser";
import logger from "morgan";
import cors from "cors";

import usersRouter from "./routes/users";
import leaguesRouter from "./routes/leagues";
import gridsRouter from "./routes/grids";
import adminRouter from "./routes/admin";
import predictionsRouter from "./routes/predictions";
import tacticsRouter from "./routes/tactics";
import messagesRouter from "./routes/messages";

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

app.use("/users", usersRouter);
app.use("/leagues", leaguesRouter);
app.use("/grids", gridsRouter);
app.use("/predictions", predictionsRouter);
app.use("/admin", adminRouter);
app.use("/tactics", tacticsRouter);
app.use("/messages", messagesRouter);

export default app;
