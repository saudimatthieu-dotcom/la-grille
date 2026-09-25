import "dotenv/config";
import "./models/connection";

import express from "express";
import cookieParser from "cookie-parser";
import logger from "morgan";
import cors from "cors";

import usersRouter from "./routes/users";
import leaguesRouter from "./routes/leagues";

const app = express();

app.use(cors());
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use("/users", usersRouter);
app.use("/leagues", leaguesRouter);

export default app;
