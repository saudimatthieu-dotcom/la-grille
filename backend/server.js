import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import userRoutes from "./routes/users.js";
import leagueRoutes from "./routes/leagues.js";
import gridRoutes from "./routes/grids.js";
import predictionRoutes from "./routes/predictions.js";
import tacticRoutes from "./routes/tactics.js";
import messageRoutes from "./routes/messages.js";
import adminRoutes from "./routes/admin.js";

dotenv.config();
connectDB();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use("/users", userRoutes);
app.use("/leagues", leagueRoutes);
app.use("/grids", gridRoutes);
app.use("/predictions", predictionRoutes);
app.use("/tactics", tacticRoutes);
app.use("/messages", messageRoutes);
app.use("/admin", adminRoutes);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});             