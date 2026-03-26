import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { app } from "./app.js";
import connectDB from "./config/db.js";

import { startLikeWorker } from "./services/like.service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

const PORT = process.env.PORT || 8000;

// Local development server setup
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`⚙️ Server is running at port : ${PORT}`);
      startLikeWorker();
    });
  })
  .catch((err) => {
    console.log("MongoDB connection failed !!! ", err);
  });
