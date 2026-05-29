import dotenv from "dotenv";
import express from "express";
import db from "./db/db.config.js";
import mainRouter from "./src/api/main.routes.js";
import cors from "cors";
import { errorHandler } from "./src/middleware/error-handler.js";
const app = express();
// Allow requests from your frontend
app.use(
  cors({
    origin: "http://localhost:5173", // Replace with your frontend URL
  }),
);

app.use(express.json());

//

app.use("/api", mainRouter);
//final error handler middleware
app.use(errorHandler);

async function startServer() {
  try {
    const connection = await db.getConnection();
    connection.release();
    // console.log("Database connection successful");
    app.listen(3888, () => {
      console.log("Server is running on port http://localhost:3888");
    });
  } catch (error) {
    console.error("Error starting server:", error.message);
  }
}
startServer();
