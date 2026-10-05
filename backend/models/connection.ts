import mongoose from "mongoose";

import Prediction from "./predictions";

const connectionString = process.env.CONNECTION_STRING as string;

mongoose
  .connect(connectionString, { connectTimeoutMS: 2000 })
  .then(() => {
    console.log("🍃 Database connected");

    // Mongoose creates the new indexes but never deletes the old ones: syncIndexes drops the old
    // { user, event } unique index, which refused a 2nd prediction on the same match in another league
    return Prediction.syncIndexes();
  })
  .catch((error) => console.error(error));
