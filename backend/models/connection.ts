import mongoose from "mongoose";

const connectionString = process.env.CONNECTION_STRING as string;

mongoose
  .connect(connectionString, { connectTimeoutMS: 2000 })
  .then(() => console.log("🍃 Database connected"))
  .catch((error) => console.error(error));
